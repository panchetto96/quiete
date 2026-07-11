/** Formatta una durata in minuti (anche frazionari, es. 0.5 = 30s) in una stringa leggibile. */
export function formatDuration(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  const whole = Math.floor(minutes);
  const secs = Math.round((minutes - whole) * 60);
  return secs > 0 ? `${whole} min ${secs} sec` : `${whole} min`;
}
