import { MaterialItem, TimeEntry } from '@/types';

// Material and Fahrt are recorded for the record only: no prices, so nothing here
// changes any total. The limits mirror the database checks (supabase/schema.sql).
export const MAX_MATERIAL_LINES = 20;
export const MAX_MATERIAL_NAME_LENGTH = 100;
export const MAX_MATERIAL_MENGE_LENGTH = 30;
export const MAX_TRAVEL_KM = 9999.9;

// Trims every line, cuts it to the allowed length and drops lines without a name.
// A line with a name but no Menge is kept (the Menge is simply empty).
export const normalizeMaterials = (items: MaterialItem[] | undefined | null): MaterialItem[] =>
  (items ?? [])
    .map((item) => ({
      name: item.name.trim().slice(0, MAX_MATERIAL_NAME_LENGTH),
      menge: item.menge.trim().slice(0, MAX_MATERIAL_MENGE_LENGTH),
    }))
    .filter((item) => item.name.length > 0)
    .slice(0, MAX_MATERIAL_LINES);

export type KmParseResult =
  | { ok: true; km: number | null } // null: field left empty
  | { ok: false; error: string };

// Accepts "12,5" and "12.5" (rounded to one decimal, as stored). Empty means no Fahrt.
export const parseKm = (text: string): KmParseResult => {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, km: null };
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) {
    return { ok: false, error: 'Bitte eine Zahl eingeben, z. B. 12,5' };
  }
  const km = Math.round(parseFloat(trimmed.replace(',', '.')) * 10) / 10;
  if (km > MAX_TRAVEL_KM) return { ok: false, error: `Maximal ${MAX_TRAVEL_KM.toString().replace('.', ',')} km` };
  return { ok: true, km };
};

// German decimal comma, like the other German number formats in the exports: "12,5 km".
export const formatKm = (km: number): string => `${km.toFixed(1).replace('.', ',')} km`;

// "Kabel Cat6 (2 Stück)", or just the name when there is no Menge.
export const formatMaterialLine = (item: MaterialItem): string =>
  item.menge ? `${item.name} (${item.menge})` : item.name;

export const hasMaterials = (entry: Pick<TimeEntry, 'materials'>): boolean =>
  (entry.materials?.length ?? 0) > 0;

export const hasTravel = (entry: Pick<TimeEntry, 'travel_km'>): boolean =>
  typeof entry.travel_km === 'number' && entry.travel_km > 0;

// Total kilometers over a list of sessions (for the "Gefahrene Kilometer" lines).
export const sumKm = (entries: Pick<TimeEntry, 'travel_km'>[]): number =>
  Math.round(entries.reduce((sum, e) => sum + (e.travel_km ?? 0), 0) * 10) / 10;

// The two read-only detail lines shown under a session ("Material: ...", "Fahrt: ...").
export const materialAndTravelLines = (
  entry: Pick<TimeEntry, 'materials' | 'travel_km'>
): string[] => {
  const lines: string[] = [];
  if (hasMaterials(entry)) lines.push(`Material: ${(entry.materials ?? []).map(formatMaterialLine).join(', ')}`);
  if (hasTravel(entry)) lines.push(`Fahrt: ${formatKm(entry.travel_km as number)}`);
  return lines;
};
