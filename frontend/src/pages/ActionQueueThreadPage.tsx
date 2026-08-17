import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatPane from '../components/action-queue/ChatPane';
import HistoryPanel from '../components/action-queue/HistoryPanel';
import MessageComposer from '../components/action-queue/MessageComposer';
import StatusBadge from '../components/action-queue/StatusBadge';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchThreadDetail,
  postMessage,
  selectThreadOption,
  transitionThreadStatus,
} from '../store/actionQueueSlice';

const TERMINAL_STATUSES = new Set(['complete', 'archived']);
const POLL_INTERVAL_MS = 3000;

export default function ActionQueueThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const person = useAppSelector((state) => state.auth.person);
  const isAdmin = person?.userType === 'ADMIN';
  const thread = useAppSelector((state) => state.actionQueue.current);
  const detailStatus = useAppSelector((state) => state.actionQueue.detailStatus);
  const actionStatus = useAppSelector((state) => state.actionQueue.actionStatus);
  const actionStatusRef = useRef(actionStatus);
  const threadStatus = thread?.status;

  useEffect(() => {
    actionStatusRef.current = actionStatus;
  }, [actionStatus]);

  useEffect(() => {
    if (threadId) {
      void dispatch(fetchThreadDetail(threadId));
    }
  }, [threadId, dispatch]);

  useEffect(() => {
    if (!threadId || !threadStatus || TERMINAL_STATUSES.has(threadStatus)) return;
    const intervalId = setInterval(() => {
      if (actionStatusRef.current !== 'loading') {
        void dispatch(fetchThreadDetail(threadId));
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [threadId, threadStatus, dispatch]);

  if (detailStatus === 'loading' && !thread) {
    return <Typography color="text.secondary">Loading…</Typography>;
  }
  if (!thread || !threadId) {
    return <Typography color="text.secondary">Thread not found.</Typography>;
  }

  const isClosed = thread.status === 'complete' || thread.status === 'archived';
  const canSelectOptions = !isAdmin && !isClosed;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        border: '1px solid #e3e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <IconButton
          size="small"
          onClick={() => navigate('/action-queue')}
          aria-label="Back to Action Queue"
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {thread.subject}
        </Typography>
        <StatusBadge status={thread.status} variant={isAdmin ? 'am' : 'customer'} />
      </Stack>

      {thread.entryType === 'agent_proposal' ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Proposal review is added in the next phase.
        </Typography>
      ) : null}

      <ChatPane
        messages={thread.messages}
        currentPersonId={person?.personId ?? ''}
        canSelectOptions={canSelectOptions}
        onSelectOption={(messageId, optionId) => {
          void dispatch(selectThreadOption({ threadId, messageId, optionId }));
        }}
      />

      {thread.entryType !== 'agent_proposal' && (
        <MessageComposer
          disabled={isClosed}
          sending={actionStatus === 'loading'}
          onSend={(content) => {
            void dispatch(postMessage({ threadId, payload: { content } }));
          }}
        />
      )}

      {isAdmin && thread.entryType !== 'agent_proposal' && !isClosed && (
        <Stack direction="row" spacing={1} sx={{ pt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() =>
              void dispatch(transitionThreadStatus({ threadId, payload: { status: 'complete' } }))
            }
          >
            Mark Complete
          </Button>
        </Stack>
      )}

      <HistoryPanel events={thread.events} />
    </Paper>
  );
}
