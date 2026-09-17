/**
 * Centralized date formatting utilities for Worker Portal (React Native)
 * All timestamps are ISO strings from the API (TIMESTAMPTZ from PostgreSQL)
 */

/**
 * Format a timestamp as "14 Sep 2026 · 11:42 AM"
 * Used for job creation, assignment, completion events
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a timestamp as "14 Sep 2026"
 * Used for dates without time emphasis (e.g., member since)
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format a timestamp as "Sep 14, 2026 at 11:42 AM"
 * Used for timeline events and detailed displays
 */
export function formatDetailedDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}

/**
 * Format preferred service date from scheduled_at
 * If time is specified, show it; otherwise show date only
 */
export function formatPreferredDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Flexible';
  
  const date = new Date(isoString);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  
  if (hasTime) {
    return formatDateTime(isoString);
  }
  return formatDate(isoString);
}

/**
 * Format relative time (e.g., "5 min ago", "2 hours ago")
 * Use for recent activity indicators
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(isoString);
}

/**
 * Format timeline event with status and timestamp
 */
export function formatTimelineEvent(status: string, isoString: string | null | undefined): string {
  const time = formatDateTime(isoString);
  const statusLabels: Record<string, string> = {
    'REQUESTED': 'Request Created',
    'ASSIGNED': 'Worker Assigned',
    'ACCEPTED': 'Worker Accepted',
    'EN_ROUTE': 'Worker En Route',
    'ARRIVED': 'Worker Arrived',
    'IN_PROGRESS': 'Work Started',
    'PAUSED': 'Work Paused',
    'WAITING_CUSTOMER': 'Awaiting Confirmation',
    'COMPLETED': 'Job Completed',
    'CANCELLED': 'Request Cancelled',
    'DISPUTED': 'Job Disputed'
  };
  
  const label = statusLabels[status] || status;
  return `${label}\n${time}`;
}