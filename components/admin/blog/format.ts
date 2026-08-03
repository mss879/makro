/**
 * `published_on` is a Postgres `date` and arrives as a bare "YYYY-MM-DD".
 *
 * Handing that string to `new Date()` parses it as UTC midnight, and any
 * local-time formatter then prints the previous day for every reader west of
 * Greenwich — the panel would show 14 June for an article dated the 15th. The
 * explicit "T00:00:00" makes it local midnight instead, which is the day the
 * admin actually typed.
 */
export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const day = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(day.getTime())) return "—";
  return day.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
