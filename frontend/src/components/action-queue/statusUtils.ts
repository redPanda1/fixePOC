import type { ThreadStatus } from '../../types/actionQueue';

export const STATUS_COLOR: Record<
  ThreadStatus,
  'default' | 'info' | 'primary' | 'warning' | 'success'
> = {
  created: 'default',
  read: 'info',
  waiting_on_customer: 'warning',
  waiting_on_internal: 'warning',
  complete: 'success',
  archived: 'default',
};

export const AM_STATUS_LABEL: Record<ThreadStatus, string> = {
  created: 'New',
  read: 'Read',
  waiting_on_customer: 'Waiting on Customer',
  waiting_on_internal: 'Waiting on Internal',
  complete: 'Complete',
  archived: 'Archived',
};

export const CUSTOMER_STATUS_LABEL: Record<ThreadStatus, 'New' | 'Open' | 'Done'> = {
  created: 'New',
  read: 'New',
  waiting_on_customer: 'Open',
  waiting_on_internal: 'Open',
  complete: 'Done',
  archived: 'Done',
};

// "New"/"In Progress" were dropped for the POC - question|action threads are created
// already `waiting_on_customer` (the AM's first message is what creates them) and
// never pass through those states. `created`/`read` remain valid ThreadStatus values
// because agent_proposal threads still use them (see backend status.py).
export type StatusFilterKey = 'waiting_on_customer' | 'waiting_on_internal' | 'complete';

export const FILTER_BUCKETS: { key: StatusFilterKey; label: string; statuses: ThreadStatus[] }[] = [
  { key: 'waiting_on_customer', label: 'Waiting on Customer', statuses: ['waiting_on_customer'] },
  { key: 'waiting_on_internal', label: 'Waiting on Internal', statuses: ['waiting_on_internal'] },
  { key: 'complete', label: 'Complete', statuses: ['complete', 'archived'] },
];

export function statusesForFilter(key: StatusFilterKey): ThreadStatus[] {
  return FILTER_BUCKETS.find((bucket) => bucket.key === key)?.statuses ?? [];
}

const TERMINAL_STATUSES: ThreadStatus[] = ['complete', 'archived'];

export function isCustomerThreadOpen(status: ThreadStatus): boolean {
  return !TERMINAL_STATUSES.includes(status);
}
