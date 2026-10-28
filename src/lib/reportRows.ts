import { Customer, MonthlyReportRow, TimeEntry } from '@/types';
import { minutesToAE } from '@/lib/ae';

// Groups entries by customer into report rows (totals, value at the customer's
// current AE rate), sorted by customer name. Entries of unknown customers are
// left out. Shared by the all-work report and the per-customer report so both
// always show the same numbers.
export const buildMonthlyRows = (
  entries: TimeEntry[],
  customers: Customer[]
): MonthlyReportRow[] => {
  const byCustomer = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const list = byCustomer.get(entry.customer_id) ?? [];
    list.push(entry);
    byCustomer.set(entry.customer_id, list);
  }

  return Array.from(byCustomer.entries())
    .map(([customerId, customerEntries]): MonthlyReportRow | null => {
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) return null;
      const total_minutes = customerEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
      const total_ae = minutesToAE(total_minutes);
      return {
        customer,
        entries: customerEntries,
        total_minutes,
        total_ae,
        total_value: total_ae * customer.ae_rate,
      };
    })
    .filter((row): row is MonthlyReportRow => row !== null)
    .sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'de'));
};

// A report with a single session, so single-session exports can reuse the
// CSV builder (and the same numbers) of the monthly reports.
export const buildSessionRow = (entry: TimeEntry, customer: Customer): MonthlyReportRow => {
  const total_ae = minutesToAE(entry.duration_minutes);
  return {
    customer,
    entries: [entry],
    total_minutes: entry.duration_minutes,
    total_ae,
    total_value: total_ae * customer.ae_rate,
  };
};
