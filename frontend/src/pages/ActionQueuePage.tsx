import { useEffect, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ThreadList from '../components/action-queue/ThreadList';
import StatusRail from '../components/action-queue/StatusRail';
import { statusesForFilter, type StatusFilterKey } from '../components/action-queue/statusUtils';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchThreads } from '../store/actionQueueSlice';
import { LIST_ORGANIZATIONS } from '../store/organizationSlice';

export default function ActionQueuePage() {
  const dispatch = useAppDispatch();
  const person = useAppSelector((state) => state.auth.person);
  const isAdmin = person?.userType === 'ADMIN';
  const threads = useAppSelector((state) => state.actionQueue.items);
  const listStatus = useAppSelector((state) => state.actionQueue.listStatus);
  const organizations = useAppSelector((state) => state.organization.organizations);
  const organizationsListStatus = useAppSelector((state) => state.organization.listStatus);
  const [filter, setFilter] = useState<StatusFilterKey | null>(null);

  useEffect(() => {
    void dispatch(fetchThreads());
  }, [dispatch]);

  useEffect(() => {
    if (isAdmin && organizationsListStatus === 'idle') {
      void dispatch(LIST_ORGANIZATIONS());
    }
  }, [dispatch, isAdmin, organizationsListStatus]);

  const visibleThreads = filter ? threads.filter((thread) => statusesForFilter(filter).includes(thread.status)) : threads;

  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb', flexGrow: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Action Queue
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshRoundedIcon />}
            loading={listStatus === 'loading'}
            onClick={() => void dispatch(fetchThreads())}
          >
            Refresh
          </Button>
        </Stack>

        <ThreadList threads={visibleThreads} organizations={organizations} variant={isAdmin ? 'am' : 'customer'} />
      </Paper>

      {isAdmin && <StatusRail threads={threads} activeFilter={filter} onFilterChange={setFilter} />}
    </Stack>
  );
}
