'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MonthlyReportRow } from '@/types';
import { minutesToAE } from '@/lib/ae';
import { translateToGerman } from '@/lib/translate';
import { buildReportPdf } from '@/lib/pdf';
import { buildReportTxt, downloadTextFile, formatDateDDMMYYYY } from '@/lib/export';

const buildGermanNotesMap = async (rows: MonthlyReportRow[]): Promise<Map<string, string>> => {
  const uniqueNotes = new Set<string>();
  for (const row of rows) {
    for (const entry of row.entries) {
      if (entry.notes) uniqueNotes.add(entry.notes);
    }
  }

  const map = new Map<string, string>();
  await Promise.all(
    Array.from(uniqueNotes).map(async (note) => {
      const translated = await translateToGerman(note);
      if (translated) map.set(note, translated);
    })
  );
  return map;
};

interface ExportButtonsProps {
  rows: MonthlyReportRow[];
  year: number;
  month: number;
  sessionTypeLabel: (id: string) => string;
}

export const ExportButtons = ({ rows, year, month, sessionTypeLabel }: ExportButtonsProps) => {
  const [exporting, setExporting] = useState<'pdf' | 'csv' | 'txt' | null>(null);
  const fileSuffix = `${year}-${(month + 1).toString().padStart(2, '0')}`;

  const handlePdfExport = async () => {
    setExporting('pdf');
    const germanNotes = await buildGermanNotesMap(rows);
    const noteFor = (notes: string | null) => (notes ? germanNotes.get(notes) ?? notes : '');

    buildReportPdf(rows, year, month, sessionTypeLabel, noteFor).save(
      `Abrechnung_${fileSuffix}.pdf`
    );
    setExporting(null);
  };

  const handleCsvExport = async () => {
    setExporting('csv');
    const germanNotes = await buildGermanNotesMap(rows);
    const noteFor = (notes: string | null) => (notes ? germanNotes.get(notes) ?? notes : '');

    const header = 'Datum;Kunde;Typ;AE;Minuten;Notizen;Satz_EUR_pro_AE;Wert_EUR';
    const lines: string[] = [header];

    for (const row of rows) {
      for (const entry of row.entries) {
        const ae = minutesToAE(entry.duration_minutes);
        const value = ae * row.customer.ae_rate;
        const notes = noteFor(entry.notes).replace(/;/g, ',').replace(/\n/g, ' ');
        lines.push(
          [
            formatDateDDMMYYYY(entry.entry_date),
            row.customer.name,
            sessionTypeLabel(entry.session_type_id),
            ae.toFixed(1).replace('.', ','),
            entry.duration_minutes.toString(),
            notes,
            row.customer.ae_rate.toFixed(2).replace('.', ','),
            value.toFixed(2).replace('.', ','),
          ].join(';')
        );
      }
    }

    downloadTextFile(lines.join('\r\n'), `Abrechnung_${fileSuffix}.csv`, 'text/csv');
    setExporting(null);
  };

  const handleTxtExport = async () => {
    setExporting('txt');
    const germanNotes = await buildGermanNotesMap(rows);
    const noteFor = (notes: string | null) => (notes ? germanNotes.get(notes) ?? notes : '');

    downloadTextFile(
      buildReportTxt(rows, year, month, sessionTypeLabel, noteFor),
      `Abrechnung_${fileSuffix}.txt`,
      'text/plain'
    );
    setExporting(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handlePdfExport} disabled={exporting !== null}>
        {exporting === 'pdf' ? 'Wird exportiert...' : 'PDF exportieren'}
      </Button>
      <Button variant="secondary" onClick={handleCsvExport} disabled={exporting !== null}>
        {exporting === 'csv' ? 'Wird exportiert...' : 'CSV exportieren'}
      </Button>
      <Button variant="secondary" onClick={handleTxtExport} disabled={exporting !== null}>
        {exporting === 'txt' ? 'Wird exportiert...' : 'TXT exportieren'}
      </Button>
    </div>
  );
};
