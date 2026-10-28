'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { Customer, TimeEntry } from '@/types';
import { buildSessionPdf } from '@/lib/pdf';
import { buildSessionRow } from '@/lib/reportRows';
import { buildSessionTemplateData } from '@/lib/templateData';
import { renderWordReport } from '@/lib/wordExport';
import {
  buildGermanNotesMap,
  buildReportCsv,
  buildSessionTxt,
  downloadBlob,
  downloadTextFile,
  sessionFileBaseName,
} from '@/lib/export';

interface SessionExportButtonsProps {
  entry: TimeEntry;
  customer: Customer;
  sessionTypeLabel: string;
  technicianName: string;
}

type ExportKind = 'main' | 'csv' | 'txt';

// Exports of ONE session: PDF with both signatures when present (or Word, when an
// admin uploaded a session template), CSV and TXT.
export const SessionExportButtons = ({
  entry,
  customer,
  sessionTypeLabel,
  technicianName,
}: SessionExportButtonsProps) => {
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const { session: hasTemplate } = useReportTemplates();
  const { showToast } = useToast();
  const baseName = sessionFileBaseName(entry, customer.name);
  const row = buildSessionRow(entry, customer);

  // Same German-note handling as the monthly exports.
  const germanNote = async (): Promise<string> => {
    if (!entry.notes) return '';
    const map = await buildGermanNotesMap([row]);
    return map.get(entry.notes) ?? entry.notes;
  };

  const run = async (kind: ExportKind, build: (note: string) => void | Promise<void>) => {
    setExporting(kind);
    await build(await germanNote());
    setExporting(null);
  };

  const handleMain = () =>
    run('main', async (note) => {
      if (hasTemplate) {
        try {
          const blob = await renderWordReport(
            'session',
            buildSessionTemplateData({
              entry,
              customer,
              sessionTypeLabel,
              technicianName,
              noteText: note,
            })
          );
          downloadBlob(blob, `${baseName}.docx`);
          return;
        } catch (err) {
          console.error('Word-Vorlage konnte nicht verwendet werden:', err);
          showToast('Die Word-Vorlage konnte nicht verwendet werden. Es wurde das Standard-PDF erstellt.', 'error');
        }
      }
      buildSessionPdf(entry, customer, sessionTypeLabel, technicianName, note).save(`${baseName}.pdf`);
    });

  const handleCsv = () =>
    run('csv', (note) =>
      downloadTextFile(
        buildReportCsv([row], () => sessionTypeLabel, () => note),
        `${baseName}.csv`,
        'text/csv'
      )
    );

  const handleTxt = () =>
    run('txt', (note) =>
      downloadTextFile(
        buildSessionTxt({ ...entry, notes: note || null }, customer.name, sessionTypeLabel, technicianName),
        `${baseName}.txt`,
        'text/plain'
      )
    );

  const busy = exporting !== null;
  const label = (kind: ExportKind, text: string) => (exporting === kind ? '...' : text);
  const mainName = hasTemplate ? 'Word' : 'PDF';

  return (
    <div className="flex shrink-0 gap-1.5">
      <Button
        size="sm"
        onClick={handleMain}
        disabled={busy}
        aria-label={`Session als ${mainName} exportieren`}
      >
        {label('main', mainName)}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleCsv}
        disabled={busy}
        aria-label="Session als CSV exportieren"
      >
        {label('csv', 'CSV')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleTxt}
        disabled={busy}
        aria-label="Session als TXT exportieren"
      >
        {label('txt', 'TXT')}
      </Button>
    </div>
  );
};
