import { useState, type FormEvent } from 'react';
import { Box, Button, TextField } from '@mui/material';

interface MessageComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  sending?: boolean;
}

export default function MessageComposer({ onSend, disabled, sending }: MessageComposerProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setDraft('');
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, pt: 2 }}>
      <TextField
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Type a reply…"
        fullWidth
        size="small"
        disabled={disabled}
      />
      <Button type="submit" variant="contained" color="secondary" disabled={disabled || sending || !draft.trim()}>
        Send
      </Button>
    </Box>
  );
}
