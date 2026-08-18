import { Chip } from '@mui/material';
import type { ThreadStatus } from '../../types/actionQueue';
import {
  AM_STATUS_LABEL,
  CUSTOMER_STATUS_COLOR,
  CUSTOMER_STATUS_LABEL,
  STATUS_COLOR,
} from './statusUtils';

interface StatusBadgeProps {
  status: ThreadStatus;
  variant?: 'am' | 'customer';
}

export default function StatusBadge({ status, variant = 'am' }: StatusBadgeProps) {
  const label = variant === 'customer' ? CUSTOMER_STATUS_LABEL[status] : AM_STATUS_LABEL[status];
  const color = variant === 'customer' ? CUSTOMER_STATUS_COLOR[status] : STATUS_COLOR[status];
  return <Chip size="small" color={color} label={label} />;
}
