/**
 * Format a Date as an ISO-style "YYYY-MM-DD" string.
 *
 * Example: formatDate(new Date(2026, 5, 8)) should return "2026-06-08".
 *
 * 🐞 BUG B (fix me in the `fix/date-bug` worktree):
 * Date.getMonth() is zero-indexed (January is 0, June is 5), so this is off
 * by one month. formatDate(new Date(2026, 5, 8)) currently returns
 * "2026-05-08" instead of "2026-06-08".
 */
export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
