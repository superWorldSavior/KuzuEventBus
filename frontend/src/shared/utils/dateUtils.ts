/**
 * Date formatting utilities
 */

/**
 * Format a date string to a human-readable relative time
 * @param dateStr ISO date string
 * @returns Formatted string (e.g., "now", "2h", "3d", "Jan 15")
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Normalize timestamp for API calls (convert +00:00 to Z)
 */
export function normalizeTimestamp(ts: string): string {
  return ts.endsWith('+00:00') ? ts.replace('+00:00', 'Z') : ts;
}
