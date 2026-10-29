'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DOCX_MIME, TemplateError } from '@/lib/docxTemplate';
import { downloadBlob } from '@/lib/export';
import {
  TEMPLATES_CHANGED_EVENT,
  base64ToArrayBuffer,
  deleteTemplate,
  getTemplate,
  listTemplateMeta,
  uploadTemplate,
} from '@/lib/templates';
import { ReportTemplateKind, TemplateMeta } from '@/types';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface KindInfo {
  kind: ReportTemplateKind;
  title: string;
  description: string;
  sampleFile: string;
  fields: [string, string][];
}

const KINDS: KindInfo[] = [
  {
    kind: 'monthly',
    title: 'Technikerbericht: Monat',
    description: 'Für „Alle Arbeit“ und für die Reports pro Kunde (Export eines ganzen Monats).',
    sampleFile: 'MCT_Vorlage_Monatsbericht.docx',
    fields: [
      ['{nummer}', 'Berichtsnummer, z. B. TB-2026-10'],
      ['{zeitraum} {monat} {jahr}', 'Oktober 2026 / Oktober / 2026'],
      ['{erstellt_am} {techniker}', 'Datum der Erstellung, angemeldeter Benutzer'],
      ['{ae_gesamt} {stunden_gesamt} {km_gesamt} {sessionen_gesamt}', 'Gesamtsummen: AE, Stunden, gefahrene Kilometer, Anzahl Sessions'],
      ['{kunde.name} {kunde.adresse}', 'Kunde und Adresse (bei „Alle Arbeit“: „Alle Kunden“, ohne Adresse); auch kunde.sessionen, kunde.ae, kunde.stunden, kunde.km'],
      ['{FOR k IN kunden} … {END-FOR k}', 'Schleife über alle Kunden, darin {$k.name} {$k.adresse} {$k.sessionen} {$k.ae} {$k.stunden} {$k.km}'],
      ['{FOR s IN $k.sessions} … {END-FOR s}', 'Schleife über die Sessions des Kunden, darin {$s.pos} {$s.datum} {$s.typ} {$s.ae} {$s.stunden} {$s.beginn} {$s.ende} {$s.notizen} {$s.material} {$s.fahrt}'],
      ['{FOR z IN $s.notizen_zeilen} … {END-FOR z}', 'Notizen Absatz für Absatz (geordnet, mit Aufzählungen), darin je ein {IF $z.ueberschrift}, {IF $z.absatz}, {IF $z.punkt} oder {IF $z.unterpunkt} mit {$z.text} und {$z.marker}'],
      ['{IF $s.material} … {END-IF}', 'Zeilen nur anzeigen, wenn Material bzw. eine Fahrt erfasst wurde ({IF $s.fahrt} analog)'],
    ],
  },
  {
    kind: 'session',
    title: 'Technikerbericht: einzelne Session',
    description: 'Für den Export einer einzelnen Session (mit den Unterschriften).',
    sampleFile: 'MCT_Vorlage_Session-Bericht.docx',
    fields: [
      ['{nummer}', 'Berichtsnummer, z. B. TB-20261028-1757'],
      ['{kunde} {kunde_adresse} {datum} {beginn} {ende} {typ}', 'Angaben zur Session; die Adresse ist leer, wenn beim Kunden keine hinterlegt ist ({IF kunde_adresse} … {END-IF})'],
      ['{dauer_ae} {dauer_stunden}', 'Dauer in AE und als Stunden'],
      ['{techniker} {notizen}', 'Techniker und vollständige Notizen (als ein Text)'],
      ['{FOR z IN notizen_zeilen} … {END-FOR z}', 'Notizen Absatz für Absatz (geordnet, mit Aufzählungen), darin je ein {IF $z.ueberschrift}, {IF $z.absatz}, {IF $z.punkt} oder {IF $z.unterpunkt} mit {$z.text} und {$z.marker}'],
      ['{fahrt}', 'Gefahrene Kilometer, z. B. „12,5 km“ (leer, wenn keine Fahrt erfasst wurde)'],
      ['{material}', 'Material, eine Zeile pro Eintrag, z. B. „Kabel Cat6 (2 Stück)“'],
      ['{FOR m IN materialien} … {END-FOR m}', 'Schleife über das Material, darin {$m.name} {$m.menge}'],
      ['{IF hat_material} … {END-IF}', 'Inhalt nur anzeigen, wenn Material erfasst wurde (auch hat_fahrt)'],
      ['{status_techniker} {status_kunde} {unterschrieben_am}', '„Unterschrieben am …“ oder „Nicht unterschrieben“'],
      ['{IMAGE signatur_techniker} {IMAGE signatur_kunde}', 'Unterschriften als Bild'],
      ['{IF hat_signatur_kunde} … {END-IF}', 'Inhalt nur anzeigen, wenn unterschrieben wurde (auch hat_signatur_techniker)'],
    ],
  },
];

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

// Admin: one Word template per report type. With a template the export button
// produces a .docx; without one the standard PDF stays.
export const TemplateSettings = () => {
  const { showToast } = useToast();
  const [metas, setMetas] = useState<TemplateMeta[]>([]);
  const [busyKind, setBusyKind] = useState<ReportTemplateKind | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ReportTemplateKind, string>>>({});
  const [resetKind, setResetKind] = useState<ReportTemplateKind | null>(null);
  const fileInputs = useRef<Partial<Record<ReportTemplateKind, HTMLInputElement | null>>>({});

  const reload = useCallback(async () => {
    setMetas(await listTemplateMeta());
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(TEMPLATES_CHANGED_EVENT, reload);
    return () => window.removeEventListener(TEMPLATES_CHANGED_EVENT, reload);
  }, [reload]);

  const setError = (kind: ReportTemplateKind, message: string | null) =>
    setErrors((prev) => ({ ...prev, [kind]: message ?? undefined }));

  const messageOf = (err: unknown): string =>
    err instanceof TemplateError ? err.message : 'Unerwarteter Fehler. Bitte erneut versuchen.';

  const handleFile = async (kind: ReportTemplateKind, file: File | undefined) => {
    if (!file) return;
    setBusyKind(kind);
    setError(kind, null);
    try {
      await uploadTemplate(kind, file);
      showToast('Vorlage gespeichert', 'success');
    } catch (err) {
      console.error('Vorlage konnte nicht hochgeladen werden:', err);
      setError(kind, messageOf(err));
    } finally {
      setBusyKind(null);
      const input = fileInputs.current[kind];
      if (input) input.value = '';
    }
  };

  const handleDownloadCurrent = async (kind: ReportTemplateKind) => {
    const template = await getTemplate(kind);
    if (!template) return;
    downloadBlob(new Blob([base64ToArrayBuffer(template.content)], { type: DOCX_MIME }), template.file_name);
  };

  const handleReset = async () => {
    if (!resetKind) return;
    const kind = resetKind;
    setBusyKind(kind);
    setError(kind, null);
    try {
      await deleteTemplate(kind);
      showToast('Standard wiederhergestellt', 'success');
      setResetKind(null);
    } catch (err) {
      setError(kind, messageOf(err));
      setResetKind(null);
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <section>
      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Gestaltung der Exporte
        </p>
        <h2 className="text-xl font-bold text-text">Export-Vorlagen (Word)</h2>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Mit einer Vorlage erstellt der Export eine Word-Datei im Design Ihrer Vorlage statt des
          Standard-PDFs. Ohne Vorlage bleibt alles wie bisher. Die Vorlage gilt für alle Benutzer.
          CSV und TXT sind nicht betroffen.
        </p>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Preise sind in Word-Exporten bewusst nicht verfügbar: Der Bericht ist keine Rechnung.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {KINDS.map((info) => {
          const meta = metas.find((m) => m.kind === info.kind);
          const busy = busyKind === info.kind;
          return (
            <div key={info.kind} className="rounded-3xl border border-border bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-text">{info.title}</h3>
                    <Badge variant={meta ? 'success' : 'default'}>
                      {meta ? 'Eigene Vorlage' : 'Standard'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-text-muted">{info.description}</p>
                  {meta && (
                    <p className="mt-1 text-xs text-text-muted">
                      {meta.file_name} · hochgeladen am {formatDateTime(meta.updated_at)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => fileInputs.current[info.kind]?.click()} disabled={busy}>
                  {busy ? 'Wird geprüft...' : meta ? 'Vorlage ersetzen' : 'Vorlage hochladen'}
                </Button>
                <input
                  ref={(el) => {
                    fileInputs.current[info.kind] = el;
                  }}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => handleFile(info.kind, e.target.files?.[0])}
                />
                <a
                  href={`${basePath}/templates/${info.sampleFile}`}
                  download={info.sampleFile}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-semibold text-text transition-colors duration-150 ease-out hover:bg-surface-2"
                >
                  Beispielvorlage herunterladen
                </a>
                {meta && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadCurrent(info.kind)}
                      disabled={busy}
                    >
                      Aktuelle Vorlage herunterladen
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setResetKind(info.kind)}
                      disabled={busy}
                    >
                      Standard wiederherstellen
                    </Button>
                  </>
                )}
              </div>

              {errors[info.kind] && (
                <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {errors[info.kind]}
                </p>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-accent">
                  Verfügbare Platzhalter
                </summary>
                <p className="mt-2 text-xs text-text-muted">
                  Schreiben Sie die Platzhalter genau so in Ihr Word-Dokument. Erlaubt sind nur diese
                  Felder, Schleifen (FOR), Bedingungen (IF) und Bilder (IMAGE), keine Berechnungen.
                  Für eine Tabellenzeile pro Session steht FOR in einer eigenen Zeile über, END-FOR
                  in einer eigenen Zeile unter der Zeile, die sich wiederholt (siehe Beispielvorlage).
                </p>
                <dl className="mt-2 flex flex-col gap-2">
                  {info.fields.map(([field, text]) => (
                    <div key={field}>
                      <dt className="break-words font-mono text-xs font-semibold text-text">{field}</dt>
                      <dd className="text-xs text-text-muted">{text}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!resetKind}
        onClose={() => setResetKind(null)}
        title="Standard wiederherstellen"
      >
        <p className="mb-4 text-sm text-text">
          Die hochgeladene Vorlage wird für alle Benutzer entfernt. Danach erstellen die Exporte
          wieder das Standard-PDF.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={handleReset} disabled={busyKind !== null}>
            Vorlage entfernen
          </Button>
          <Button variant="secondary" onClick={() => setResetKind(null)}>
            Abbrechen
          </Button>
        </div>
      </Modal>
    </section>
  );
};
