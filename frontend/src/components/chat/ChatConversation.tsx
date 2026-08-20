import type { FormEvent } from 'react';
import { Box, Button, Chip, Paper, Stack, TextField, Typography, type SxProps, type Theme } from '@mui/material';
import type { ChatMessage } from '../../store/chatSlice';

interface ChatConversationProps {
  messages: ChatMessage[];
  sending: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  containerSx?: SxProps<Theme>;
}

export default function ChatConversation({
  messages,
  sending,
  draft,
  onDraftChange,
  onSubmit,
  containerSx,
}: ChatConversationProps) {
  return (
    <>
      <Stack spacing={2} sx={{ flexGrow: 1, overflowY: 'auto', py: 2, ...containerSx }}>
        {messages.length === 0 && (
          <Typography color="text.secondary">Ask the FIXE Agent anything...</Typography>
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

      <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', gap: 1, pt: 2 }}>
        <TextField
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Type a message…"
          fullWidth
          size="small"
        />
        <Button type="submit" variant="contained" color="secondary" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </Box>
    </>
  );
}
