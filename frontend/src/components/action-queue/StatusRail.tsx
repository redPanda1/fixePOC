import { Box, List, ListItemButton, ListItemText, Paper, Typography } from '@mui/material';
import type { ThreadSummary } from '../../types/actionQueue';
import { FILTER_BUCKETS, type StatusFilterKey } from './statusUtils';

interface StatusRailProps {
  threads: ThreadSummary[];
  activeFilter: StatusFilterKey | null;
  onFilterChange: (filter: StatusFilterKey | null) => void;
}

export default function StatusRail({ threads, activeFilter, onFilterChange }: StatusRailProps) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e3e7eb', minWidth: 220 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, px: 1 }}>
        Status
      </Typography>
      <List dense disablePadding>
        {FILTER_BUCKETS.map((bucket) => {
          const count = threads.filter((thread) => bucket.statuses.includes(thread.status)).length;
          const active = activeFilter === bucket.key;
          return (
            <ListItemButton
              key={bucket.key}
              selected={active}
              onClick={() => onFilterChange(active ? null : bucket.key)}
              sx={{ borderRadius: 1.5, mb: 0.5 }}
            >
              <ListItemText primary={bucket.label} />
              <Box
                sx={{
                  minWidth: 24,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: active ? 'secondary.main' : 'text.secondary',
                }}
              >
                {count}
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
