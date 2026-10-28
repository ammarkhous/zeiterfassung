import { getDB } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { MAX_TEMPLATE_BYTES, TemplateError, renderDocx, validateTemplate } from '@/lib/docxTemplate';
import { sampleTemplateData } from '@/lib/templateData';
import { ReportTemplateKind, StoredTemplate, TemplateMeta } from '@/types';

export const TEMPLATES_CHANGED_EVENT = 'zeiterfassung:templates-changed';

// --- encoding ---------------------------------------------------------------

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // In chunks: spreading a few hundred thousand bytes into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// --- availability (cheap, shared by every export button) -----------------------

type Availability = Record<ReportTemplateKind, boolean>;

let availability: Availability = { monthly: false, session: false };
const listeners = new Set<() => void>();

export const getTemplateAvailability = (): Availability => availability;

export const subscribeTemplateAvailability = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Only the keys are read (not the .docx content), because every session row has
// export buttons that depend on this.
export const refreshTemplateAvailability = async (): Promise<void> => {
  const db = await getDB();
  const keys = new Set(await db.getAllKeys('report_templates'));
  const next: Availability = { monthly: keys.has('monthly'), session: keys.has('session') };
  if (next.monthly === availability.monthly && next.session === availability.session) return;
  availability = next;
  listeners.forEach((listener) => listener());
};

const notifyChanged = (): void => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TEMPLATES_CHANGED_EVENT));
  refreshTemplateAvailability().catch(() => {});
};

// --- local cache ------------------------------------------------------------

export const getTemplate = async (kind: ReportTemplateKind): Promise<StoredTemplate | undefined> => {
  const db = await getDB();
  return db.get('report_templates', kind);
};

export const listTemplateMeta = async (): Promise<TemplateMeta[]> => {
  const db = await getDB();
  const all = await db.getAll('report_templates');
  return all.map(({ kind, file_name, updated_at }) => ({ kind, file_name, updated_at }));
};

// --- sync (all users) -------------------------------------------------------

// The app syncs on start and whenever the window regains focus, so the .docx
// (up to ~2.7 MB as base64) is only downloaded when its updated_at changed.
export const pullTemplates = async (): Promise<void> => {
  const { data: remote, error } = await supabase
    .from('report_templates')
    .select('kind, file_name, updated_at');
  if (error || !remote) return;

  const db = await getDB();
  const local = new Map((await db.getAll('report_templates')).map((t) => [t.kind, t]));
  let changed = false;

  for (const meta of remote as TemplateMeta[]) {
    if (local.get(meta.kind)?.updated_at === meta.updated_at) continue;
    const { data: full, error: fullError } = await supabase
      .from('report_templates')
      .select('kind, file_name, content, updated_at')
      .eq('kind', meta.kind)
      .single();
    if (fullError || !full) continue;
    await db.put('report_templates', full as StoredTemplate);
    changed = true;
  }

  for (const kind of local.keys()) {
    if (!(remote as TemplateMeta[]).some((meta) => meta.kind === kind)) {
      await db.delete('report_templates', kind);
      changed = true;
    }
  }

  if (changed) notifyChanged();
  else await refreshTemplateAvailability();
};

// --- admin: upload / remove -------------------------------------------------

const requireOnline = (): void => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new TemplateError('Dafür ist eine Internetverbindung nötig.');
  }
};

// Validates the file (whitelist of commands), renders it once with sample data so a
// broken template is refused now rather than in front of a customer, then saves it
// for everyone. Throws a TemplateError with a German message.
export const uploadTemplate = async (kind: ReportTemplateKind, file: File): Promise<TemplateMeta> => {
  requireOnline();
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new TemplateError('Bitte eine Word-Datei mit der Endung .docx wählen.');
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    throw new TemplateError(`Die Vorlage ist zu groß (maximal ${MAX_TEMPLATE_BYTES / 1024 / 1024} MB).`);
  }

  const bytes = await file.arrayBuffer();
  await validateTemplate(bytes, kind);
  await renderDocx(bytes, sampleTemplateData(kind), { rejectNullish: true });

  const { data, error } = await supabase
    .from('report_templates')
    .upsert(
      {
        kind,
        file_name: file.name,
        content: arrayBufferToBase64(bytes),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'kind' }
    )
    .select('kind, file_name, content, updated_at')
    .single();
  if (error || !data) {
    throw new TemplateError(
      error?.code === '42501'
        ? 'Keine Berechtigung: Nur Administratoren dürfen Vorlagen hochladen.'
        : `Speichern fehlgeschlagen: ${error?.message ?? 'unbekannter Fehler'}`
    );
  }

  const db = await getDB();
  await db.put('report_templates', data as StoredTemplate);
  notifyChanged();
  return { kind, file_name: data.file_name, updated_at: data.updated_at };
};

// Back to the standard export. Row-level security does not raise an error for a
// delete it forbids, it just deletes nothing, so the server's state is re-read
// afterwards and the template must really be gone.
export const deleteTemplate = async (kind: ReportTemplateKind): Promise<void> => {
  requireOnline();
  const { error } = await supabase.from('report_templates').delete().eq('kind', kind);
  if (error) throw new TemplateError(`Löschen fehlgeschlagen: ${error.message}`);

  await pullTemplates();
  if (await getTemplate(kind)) {
    throw new TemplateError('Keine Berechtigung: Nur Administratoren dürfen Vorlagen entfernen.');
  }
};
