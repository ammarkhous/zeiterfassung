'use client';

import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useSessionTypes } from '@/hooks/useSessionTypes';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Button } from '@/components/ui/Button';
import { MonthYearPicker } from '@/components/ui/MonthYearPicker';
import { ReportTable } from '@/components/report/ReportTable';
import { ExportButtons } from '@/components/report/ExportButtons';
import { minutesToAE } from '@/lib/ae';
import { MonthlyReportRow } from '@/types';

const currentMonthValue = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function ReportPage() {
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

    const entries = getEntriesForMonth(year, month);
    const byCustomer = new Map<string, typeof entries>();
    for (const e of entries) {
      const list = byCustomer.get(e.customer_id) ?? [];
      list.push(e);
      byCustomer.set(e.customer_id, list);
    }

    const rows: MonthlyReportRow[] = Array.from(byCustomer.entries())
      .map(([customerId, custEntries]) => {
        const customer = customers.find((c) => c.id === customerId);
        if (!customer) return null;
        const total_minutes = custEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
        const total_ae = minutesToAE(total_minutes);
        return {
          customer,
          entries: custEntries,
          total_minutes,
          total_ae,
          total_value: total_ae * customer.ae_rate,
        };
      })
      .filter((r): r is MonthlyReportRow => r !== null)
      .sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'de'));

    setReport({ rows, year, month });
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-text">Monatsreport</h1>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Monat</label>
          <MonthYearPicker value={monthValue} onChange={setMonthValue} />
        </div>
        <Button onClick={handleGenerate}>Bericht erstellen</Button>
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
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
