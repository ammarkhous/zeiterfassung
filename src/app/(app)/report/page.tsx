'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { AllWorkReport } from '@/components/report/AllWorkReport';
import { CustomerReports } from '@/components/report/CustomerReports';

type Tab = 'all' | 'customer';

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Alle Arbeit' },
  { id: 'customer', label: 'Pro Kunde' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('all');

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Bereit für Ihren Kunden
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text">Reports</h1>
        </div>
        <Badge variant="success">DE · Deutsches PDF</Badge>
      </div>

      <div className="mb-6 flex gap-1" role="tablist" aria-label="Report-Art">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-out',
              tab === item.id
                ? 'bg-accent-dim text-accent'
                : 'text-text-muted hover:bg-surface-2 hover:text-text',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'all' ? <AllWorkReport /> : <CustomerReports />}
    </div>
  );
}
