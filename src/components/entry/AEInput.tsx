'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { aeToMinutes, minutesToAE, minutesToHHMM } from '@/lib/ae';

interface AEInputProps {
  minutes: number;
  onChange: (minutes: number) => void;
}

export const AEInput = ({ minutes, onChange }: AEInputProps) => {
  const [aeValue, setAeValue] = useState(minutesToAE(minutes).toString());
  const [minValue, setMinValue] = useState(minutes.toString());

  const handleAeChange = (value: string) => {
    setAeValue(value);
    const ae = parseFloat(value.replace(',', '.'));
    if (!isNaN(ae)) {
      const mins = aeToMinutes(ae);
      setMinValue(mins.toString());
      onChange(mins);
    }
  };

  const handleMinChange = (value: string) => {
    setMinValue(value);
    const mins = parseFloat(value.replace(',', '.'));
    if (!isNaN(mins)) {
      const rounded = Math.round(mins);
      setAeValue(minutesToAE(rounded).toString());
      onChange(rounded);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm text-text-muted">Dauer</label>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="number"
          step="0.1"
          min="0"
          value={aeValue}
          onChange={(e) => handleAeChange(e.target.value)}
          placeholder="AE"
          fullWidth
        />
        <Input
          type="number"
          step="1"
          min="0"
          value={minValue}
          onChange={(e) => handleMinChange(e.target.value)}
          placeholder="Minuten"
          fullWidth
        />
      </div>
      <p className="mt-1 text-xs text-text-muted">= {minutesToHHMM(minutes || 0)}</p>
    </div>
  );
};
