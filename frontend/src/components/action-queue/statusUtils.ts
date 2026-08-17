import type { ThreadStatus } from '../../types/actionQueue';

export const STATUS_COLOR: Record<ThreadStatus, 'default' | 'info' | 'primary' | 'warning' | 'success'> = {
  created: 'default',
  read: 'info',
  in_progress: 'primary',
  waiting_on_customer: 'warning',
  waiting_on_internal: 'warning',
  complete: 'success',
  archived: 'default',
};

export const AM_STATUS_LABEL: Record<ThreadStatus, string> = {
  created: 'New',
  read: 'Read',
  in_progress: 'In Progress',
  waiting_on_customer: 'Waiting on Customer',
  waiting_on_internal: 'Waiting on Internal',
  complete: 'Complete',
  archived: 'Archived',
};

export const CUSTOMER_STATUS_LABEL: Record<ThreadStatus, 'New' | 'Open' | 'Done'> = {
  created: 'New',
  read: 'New',
  in_progress: 'Open',
  waiting_on_customer: 'Open',
  waiting_on_internal: 'Open',
  complete: 'Done',
  archived: 'Done',
};

export type StatusFilterKey = 'new' | 'in_progress' | 'waiting_on_customer' | 'waiting_on_internal' | 'complete';

export const FILTER_BUCKETS: { key: StatusFilterKey; label: string; statuses: ThreadStatus[] }[] = [
  { key: 'new', label: 'New', statuses: ['created', 'read'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'] },
  { key: 'waiting_on_customer', label: 'Waiting on Customer', statuses: ['waiting_on_customer'] },
  { key: 'waiting_on_internal', label: 'Waiting on Internal', statuses: ['waiting_on_internal'] },
  { key: 'complete', label: 'Complete', statuses: ['complete', 'archived'] },
];

export function statusesForFilter(key: StatusFilterKey): ThreadStatus[] {
  return FILTER_BUCKETS.find((bucket) => bucket.key === key)?.statuses ?? [];
}
