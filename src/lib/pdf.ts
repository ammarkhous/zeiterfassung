import jsPDF from 'jspdf';
import autoTable, { CellDef, CellHookData } from 'jspdf-autotable';
import { MonthlyReportRow } from '@/types';
import { minutesToAE, minutesToHHMM } from '@/lib/ae';
import { GERMAN_MONTHS } from '@/lib/germanMonths';
import { formatDateDDMMYYYY, formatEUR } from '@/lib/export';

const ACCENT: [number, number, number] = [31, 58, 46]; // #1F3A2E
const LIME: [number, number, number] = [169, 217, 119]; // #A9D977
const LIME_DIM: [number, number, number] = [238, 248, 226]; // #EEF8E2
const SURFACE_2: [number, number, number] = [238, 240, 233]; // #EEF0E9
const BORDER: [number, number, number] = [226, 229, 218]; // #E2E5DA
const TEXT: [number, number, number] = [22, 35, 28]; // #16231C
const TEXT_MUTED: [number, number, number] = [108, 117, 104]; // #6C7568

// Per-session table: the Notizen column takes whatever the four fixed columns leave.
const PAGE_MARGIN = 14;
const FIXED_COLUMNS_WIDTH = 22 + 30 + 14 + 16;
const CELL_PADDING = 3;
const NOTES_FONT_SIZE = 8;
const LINE_HEIGHT_FACTOR = 1.15;
const MM_PER_PT = 25.4 / 72;
const NOTES_LINE_HEIGHT = NOTES_FONT_SIZE * LINE_HEIGHT_FACTOR * MM_PER_PT;

// Signatures are stored as 3:1 PNGs (see SignaturePad), drawn at this size.
const SIGNATURE_WIDTH = 36;
const SIGNATURE_HEIGHT = 12;
const SIGNATURE_LABEL_HEIGHT = 4;
const SIGNATURE_AREA_HEIGHT = SIGNATURE_LABEL_HEIGHT + SIGNATURE_HEIGHT + 1;

interface SignatureCellData {
  technician: string | null;
  customer: string | null;
  signedAt: string | null;
}

type SignedNotesCell = CellDef & { signatures: SignatureCellData };

const lastTableBottom = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

// Draws one party's signature (or a note that there is none) into the notes cell.
const drawSignature = (
  doc: jsPDF,
  label: string,
  dataUrl: string | null,
  x: number,
  y: number
): void => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(label, x, y + 2.6);

  const imageY = y + SIGNATURE_LABEL_HEIGHT;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(x, imageY + SIGNATURE_HEIGHT, x + SIGNATURE_WIDTH, imageY + SIGNATURE_HEIGHT);

  if (!dataUrl) {
    doc.text('keine Unterschrift', x, imageY + SIGNATURE_HEIGHT - 4);
    return;
  }
  try {
    doc.addImage(dataUrl, 'PNG', x, imageY, SIGNATURE_WIDTH, SIGNATURE_HEIGHT);
  } catch {
    // A damaged image must never break the whole export.
    doc.text('Unterschrift nicht lesbar', x, imageY + SIGNATURE_HEIGHT - 4);
  }
};

const drawSignatureArea = (doc: jsPDF, data: CellHookData, signatures: SignatureCellData): void => {
  const { x, y, width, height } = data.cell;
  const top = y + height - SIGNATURE_AREA_HEIGHT - 1;
  const left = x + CELL_PADDING;

  drawSignature(doc, 'Techniker', signatures.technician, left, top);
  drawSignature(doc, 'Kunde', signatures.customer, left + SIGNATURE_WIDTH + 4, top);

  if (signatures.signedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    const date = new Date(signatures.signedAt).toLocaleDateString('de-DE');
    doc.text(['Unterschrieben', `am ${date}`], x + width - CELL_PADDING, top + 2.6, {
      align: 'right',
    });
  }
};

export const buildReportPdf = (
  rows: MonthlyReportRow[],
  year: number,
  month: number,
  sessionTypeLabel: (id: string) => string,
  noteFor: (notes: string | null) => string
): jsPDF => {
  const monthLabel = GERMAN_MONTHS[month];
  // compress: signature images would otherwise be embedded as raw pixels (MBs).
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const notesTextWidth = pageWidth - 2 * PAGE_MARGIN - FIXED_COLUMNS_WIDTH - 2 * CELL_PADDING;
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

  let finalY = lastTableBottom(doc) + 12;

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

    // Wrapping uses the same font settings as the table body, so the line count
    // matches what autoTable will lay out.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(NOTES_FONT_SIZE);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Datum', 'Typ', 'AE', 'hh:mm', 'Notizen']],
      body: row.entries.map((e) => {
        const note = noteFor(e.notes);
        let notesCell: string | SignedNotesCell = note;

        // A signed session keeps its signatures in the same table row (one row can
        // never be split across a page), so the row is made tall enough for the
        // note text plus the signature area underneath it.
        if (e.technician_signature || e.customer_signature) {
          const noteLines = note ? doc.splitTextToSize(note, notesTextWidth).length : 0;
          notesCell = {
            content: note,
            styles: {
              minCellHeight:
                CELL_PADDING + noteLines * NOTES_LINE_HEIGHT + SIGNATURE_AREA_HEIGHT + 2 + CELL_PADDING,
            },
            signatures: {
              technician: e.technician_signature ?? null,
              customer: e.customer_signature ?? null,
              signedAt: e.signed_at ?? null,
            },
          };
        }

        return [
          formatDateDDMMYYYY(e.entry_date),
          sessionTypeLabel(e.session_type_id),
          minutesToAE(e.duration_minutes).toFixed(1),
          minutesToHHMM(e.duration_minutes),
          notesCell,
        ];
      }),
      theme: 'grid',
      rowPageBreak: 'avoid',
      headStyles: { fillColor: SURFACE_2, textColor: TEXT, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      styles: {
        fontSize: NOTES_FONT_SIZE,
        textColor: TEXT,
        lineColor: BORDER,
        lineWidth: 0.2,
        cellPadding: CELL_PADDING,
      },
      // Fixed widths for every column except Notizen (which fills the rest) so
      // the Notizen column starts at the same x position in every customer's
      // table, regardless of that table's own content lengths.
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 30 },
        2: { cellWidth: 14 },
        3: { cellWidth: 16 },
      },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      didDrawCell: (data) => {
        if (data.section !== 'body') return;
        const signatures = (data.cell.raw as Partial<SignedNotesCell> | null)?.signatures;
        if (signatures) drawSignatureArea(doc, data, signatures);
      },
    });

    finalY = lastTableBottom(doc) + 14;
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

  return doc;
};
