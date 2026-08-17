import { useState } from 'react';
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { ThreadEvent } from '../../types/actionQueue';

const EVENT_LABEL: Record<ThreadEvent['eventType'], string> = {
  created: 'Created',
  status_change: 'Status changed',
  assigned: 'Assigned',
  message_added: 'Message added',
  option_selected: 'Option selected',
  verdict_rendered: 'Verdict rendered',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface HistoryPanelProps {
  events: ThreadEvent[];
}

export default function HistoryPanel({ events }: HistoryPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ borderTop: '1px solid #e3e7eb', mt: 2, pt: 1 }}>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: 'center', cursor: 'pointer', color: 'text.secondary' }}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <ExpandMoreRoundedIcon fontSize="small" /> : <ChevronRightRoundedIcon fontSize="small" />}
        <Typography variant="subtitle2">History ({events.length})</Typography>
      </Stack>
      <Collapse in={open}>
        <List dense>
          {events.map((event) => (
            <ListItem key={event.eventId} disableGutters>
              <ListItemText
                primary={`${event.actorName} — ${EVENT_LABEL[event.eventType]}`}
                secondary={
                  (event.fromValue || event.toValue
                    ? `${event.fromValue ?? '—'} → ${event.toValue ?? '—'} · `
                    : '') + formatTime(event.createdAt)
                }
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );
}
