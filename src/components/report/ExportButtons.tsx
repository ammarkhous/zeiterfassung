'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useProfile } from '@/hooks/useProfile';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { MonthlyReportRow } from '@/types';
import { buildReportPdf } from '@/lib/pdf';
import { buildMonthlyTemplateData } from '@/lib/templateData';
import { renderWordReport } from '@/lib/wordExport';
import {
  buildGermanNotesMap,
  buildReportCsv,
  buildReportTxt,
  downloadBlob,
  downloadTextFile,
} from '@/lib/export';

interface ExportButtonsProps {
  rows: MonthlyReportRow[];
  year: number;
  month: number;
  sessionTypeLabel: (id: string) => string;
  /** File name without extension, e.g. "Abrechnung_2026-10". */
  fileBaseName: string;
  disabled?: boolean;
}

type ExportKind = 'main' | 'csv' | 'txt';

// Monthly report exports (all work, or one customer): PDF (or Word, when an admin
// uploaded a template), CSV and TXT. Signatures belong on single-session reports,
// so none are printed here.
export const ExportButtons = ({
  rows,
  year,
  month,
  sessionTypeLabel,
  fileBaseName,
  disabled = false,
}: ExportButtonsProps) => {
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const { monthly: hasTemplate } = useReportTemplates();
  const { username, email } = useProfile();
  const { showToast } = useToast();
  const technicianName = username ?? email ?? 'Techniker';

  const prepareNotes = async () => {
    const germanNotes = await buildGermanNotesMap(rows);
    return (notes: string | null) => (notes ? germanNotes.get(notes) ?? notes : '');
  };

  const handleMainExport = async () => {
    setExporting('main');
    const noteFor = await prepareNotes();

    if (hasTemplate) {
      try {
        const blob = await renderWordReport(
          'monthly',
          buildMonthlyTemplateData({ rows, year, month, sessionTypeLabel, noteFor, technicianName })
        );
        downloadBlob(blob, `${fileBaseName}.docx`);
        setExporting(null);
        return;
      } catch (err) {
        console.error('Word-Vorlage konnte nicht verwendet werden:', err);
        showToast('Die Word-Vorlage konnte nicht verwendet werden. Es wurde das Standard-PDF erstellt.', 'error');
      }
    }

    buildReportPdf(rows, year, month, sessionTypeLabel, noteFor).save(`${fileBaseName}.pdf`);
    setExporting(null);
  };

  const handleCsvExport = async () => {
    setExporting('csv');
    const noteFor = await prepareNotes();
    downloadTextFile(buildReportCsv(rows, sessionTypeLabel, noteFor), `${fileBaseName}.csv`, 'text/csv');
    setExporting(null);
  };

  const handleTxtExport = async () => {
    setExporting('txt');
    const noteFor = await prepareNotes();
    downloadTextFile(
      buildReportTxt(rows, year, month, sessionTypeLabel, noteFor),
      `${fileBaseName}.txt`,
      'text/plain'
    );
    setExporting(null);
  };

  const busy = disabled || exporting !== null;
  const mainLabel = hasTemplate ? 'Word exportieren' : 'PDF exportieren';

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleMainExport} disabled={busy}>
        {exporting === 'main' ? 'Wird exportiert...' : mainLabel}
      </Button>
      <Button variant="secondary" onClick={handleCsvExport} disabled={busy}>
        {exporting === 'csv' ? 'Wird exportiert...' : 'CSV exportieren'}
      </Button>
      <Button variant="secondary" onClick={handleTxtExport} disabled={busy}>
        {exporting === 'txt' ? 'Wird exportiert...' : 'TXT exportieren'}
      </Button>
    </div>
  );
};
