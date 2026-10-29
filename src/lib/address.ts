export const MAX_ADDRESS_LINES = 4;
export const MAX_ADDRESS_CHARS = 300; // also enforced by a check constraint on customers.address

// Tidies a typed address: trims every line, drops empty lines, keeps at most four lines.
// Returns null when nothing is left, so "no address" is always stored the same way.
export const normalizeAddress = (text: string | null | undefined): string | null => {
  const lines = (text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, MAX_ADDRESS_LINES);
  return lines.join('\n').slice(0, MAX_ADDRESS_CHARS) || null;
};

// One line for lists ("Musterstraße 1 · 01234 Musterstadt").
export const addressOneLine = (address: string | null | undefined): string =>
  (address ?? '').split('\n').filter(Boolean).join(' · ');
