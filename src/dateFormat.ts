/**
 * Format a Date as an ISO-style "YYYY-MM-DD" string.
 *
 * Example: formatDate(new Date(2026, 5, 8)) returns "2026-06-08".
 */
export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}