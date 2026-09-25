'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/Button';
import { MonthlyReportRow } from '@/types';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';
import { translateToGerman } from '@/lib/translate';

const GERMAN_MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const formatEUR = (value: number): string =>
  value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatDateDDMMYYYY = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
};

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
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const monthLabel = GERMAN_MONTHS[month];
  const fileSuffix = `${year}-${(month + 1).toString().padStart(2, '0')}`;

  const handlePdfExport = async () => {
    setExporting('pdf');
    const germanNotes = await buildGermanNotesMap(rows);
    const noteFor = (notes: string | null) => (notes ? germanNotes.get(notes) ?? notes : '');

    const ACCENT: [number, number, number] = [31, 58, 46]; // #1F3A2E
    const LIME: [number, number, number] = [169, 217, 119]; // #A9D977
    const LIME_DIM: [number, number, number] = [238, 248, 226]; // #EEF8E2
    const SURFACE_2: [number, number, number] = [238, 240, 233]; // #EEF0E9
    const BORDER: [number, number, number] = [226, 229, 218]; // #E2E5DA
    const TEXT: [number, number, number] = [22, 35, 28]; // #16231C
    const TEXT_MUTED: [number, number, number] = [108, 117, 104]; // #6C7568

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const createdDate = new Date().toLocaleDateString('de-DE');
    const totalAE = minutesToAE(rows.reduce((s, r) => s + r.total_minutes, 0));
    const totalValue = rows.reduce((s, r) => s + r.total_value, 0);

    const drawHeader = (full: boolean) => {
      doc.setFillColor(...ACCENT);
      doc.rect(0, 0, pageWidth, full ? 38 : 20, 'F');

      doc.setFillColor(...LIME);
      doc.roundedRect(14, full ? 10 : 5, 10, 10, 2.5, 2.5, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ACCENT);
      doc.text('Z', 19, full ? 17.2 : 12.2, { align: 'center' });

      if (!full) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`Zeiterfassung · ${monthLabel} ${year}`, 28, 11.5);
        return;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('ZEITERFASSUNG', 28, 14);

      doc.setFontSize(17);
      doc.setFont('helvetica', 'bold');
      doc.text(`Abrechnung ${monthLabel} ${year}`, 28, 23);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 226, 218);
      doc.text(`Erstellt am ${createdDate}`, 28, 30);

      doc.setFontSize(8);
      doc.setTextColor(...LIME);
      doc.text('DE · DEUTSCHES PDF', pageWidth - 14, 14, { align: 'right' });
    };

    drawHeader(true);

    // Summary stat band
    const statY = 46;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(14, statY, pageWidth - 28, 22, 3, 3, 'FD');

    const statColWidth = (pageWidth - 28) / 3;
    const stats: [string, string][] = [
      ['AE GESAMT', totalAE.toFixed(1)],
      ['STUNDEN', minutesToHHMM(rows.reduce((s, r) => s + r.total_minutes, 0))],
      ['GESAMTWERT', formatEUR(totalValue)],
    ];
    stats.forEach(([label, value], i) => {
      const x = 14 + statColWidth * i + statColWidth / 2;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text(label, x, statY + 8, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.text(value, x, statY + 16, { align: 'center' });
      if (i > 0) {
        doc.setDrawColor(...BORDER);
        doc.line(14 + statColWidth * i, statY + 4, 14 + statColWidth * i, statY + 18);
      }
    });

    autoTable(doc, {
      startY: statY + 30,
      head: [['Kunde', 'Sessionen', 'AE gesamt', 'Stunden', 'Satz (€/AE)', 'Gesamt (€)']],
      body: rows.map((r) => [
        r.customer.name,
        r.entries.length.toString(),
        r.total_ae.toFixed(1),
        minutesToHHMM(r.total_minutes),
        formatEUR(r.customer.ae_rate),
        formatEUR(r.total_value),
      ]),
      foot: [
        [
          'Summe',
          rows.reduce((s, r) => s + r.entries.length, 0).toString(),
          totalAE.toFixed(1),
          minutesToHHMM(rows.reduce((s, r) => s + r.total_minutes, 0)),
          '—',
          formatEUR(totalValue),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: LIME_DIM, textColor: TEXT, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: SURFACE_2 },
      styles: { fontSize: 9, textColor: TEXT, lineColor: BORDER, lineWidth: 0.2 },
      margin: { left: 14, right: 14 },
    });

    let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    for (const row of rows) {
      if (finalY > 250) {
        doc.addPage();
        drawHeader(false);
        finalY = 32;
      }

      doc.setFillColor(...LIME);
      doc.rect(14, finalY - 4, 2.5, 6, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.text(row.customer.name, 19, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['Datum', 'Typ', 'AE', 'hh:mm', 'Notizen']],
        body: row.entries.map((e) => [
          formatDateDDMMYYYY(e.entry_date),
          sessionTypeLabel(e.session_type_id),
          minutesToAE(e.duration_minutes).toFixed(1),
          minutesToHHMM(e.duration_minutes),
          noteFor(e.notes),
        ]),
        theme: 'grid',
        headStyles: { fillColor: SURFACE_2, textColor: TEXT, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 250, 248] },
        styles: { fontSize: 8, textColor: TEXT, lineColor: BORDER, lineWidth: 0.2 },
        // Fixed widths for every column except Notizen (which fills the rest) so
        // the Notizen column starts at the same x position in every customer's
        // table, regardless of that table's own content lengths.
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 30 },
          2: { cellWidth: 14 },
          3: { cellWidth: 16 },
        },
        margin: { left: 14, right: 14 },
      });

      finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDER);
      doc.line(14, 285, pageWidth - 14, 285);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_MUTED);
      doc.text('Zeiterfassung', 14, 291);
      doc.text(`Seite ${i} von ${pageCount}`, pageWidth - 14, 291, { align: 'right' });
    }

    doc.save(`Abrechnung_${fileSuffix}.pdf`);
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

    const csvContent = lines.join('\r\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Abrechnung_${fileSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handlePdfExport} disabled={exporting !== null}>
        {exporting === 'pdf' ? 'Wird exportiert...' : 'PDF exportieren'}
      </Button>
      <Button variant="secondary" onClick={handleCsvExport} disabled={exporting !== null}>
        {exporting === 'csv' ? 'Wird exportiert...' : 'CSV exportieren'}
      </Button>
    </div>
  );
};
