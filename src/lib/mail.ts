import { TimeEntry } from '@/types';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';

// Mail clients and browsers cap mailto: URLs (roughly 2000 characters in
// practice), so very long notes are shortened to keep the link working.
const MAX_MAILTO_LENGTH = 1800;

const formatDateDDMMYYYY = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

// Opens-the-default-mail-app link for one session, without a recipient.
// encodeURIComponent (not URLSearchParams) so spaces become %20, not '+'.
export const buildSessionMailto = (
  entry: TimeEntry,
  customerName: string,
  sessionTypeLabel: string
): string => {
  const date = formatDateDDMMYYYY(entry.entry_date);
  const subject = `Zeiterfassung: ${customerName} – ${date}`;
  const duration = `${minutesToAE(entry.duration_minutes).toFixed(1).replace('.', ',')} AE (${minutesToHHMM(
    entry.duration_minutes
  )})`;

  const build = (notes: string | null): string => {
    const lines = [
      `Kunde: ${customerName}`,
      `Datum: ${date}`,
      `Typ: ${sessionTypeLabel}`,
      `Dauer: ${duration}`,
    ];
    if (notes) lines.push('', 'Notizen:', notes);
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
  };

  const notes = entry.notes?.trim() || null;
  let url = build(notes);
  if (!notes) return url;

  let keep = notes.length;
  while (keep > 0 && url.length > MAX_MAILTO_LENGTH) {
    keep = Math.max(0, Math.floor(keep * 0.9) - 1);
    url = build(keep > 0 ? notes.slice(0, keep).trimEnd() + '…' : null);
  }
  return url;
};
