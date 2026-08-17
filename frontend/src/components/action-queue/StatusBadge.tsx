import { Chip } from '@mui/material';
import type { ThreadStatus } from '../../types/actionQueue';
import { AM_STATUS_LABEL, CUSTOMER_STATUS_LABEL, STATUS_COLOR } from './statusUtils';

interface StatusBadgeProps {
  status: ThreadStatus;
  variant?: 'am' | 'customer';
}

export default function StatusBadge({ status, variant = 'am' }: StatusBadgeProps) {
  const label = variant === 'customer' ? CUSTOMER_STATUS_LABEL[status] : AM_STATUS_LABEL[status];
  return <Chip size="small" color={STATUS_COLOR[status]} label={label} />;
}
