import { MonthlyReportRow, TimeEntry } from '@/types';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';
import { GERMAN_MONTHS } from '@/lib/germanMonths';

export const formatEUR = (value: number): string =>
  value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export const formatDateDDMMYYYY = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

const formatAEComma = (minutes: number): string => minutesToAE(minutes).toFixed(1).replace('.', ',');

const RULE_WIDTH = 64;
const HEAVY_RULE = '='.repeat(RULE_WIDTH);
const LIGHT_RULE = '-'.repeat(RULE_WIDTH);

// Plain-text version of the monthly report: same numbers as the PDF and CSV
// (AE with one decimal, German separators), readable in any editor or mail body.
export const buildReportTxt = (
  rows: MonthlyReportRow[],
  year: number,
  month: number,
  sessionTypeLabel: (id: string) => string,
  noteFor: (notes: string | null) => string,
  createdAt: Date = new Date()
): string => {
  const totalMinutes = rows.reduce((sum, r) => sum + r.total_minutes, 0);
  const totalValue = rows.reduce((sum, r) => sum + r.total_value, 0);
  const totalSessions = rows.reduce((sum, r) => sum + r.entries.length, 0);

  const lines: string[] = [
    'ZEITERFASSUNG',
    `Abrechnung ${GERMAN_MONTHS[month]} ${year}`,
    `Erstellt am ${createdAt.toLocaleDateString('de-DE')}`,
    '',
    `AE gesamt:   ${formatAEComma(totalMinutes)}`,
    `Stunden:     ${minutesToHHMM(totalMinutes)}`,
    `Sessionen:   ${totalSessions}`,
    `Gesamtwert:  ${formatEUR(totalValue)}`,
  ];

  for (const row of rows) {
    lines.push(
      '',
      HEAVY_RULE,
      row.customer.name,
      `Satz: ${formatEUR(row.customer.ae_rate)} pro AE`,
      LIGHT_RULE
    );

    for (const entry of row.entries) {
      const note = noteFor(entry.notes).replace(/\s*\r?\n\s*/g, ' ').trim();
      const parts = [
        formatDateDDMMYYYY(entry.entry_date),
        sessionTypeLabel(entry.session_type_id),
        `${formatAEComma(entry.duration_minutes)} AE`,
        minutesToHHMM(entry.duration_minutes),
      ];
      if (note) parts.push(note);
      lines.push(parts.join(' | '));
    }

    lines.push(
      LIGHT_RULE,
      `Summe ${row.customer.name}: ${formatAEComma(row.total_minutes)} AE | ${minutesToHHMM(
        row.total_minutes
      )} | ${formatEUR(row.total_value)}`
    );
  }

  lines.push('', HEAVY_RULE, `GESAMT: ${formatAEComma(totalMinutes)} AE | ${minutesToHHMM(totalMinutes)} | ${formatEUR(totalValue)}`);

  return lines.join('\r\n') + '\r\n';
};

// Plain-text version of a single session with the complete, untouched notes
// (original line breaks kept). Attached to the "per E-Mail senden" mail.
export const buildSessionTxt = (
  entry: TimeEntry,
  customerName: string,
  sessionTypeLabel: string
): string => {
  const lines = [
    'ZEITERFASSUNG',
    '',
    `Kunde: ${customerName}`,
    `Datum: ${formatDateDDMMYYYY(entry.entry_date)}`,
    `Typ: ${sessionTypeLabel}`,
    `Dauer: ${formatAEComma(entry.duration_minutes)} AE (${minutesToHHMM(entry.duration_minutes)})`,
  ];
  const notes = entry.notes?.trim();
  if (notes) lines.push('', 'Notizen:', notes.replace(/\r?\n/g, '\r\n'));
  return lines.join('\r\n') + '\r\n';
};

// File object for the Web Share API. Plain 'text/plain' (no charset parameter)
// because canShare() only accepts bare MIME types; the BOM carries the encoding.
export const createTextFile = (content: string, filename: string): File =>
  new File(['﻿' + content], filename, { type: 'text/plain' });

// Starts a browser download of a text file; the BOM makes Excel and Notepad
// read it as UTF-8 (umlauts).
export const downloadTextFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob(['﻿' + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
