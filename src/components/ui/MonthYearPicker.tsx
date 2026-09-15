'use client';

import { Select } from './Select';
import { GERMAN_MONTHS } from '@/lib/germanMonths';

interface MonthYearPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  yearsBack?: number;
  yearsForward?: number;
}

export const MonthYearPicker = ({
  value,
  onChange,
  yearsBack = 3,
  yearsForward = 1,
}: MonthYearPickerProps) => {
  const [yearStr, monthStr] = value.split('-');
  const currentYear = new Date().getFullYear();
  const year = parseInt(yearStr, 10) || currentYear;
  const monthIndex = (parseInt(monthStr, 10) || 1) - 1;

  const years = Array.from(
    { length: yearsBack + yearsForward + 1 },
    (_, i) => currentYear - yearsBack + i
  );
  if (!years.includes(year)) years.unshift(year);

  const buildValue = (y: number, mIndex: number) => `${y}-${(mIndex + 1).toString().padStart(2, '0')}`;

  return (
    <div className="flex gap-2">
      <Select
        value={monthIndex}
        onChange={(e) => onChange(buildValue(year, Number(e.target.value)))}
      >
        {GERMAN_MONTHS.map((label, i) => (
          <option key={label} value={i}>
            {label}
          </option>
        ))}
      </Select>
      <Select value={year} onChange={(e) => onChange(buildValue(Number(e.target.value), monthIndex))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
};
