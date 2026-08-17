import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { ThreadSummary } from '../../types/actionQueue';
import type { OrganizationSummary } from '../../types/organization';
import StatusBadge from './StatusBadge';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface ThreadListProps {
  threads: ThreadSummary[];
  organizations: OrganizationSummary[];
  variant: 'am' | 'customer';
}

export default function ThreadList({ threads, organizations, variant }: ThreadListProps) {
  const navigate = useNavigate();
  const orgNameById = new Map(organizations.map((org) => [org.orgId, org.name]));

  if (threads.length === 0) {
    return <Typography color="text.secondary">No threads yet.</Typography>;
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Subject</TableCell>
            {variant === 'am' && <TableCell>Org</TableCell>}
            <TableCell>Last message</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {threads.map((thread) => (
            <TableRow
              key={thread.threadId}
              hover
              onClick={() => navigate(`/action-queue/${thread.threadId}`)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ fontWeight: 600 }}>{thread.subject}</TableCell>
              {variant === 'am' && <TableCell>{orgNameById.get(thread.orgId) ?? '—'}</TableCell>}
              <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {thread.lastMessagePreview ?? '—'}
              </TableCell>
              <TableCell>
                <StatusBadge status={thread.status} variant={variant} />
              </TableCell>
              <TableCell>{formatDate(thread.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
