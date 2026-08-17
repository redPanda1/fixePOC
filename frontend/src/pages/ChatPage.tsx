import { useState, type FormEvent } from 'react';
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { SEND_MESSAGE } from '../store/chatSlice';

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const { messages, sending } = useAppSelector((state) => state.chat);
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    void dispatch(SEND_MESSAGE(trimmed));
    setDraft('');
  };

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
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Chat
      </Typography>

      <Stack spacing={2} sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
        {messages.length === 0 && (
          <Typography color="text.secondary">Send a message to get started.</Typography>
        )}
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '70%',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                bgcolor: message.role === 'user' ? 'secondary.main' : '#f0f2f5',
                color: message.role === 'user' ? 'secondary.contrastText' : 'text.primary',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
            </Paper>
            {message.status === 'sending' && (
              <Typography variant="caption" color="text.secondary">
                Sending…
              </Typography>
            )}
            {message.status === 'failed' && (
              <Chip label="Failed to send" color="error" size="small" sx={{ mt: 0.5 }} />
            )}
          </Box>
        ))}
      </Stack>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, pt: 2 }}>
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          fullWidth
          size="small"
        />
        <Button type="submit" variant="contained" color="secondary" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </Box>
    </Paper>
  );
}
