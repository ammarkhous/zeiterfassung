// Turns the free text of a note into clean, consistent blocks, however it was typed:
// "-", "*", "+", "•", "–" bullets, numbered lines, indented sub-points, tabs, blank lines.
// Used by every export, so a report always looks the same way.

export type NoteKind = 'heading' | 'text' | 'item' | 'sub';

export interface NoteBlock {
  kind: NoteKind;
  /** "•", "–" or "1." for list entries, empty otherwise. */
  marker: string;
  text: string;
}

// "• x", "· x" (the symbol alone is enough), "- x", "* x", "+ x", "– x" (a space is needed
// so "*Pflicht*" or "-5 °C" stay text), and "-x" when a letter follows.
const BULLET_RE = /^(\s*)(?:[•·▪●○◦‣⁃]\s*|[*+\-–—]\s+|[-–—](?=[A-Za-zÄÖÜäöüß]))(\S.*)$/;
const NUMBER_RE = /^(\s*)(\d{1,3})[.)]\s+(\S.*)$/;

// Plain-text emphasis that people type by habit ("**wichtig**") is dropped.
const clean = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

type RawLine =
  | { type: 'item'; indent: number; text: string }
  | { type: 'number'; indent: number; number: string; text: string }
  | { type: 'plain'; indent: number; text: string };

const classify = (line: string): RawLine => {
  const bullet = BULLET_RE.exec(line);
  if (bullet) return { type: 'item', indent: bullet[1].length, text: clean(bullet[2]) };
  const numbered = NUMBER_RE.exec(line);
  if (numbered) {
    return { type: 'number', indent: numbered[1].length, number: numbered[2], text: clean(numbered[3]) };
  }
  return { type: 'plain', indent: line.length - line.trimStart().length, text: clean(line) };
};

export const parseNotes = (notes: string | null | undefined): NoteBlock[] => {
  if (!notes) return [];
  const lines = notes
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\t/g, '    '))
    .filter((l) => l.trim() !== '')
    .map(classify)
    .filter((l) => l.text !== '');

  const blocks: NoteBlock[] = [];
  // Indentation of the first bullet of the current list: only bullets indented further
  // than that are sub-points, so a whole list typed with a uniform indent stays flat.
  let baseIndent = 0;
  lines.forEach((line, i) => {
    const next = lines[i + 1];
    const previous = blocks[blocks.length - 1];
    const introducesList = next?.type === 'item';

    if (line.type === 'item') {
      const afterList = previous?.kind === 'item' || previous?.kind === 'sub';
      if (!afterList) baseIndent = line.indent;
      const nested = afterList && line.indent >= baseIndent + 2;
      blocks.push({ kind: nested ? 'sub' : 'item', marker: nested ? '–' : '•', text: line.text });
    } else if (line.type === 'number') {
      // "1. Wiederherstellung" above bullets is a heading, in a row of its own it is a list entry.
      if (introducesList) blocks.push({ kind: 'heading', marker: '', text: `${line.number}. ${line.text}` });
      else blocks.push({ kind: 'item', marker: `${line.number}.`, text: line.text });
    } else if (introducesList && line.text.endsWith(':')) {
      blocks.push({ kind: 'heading', marker: '', text: line.text });
    } else {
      blocks.push({ kind: 'text', marker: '', text: line.text });
    }
  });
  return blocks;
};

// Plain text for PDF, CSV, TXT and mail: one entry per line, uniform "•" bullets,
// a blank line before every heading.
export const notesToPlain = (notes: string | null | undefined): string => {
  const out: string[] = [];
  parseNotes(notes).forEach((block, i) => {
    if (block.kind === 'heading' && i > 0) out.push('');
    if (block.kind === 'item') out.push(`${block.marker} ${block.text}`);
    else if (block.kind === 'sub') out.push(`    ${block.marker} ${block.text}`);
    else out.push(block.text);
  });
  return out.join('\n');
};

// For Word templates: one entry per paragraph; exactly one of the four flags is true.
export const notesToTemplateLines = (notes: string | null | undefined) =>
  parseNotes(notes).map((block) => ({
    text: block.text,
    marker: block.marker,
    ueberschrift: block.kind === 'heading',
    absatz: block.kind === 'text',
    punkt: block.kind === 'item',
    unterpunkt: block.kind === 'sub',
  }));
