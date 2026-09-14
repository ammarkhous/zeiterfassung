export const minutesToAE = (minutes: number): number =>
  Math.round((minutes / 10) * 10) / 10;

export const aeToMinutes = (ae: number): number => Math.round(ae * 10);

export const minutesToHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + ':' + m.toString().padStart(2, '0') + 'h';
};

export const formatAE = (minutes: number): string =>
  minutesToAE(minutes).toFixed(1) + ' AE';

export const formatAEWithHours = (minutes: number): string =>
  minutesToAE(minutes).toFixed(1) + ' AE (' + minutesToHHMM(minutes) + ')';
