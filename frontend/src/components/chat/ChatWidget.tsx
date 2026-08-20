import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Fab,
  IconButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useLocation } from 'react-router-dom';
import ChatConversation from './ChatConversation';
import { useChatConversation } from './useChatConversation';
import NewQuestionForm from '../action-queue/NewQuestionForm';
import { useNewQuestionForm } from '../action-queue/useNewQuestionForm';

type WidgetMode = 'chat' | 'newQuestion';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<WidgetMode>('chat');
  const location = useLocation();
  const { messages, sending, draft, setDraft, handleSubmit } = useChatConversation();
  const newQuestionForm = useNewQuestionForm(() => {
    // Stay on the current screen — the toast (dispatched in the hook) is the only feedback needed.
  });

  if (location.pathname === '/chat') return null;

  return (
    <Box data-chat-widget-root sx={{ display: 'contents' }}>
      <Fab
        color="secondary"
        onClick={() => setOpen((o) => !o)}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        {open ? <CloseRoundedIcon /> : <ChatOutlinedIcon />}
      </Fab>

      {open && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 400,
            maxWidth: 'calc(100vw - 48px)',
            height: 560,
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e3e7eb',
            zIndex: (t) => t.zIndex.drawer + 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid #e3e7eb',
              gap: 1,
            }}
          >
            <ToggleButtonGroup
              value={mode}
              exclusive
              size="small"
              onChange={(_event, next: WidgetMode | null) => next && setMode(next)}
            >
              <ToggleButton value="chat">Chat</ToggleButton>
              <ToggleButton value="newQuestion">New question</ToggleButton>
            </ToggleButtonGroup>
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close chat">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          {mode === 'chat' ? (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', px: 2, pb: 2, minHeight: 0 }}>
              <ChatConversation
                messages={messages}
                sending={sending}
                draft={draft}
                onDraftChange={setDraft}
                onSubmit={handleSubmit}
              />
            </Box>
          ) : (
            <>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2, pt: 2, minHeight: 0 }}>
                <NewQuestionForm form={newQuestionForm} referencesMode="screenshot" />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  borderTop: '1px solid #e3e7eb',
                }}
              >
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={!newQuestionForm.canSubmit}
                  onClick={() => void newQuestionForm.handleSubmit()}
                  startIcon={
                    newQuestionForm.creating ? <CircularProgress size={16} color="inherit" /> : undefined
                  }
                >
                  {newQuestionForm.creating ? 'Creating…' : 'Create'}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
