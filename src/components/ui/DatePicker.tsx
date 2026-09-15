'use client';

import { Select } from './Select';
import { GERMAN_MONTHS } from '@/lib/germanMonths';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
}

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

const pad2 = (n: number): string => n.toString().padStart(2, '0');

export const DatePicker = ({ value, onChange }: DatePickerProps) => {
  const now = new Date();
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = parseInt(yearStr, 10) || now.getFullYear();
  const monthIndex = (parseInt(monthStr, 10) || now.getMonth() + 1) - 1;
  const day = parseInt(dayStr, 10) || now.getDate();

  const maxDay = daysInMonth(year, monthIndex);
  const clampedDay = Math.min(day, maxDay);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);
  if (!years.includes(year)) years.unshift(year);

  const build = (y: number, mIndex: number, d: number): string => {
    const dim = daysInMonth(y, mIndex);
    return `${y}-${pad2(mIndex + 1)}-${pad2(Math.min(d, dim))}`;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={clampedDay}
        onChange={(e) => onChange(build(year, monthIndex, Number(e.target.value)))}
      >
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Select
        value={monthIndex}
        onChange={(e) => onChange(build(year, Number(e.target.value), clampedDay))}
      >
        {GERMAN_MONTHS.map((label, i) => (
          <option key={label} value={i}>
            {label}
          </option>
        ))}
      </Select>
      <Select value={year} onChange={(e) => onChange(build(Number(e.target.value), monthIndex, clampedDay))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
};
