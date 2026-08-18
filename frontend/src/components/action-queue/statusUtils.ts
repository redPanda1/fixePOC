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

// Customer-facing color differs from STATUS_COLOR for waiting_on_internal: the
// customer isn't the one who needs to act, so it shouldn't read as a warning to them.
export const CUSTOMER_STATUS_COLOR: Record<
  ThreadStatus,
  'default' | 'info' | 'primary' | 'warning' | 'success'
> = {
  ...STATUS_COLOR,
  waiting_on_internal: 'info',
};

export const AM_STATUS_LABEL: Record<ThreadStatus, string> = {
  created: 'New',
  read: 'Read',
  waiting_on_customer: 'Waiting on Customer',
  waiting_on_internal: 'Waiting on Internal',
  complete: 'Complete',
  archived: 'Archived',
};

// waiting_on_customer means the customer needs to act ("Open"); waiting_on_internal
// means FIXE is handling it, so it gets its own label/color rather than also reading "Open".
export const CUSTOMER_STATUS_LABEL: Record<ThreadStatus, 'New' | 'Open' | 'In Review' | 'Done'> = {
  created: 'New',
  read: 'New',
  waiting_on_customer: 'Open',
  waiting_on_internal: 'In Review',
  complete: 'Done',
  archived: 'Done',
};

// "New"/"In Progress" were dropped for the POC - question|action threads are created
// already `waiting_on_customer` (the AM's first message is what creates them) and
// never pass through those states. `created`/`read` remain valid ThreadStatus values
// because agent_proposal threads still use them (see backend status.py).
export type StatusFilterKey =
  | 'in_progress'
  | 'waiting_on_customer'
  | 'waiting_on_internal'
  | 'complete';

export const FILTER_BUCKETS: { key: StatusFilterKey; label: string; statuses: ThreadStatus[] }[] = [
  {
    key: 'in_progress',
    label: 'In Progress',
    statuses: ['created', 'read', 'waiting_on_customer', 'waiting_on_internal'],
  },
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

// Only waiting_on_customer requires the customer to do something; waiting_on_internal
// stays on the uncompleted list but shouldn't trigger the "needs your attention" badge.
export function isCustomerActionNeeded(status: ThreadStatus): boolean {
  return status === 'waiting_on_customer';
}
