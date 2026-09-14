'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/Button';
import { MonthlyReportRow } from '@/types';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';

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

interface ExportButtonsProps {
  rows: MonthlyReportRow[];
  year: number;
  month: number;
  sessionTypeLabel: (id: string) => string;
}

export const ExportButtons = ({ rows, year, month, sessionTypeLabel }: ExportButtonsProps) => {
  const monthLabel = GERMAN_MONTHS[month];
  const fileSuffix = `${year}-${(month + 1).toString().padStart(2, '0')}`;

  const handlePdfExport = () => {
    const doc = new jsPDF();
    const createdDate = new Date().toLocaleDateString('de-DE');

    doc.setFontSize(16);
    doc.text(`Abrechnung ${monthLabel} ${year}`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Erstellt am: ${createdDate}`, 14, 25);

    autoTable(doc, {
      startY: 32,
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
          minutesToAE(rows.reduce((s, r) => s + r.total_minutes, 0)).toFixed(1),
          minutesToHHMM(rows.reduce((s, r) => s + r.total_minutes, 0)),
          '—',
          formatEUR(rows.reduce((s, r) => s + r.total_value, 0)),
        ],
      ],
      headStyles: { fillColor: [79, 142, 247] },
      styles: { fontSize: 9 },
    });

    let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    for (const row of rows) {
      if (finalY > 260) {
        doc.addPage();
        finalY = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(row.customer.name, 14, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['Datum', 'Typ', 'AE', 'hh:mm', 'Notizen']],
        body: row.entries.map((e) => [
          formatDateDDMMYYYY(e.entry_date),
          sessionTypeLabel(e.session_type_id),
          minutesToAE(e.duration_minutes).toFixed(1),
          minutesToHHMM(e.duration_minutes),
          e.notes ?? '',
        ]),
        headStyles: { fillColor: [34, 37, 53] },
        styles: { fontSize: 8 },
      });

      finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Seite ${i} von ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`Abrechnung_${fileSuffix}.pdf`);
  };

  const handleCsvExport = () => {
    const header = 'Datum;Kunde;Typ;AE;Minuten;Notizen;Satz_EUR_pro_AE;Wert_EUR';
    const lines: string[] = [header];

    for (const row of rows) {
      for (const entry of row.entries) {
        const ae = minutesToAE(entry.duration_minutes);
        const value = ae * row.customer.ae_rate;
        const notes = (entry.notes ?? '').replace(/;/g, ',').replace(/\n/g, ' ');
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
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handlePdfExport}>PDF exportieren</Button>
      <Button variant="secondary" onClick={handleCsvExport}>
        CSV exportieren
      </Button>
    </div>
  );
};
