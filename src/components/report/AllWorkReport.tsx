'use client';

import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Button } from '@/components/ui/Button';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { ReportTable } from '@/components/report/ReportTable';
import { ExportButtons } from '@/components/report/ExportButtons';
import { buildMonthlyRows } from '@/lib/reportRows';
import { MonthlyReportRow } from '@/types';

const currentMonthValue = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Monthly report over the work for ALL customers. Overview for billing: no
// signatures (those live on single-session reports).
export const AllWorkReport = () => {
  const { customers } = useCustomers();
  const { sessionTypes } = useSessionTypes();
  const { getEntriesForMonth } = useTimeEntries();

  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [report, setReport] = useState<{ rows: MonthlyReportRow[]; year: number; month: number } | null>(
    null
  );

  const sessionTypeLabel = (id: string) => sessionTypes.find((s) => s.id === id)?.label ?? '—';

  const handleGenerate = () => {
    const [yearStr, monthStr] = monthValue.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    setReport({ rows: buildMonthlyRows(getEntriesForMonth(year, month), customers), year, month });
  };

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-1 text-lg font-bold text-text">Bericht für alle Arbeit</h2>
        <p className="mb-4 text-sm text-text-muted">Alle Kunden eines Monats in einem Bericht.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm text-text-muted">Monat</label>
            <MonthYearPicker value={monthValue} onChange={setMonthValue} />
          </div>
          <Button onClick={handleGenerate}>Bericht erstellen</Button>
        </div>
      </div>

      {report && (
        <div className="flex flex-col gap-6">
          {report.rows.length === 0 ? (
            <p className="text-sm text-text-muted">Keine Einträge für den gewählten Monat.</p>
          ) : (
            <>
              <ReportTable rows={report.rows} sessionTypeLabel={sessionTypeLabel} />
              <ExportButtons
                rows={report.rows}
                year={report.year}
                month={report.month}
                sessionTypeLabel={sessionTypeLabel}
                fileBaseName={`Abrechnung_${report.year}-${(report.month + 1).toString().padStart(2, '0')}`}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
