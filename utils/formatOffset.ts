/**
 * Formats a millisecond offset from "now" into a human-readable duration string.
 *
 * < 1 hour  → "+45m"
 * < 1 day   → "+2h 15m"  (omits minutes if exactly on the hour)
 * ≥ 1 day   → "+1d 2h 15m" (omits zero components except leading sign)
 *
 * Negative values use "−" prefix.
 */
export function formatOffset(diffMs: number): string {
  const sign = diffMs >= 0 ? '+' : '−';
  const totalMin = Math.round(Math.abs(diffMs) / 60_000);

  if (totalMin === 0) return 'now';

  if (totalMin < 60) {
    return `${sign}${totalMin}m`;
  }

  const totalHours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (totalHours < 24) {
    return mins > 0
      ? `${sign}${totalHours}h ${mins}m`
      : `${sign}${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (hours === 0 && mins === 0) return `${sign}${days}d`;
  if (mins === 0) return `${sign}${days}d ${hours}h`;
  if (hours === 0) return `${sign}${days}d ${mins}m`;
  return `${sign}${days}d ${hours}h ${mins}m`;
}
