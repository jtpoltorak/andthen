/** Shows a YYYY-MM-DD day as, e.g., "November 4, 2026", without time-zone drift. */
export function releaseDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
