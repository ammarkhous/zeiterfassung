'use client';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { TrashIcon } from '@/components/nav/icons';
import {
  MAX_MATERIAL_LINES,
  MAX_MATERIAL_MENGE_LENGTH,
  MAX_MATERIAL_NAME_LENGTH,
} from '@/lib/materials';

// A material line while it is being edited. The id only keeps React's focus stable
// when a line in the middle is removed; it is not saved.
export interface DraftMaterial {
  id: string;
  name: string;
  menge: string;
}

export const newDraftMaterial = (): DraftMaterial => ({ id: crypto.randomUUID(), name: '', menge: '' });

interface MaterialFahrtFieldsProps {
  materials: DraftMaterial[];
  onMaterialsChange: (materials: DraftMaterial[]) => void;
  kmText: string;
  onKmTextChange: (text: string) => void;
  kmError?: string;
  disabled?: boolean;
}

// Optional extras of a session on site: material delivered or used (name and Menge,
// no prices) and the kilometers driven (Fahrt).
export const MaterialFahrtFields = ({
  materials,
  onMaterialsChange,
  kmText,
  onKmTextChange,
  kmError,
  disabled = false,
}: MaterialFahrtFieldsProps) => {
  const update = (id: string, patch: Partial<DraftMaterial>) =>
    onMaterialsChange(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div>
        <p className="mb-1 text-sm text-text-muted">Material (optional, geliefert oder verbraucht)</p>

        {materials.map((material, index) => (
          <div key={material.id} className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                fullWidth
                aria-label={`Material ${index + 1}: Bezeichnung`}
                placeholder="Bezeichnung"
                value={material.name}
                maxLength={MAX_MATERIAL_NAME_LENGTH}
                disabled={disabled}
                onChange={(e) => update(material.id, { name: e.target.value })}
              />
            </div>
            <div className="w-28 shrink-0">
              <Input
                fullWidth
                aria-label={`Material ${index + 1}: Menge`}
                placeholder="Menge"
                value={material.menge}
                maxLength={MAX_MATERIAL_MENGE_LENGTH}
                disabled={disabled}
                onChange={(e) => update(material.id, { menge: e.target.value })}
              />
            </div>
            <IconButton
              type="button"
              label="Material entfernen"
              variant="danger"
              disabled={disabled}
              onClick={() => onMaterialsChange(materials.filter((m) => m.id !== material.id))}
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </div>
        ))}

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || materials.length >= MAX_MATERIAL_LINES}
          onClick={() => onMaterialsChange([...materials, newDraftMaterial()])}
        >
          + Material hinzufügen
        </Button>
      </div>

      <Input
        label="Fahrt in km (optional)"
        inputMode="decimal"
        placeholder="z. B. 12,5"
        value={kmText}
        error={kmError}
        disabled={disabled}
        onChange={(e) => onKmTextChange(e.target.value)}
      />
    </div>
  );
};
