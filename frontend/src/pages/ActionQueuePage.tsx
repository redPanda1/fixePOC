import { useEffect, useState } from 'react';
import { Button, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSearchParams } from 'react-router-dom';
import NewQuestionDialog from '../components/action-queue/NewQuestionDialog';
import ThreadList from '../components/action-queue/ThreadList';
import StatusRail from '../components/action-queue/StatusRail';
import {
  FILTER_BUCKETS,
  isCustomerThreadOpen,
  statusesForFilter,
  type StatusFilterKey,
} from '../components/action-queue/statusUtils';
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
  const [searchParams] = useSearchParams();
  const initialFilterParam = searchParams.get('filter');
  const [filter, setFilter] = useState<StatusFilterKey | null>(() => {
    const bucket = FILTER_BUCKETS.find((b) => b.key === initialFilterParam);
    if (bucket) return bucket.key;
    return initialFilterParam === 'all' ? null : 'in_progress';
  });
  const [showAllForCustomer, setShowAllForCustomer] = useState(() => initialFilterParam === 'all');
  const [newQuestionOpen, setNewQuestionOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchThreads());
  }, [dispatch]);

  useEffect(() => {
    if (isAdmin && organizationsListStatus === 'idle') {
      void dispatch(LIST_ORGANIZATIONS());
    }
  }, [dispatch, isAdmin, organizationsListStatus]);

  const visibleThreads = isAdmin
    ? filter
      ? threads.filter((thread) => statusesForFilter(filter).includes(thread.status))
      : threads
    : showAllForCustomer
      ? threads
      : threads.filter((thread) => isCustomerThreadOpen(thread.status));

  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb', flexGrow: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Action Queue
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            {!isAdmin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showAllForCustomer}
                    onChange={(event) => setShowAllForCustomer(event.target.checked)}
                  />
                }
                label="Show completed"
              />
            )}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RefreshRoundedIcon />}
              loading={listStatus === 'loading'}
              onClick={() => void dispatch(fetchThreads())}
            >
              Refresh
            </Button>
            {isAdmin && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddRoundedIcon />}
                onClick={() => setNewQuestionOpen(true)}
              >
                New question
              </Button>
            )}
          </Stack>
        </Stack>

        <ThreadList threads={visibleThreads} organizations={organizations} variant={isAdmin ? 'am' : 'customer'} />
      </Paper>

      {isAdmin && <StatusRail threads={threads} activeFilter={filter} onFilterChange={setFilter} />}

      {isAdmin && (
        <NewQuestionDialog
          open={newQuestionOpen}
          onClose={() => {
            setNewQuestionOpen(false);
            void dispatch(fetchThreads());
          }}
        />
      )}
    </Stack>
  );
}
