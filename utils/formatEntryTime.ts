/**
 * Formats an absolute wall-clock timestamp as a compact "day + clock time"
 * string relative to `now` — used for plan entry rows wherever a planned
 * entry's target time needs to be displayed.
 *
 * Same day       → "Today 22:30"
 * Next day       → "Tomorrow 22:30"
 * Previous day   → "Yesterday 22:30"
 * Further ahead  → "+2d 22:30"
 * Further behind → "-2d 22:30"
 */
export function formatEntryTime(targetTime: number, now: number): string {
  const d = new Date(targetTime);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hh}:${mm}`;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const entryDay = new Date(targetTime);
  entryDay.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((entryDay.getTime() - todayStart.getTime()) / 86_400_000);
  if (daysDiff === 0)  return `Today ${timeStr}`;
  if (daysDiff === 1)  return `Tomorrow ${timeStr}`;
  if (daysDiff === -1) return `Yesterday ${timeStr}`;
  if (daysDiff > 1)    return `+${daysDiff}d ${timeStr}`;
  return `${daysDiff}d ${timeStr}`;
}
