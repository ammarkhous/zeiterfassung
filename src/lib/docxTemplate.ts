import JSZip from 'jszip';
import { ReportTemplateKind } from '@/types';
import { TEMPLATE_ROOTS } from '@/lib/templateData';

// Word templates are filled in the browser by docx-templates. Its template
// commands are JavaScript, so a template uploaded by an admin would run in EVERY
// user's browser. This module therefore never lets a template contain anything
// but plain data lookups: validateTemplate() checks every command the engine
// would execute against a strict whitelist, at upload and again before each export.

export const MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const COMMAND_DELIMITER: [string, string] = ['{', '}'];
// The default literal-XML delimiter is '||', which could appear in a note and
// would then be inserted into the document as raw XML. Use a character no one types.
const LITERAL_XML_DELIMITER = '␞␞';

const MAX_ZIP_ENTRIES = 1000;
const MAX_XML_PART_BYTES = 20 * 1024 * 1024;

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

// Lazy: the engine is ~200 KB and only needed when a template is used.
export const loadEngine = () => import('docx-templates/lib/browser.js');

const IDENT = '[A-Za-z_][A-Za-z0-9_]*';
const PATH = `\\$?${IDENT}(?:\\.${IDENT})*`;
const PATH_RE = new RegExp(`^${PATH}$`);
const FOR_RE = new RegExp(`^(${IDENT})\\s+IN\\s+(${PATH})$`);
const END_FOR_RE = new RegExp(`^(${IDENT})$`);
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_TYPES = new Set(['INS', 'FOR', 'END-FOR', 'IF', 'END-IF', 'IMAGE']);

const shorten = (text: string): string => (text.length > 60 ? `${text.slice(0, 57)}...` : text);

const toArrayBuffer = (bytes: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (bytes instanceof ArrayBuffer) return bytes;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

// Checks that a path only reads our data: its root must be a known data field or
// a loop variable declared by an enclosing FOR, and no segment may be a
// prototype-chain name. Function calls and operators cannot match PATH at all.
const checkPath = (
  path: string,
  raw: string,
  roots: ReadonlySet<string>,
  loopVars: string[]
): void => {
  if (!PATH_RE.test(path)) {
    throw new TemplateError(
      `Nicht erlaubter Ausdruck in "{${shorten(raw)}}". In Vorlagen sind nur Feldnamen erlaubt, keine Berechnungen oder Funktionen.`
    );
  }
  const segments = path.replace(/^\$/, '').split('.');
  if (segments.some((s) => FORBIDDEN_SEGMENTS.has(s))) {
    throw new TemplateError(`Nicht erlaubter Feldname in "{${shorten(raw)}}".`);
  }
  if (path.startsWith('$')) {
    if (!loopVars.includes(segments[0])) {
      throw new TemplateError(
        `"{${shorten(raw)}}" steht außerhalb der passenden Schleife (FOR ${segments[0]} IN ...).`
      );
    }
    return;
  }
  if (!roots.has(segments[0])) {
    throw new TemplateError(
      `Unbekanntes Feld "{${shorten(raw)}}". Erlaubte Felder: ${Array.from(roots).join(', ')}.`
    );
  }
};

const checkZip = async (bytes: ArrayBuffer): Promise<void> => {
  if (bytes.byteLength === 0) throw new TemplateError('Die Datei ist leer.');
  if (bytes.byteLength > MAX_TEMPLATE_BYTES) {
    throw new TemplateError(`Die Vorlage ist zu groß (maximal ${MAX_TEMPLATE_BYTES / 1024 / 1024} MB).`);
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new TemplateError('Das ist keine gültige Word-Datei (.docx).');
  }

  const names = Object.keys(zip.files);
  if (names.length > MAX_ZIP_ENTRIES) throw new TemplateError('Die Word-Datei enthält zu viele Teile.');
  if (!zip.file('word/document.xml') || !zip.file('[Content_Types].xml')) {
    throw new TemplateError('Das ist keine gültige Word-Datei (.docx): Dokumentinhalt fehlt.');
  }
  if (names.some((n) => /vbaProject/i.test(n))) {
    throw new TemplateError('Dokumente mit Makros sind nicht erlaubt. Bitte als .docx ohne Makros speichern.');
  }

  // A zip bomb would expand when read, so check the declared sizes first.
  for (const name of names) {
    const declared = (zip.files[name] as unknown as { _data?: { uncompressedSize?: number } })._data
      ?.uncompressedSize;
    if (declared !== undefined && declared > MAX_XML_PART_BYTES) {
      throw new TemplateError('Die Word-Datei enthält einen unzulässig großen Teil.');
    }
  }

  const contentTypes = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
  if (/macroEnabled/i.test(contentTypes)) {
    throw new TemplateError('Dokumente mit Makros sind nicht erlaubt. Bitte als .docx ohne Makros speichern.');
  }
  const settingsRels = await zip.file('word/_rels/settings.xml.rels')?.async('string');
  if (settingsRels && /attachedTemplate/i.test(settingsRels)) {
    throw new TemplateError('Dokumente mit verknüpfter Vorlage sind nicht erlaubt.');
  }
};

// Throws a TemplateError (German message) unless the template is a plain .docx
// whose commands are exclusively: {field}, {$loopVar.field}, {FOR v IN path},
// {END-FOR v}, {IF path}, {END-IF}, {IMAGE path}.
export const validateTemplate = async (
  input: ArrayBuffer | Uint8Array,
  kind: ReportTemplateKind
): Promise<void> => {
  const bytes = toArrayBuffer(input);
  await checkZip(bytes);

  // The engine's own parser lists the commands it WILL execute, so nothing can
  // slip past a differently written scanner of ours.
  const { listCommands } = await loadEngine();
  let commands;
  try {
    commands = await listCommands(bytes, COMMAND_DELIMITER);
  } catch (err) {
    throw new TemplateError(
      `Die Vorlage konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const roots = new Set<string>(TEMPLATE_ROOTS[kind]);
  const loopVars: string[] = [];
  let openIfs = 0;

  for (const command of commands) {
    const { type, code, raw } = command;
    if (!ALLOWED_TYPES.has(type)) {
      throw new TemplateError(
        `Nicht erlaubter Befehl "{${shorten(raw)}}". Erlaubt sind nur Felder, FOR/END-FOR, IF/END-IF und IMAGE.`
      );
    }

    if (type === 'INS' || type === 'IMAGE' || type === 'IF') {
      // The engine's "+++$idx+++" counter is read-only and harmless.
      if (type === 'INS' && code.trim() === '$idx') continue;
      checkPath(code.trim(), raw, roots, loopVars);
      if (type === 'IF') openIfs += 1;
    } else if (type === 'FOR') {
      const match = FOR_RE.exec(code.trim());
      if (!match) {
        throw new TemplateError(`Ungültige Schleife "{${shorten(raw)}}". Erwartet: FOR name IN feld`);
      }
      checkPath(match[2], raw, roots, loopVars);
      loopVars.push(match[1]);
    } else if (type === 'END-FOR') {
      const match = END_FOR_RE.exec(code.trim());
      if (!match || loopVars[loopVars.length - 1] !== match[1]) {
        throw new TemplateError(`"{${shorten(raw)}}" passt zu keiner offenen Schleife.`);
      }
      loopVars.pop();
    } else if (type === 'END-IF') {
      if (openIfs === 0) throw new TemplateError('"{END-IF}" ohne passendes "{IF ...}".');
      openIfs -= 1;
    }
  }

  if (loopVars.length > 0) {
    throw new TemplateError(`Die Schleife "FOR ${loopVars[loopVars.length - 1]}" wird nicht mit END-FOR geschlossen.`);
  }
  if (openIfs > 0) throw new TemplateError('Ein "{IF ...}" wird nicht mit "{END-IF}" geschlossen.');
};

export interface RenderOptions {
  // Dry runs set this so a typo in a field name fails loudly instead of printing nothing.
  rejectNullish?: boolean;
}

// Fills the template. Callers must have validated it first (renderWordReport and
// uploadTemplate both do); sandboxing is off because the whitelist is the control.
export const renderDocx = async (
  input: ArrayBuffer | Uint8Array,
  data: Record<string, unknown>,
  options: RenderOptions = {}
): Promise<Uint8Array> => {
  const { createReport } = await loadEngine();
  try {
    return await createReport({
      template: new Uint8Array(toArrayBuffer(input)),
      data,
      cmdDelimiter: COMMAND_DELIMITER,
      literalXmlDelimiter: LITERAL_XML_DELIMITER,
      noSandbox: true,
      failFast: true,
      rejectNullish: options.rejectNullish ?? false,
      // Valid XML for notes with line breaks (the default nests <w:br/> inside
      // <w:t>, which LibreOffice and Google Drive handle badly), and no pretty-printing.
      processLineBreaksAsNewText: true,
      indentXml: false,
    });
  } catch (err) {
    throw new TemplateError(
      `Vorlage fehlerhaft: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
