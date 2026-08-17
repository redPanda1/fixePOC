import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchPickerReceipts } from '../../store/actionQueueSlice';
import type { ReferenceInput } from '../../types/actionQueue';

interface ReferencePickerDialogProps {
  open: boolean;
  orgId: string | null;
  onClose: () => void;
  onSelect: (reference: ReferenceInput) => void;
}

export default function ReferencePickerDialog({ open, orgId, onClose, onSelect }: ReferencePickerDialogProps) {
  const dispatch = useAppDispatch();
  const receipts = useAppSelector((state) => state.actionQueue.pickerReceipts);
  const receiptsStatus = useAppSelector((state) => state.actionQueue.pickerReceiptsStatus);
  const [tab, setTab] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  useEffect(() => {
    if (open && orgId) {
      void dispatch(fetchPickerReceipts(orgId));
    }
  }, [open, orgId, dispatch]);

  const handleClose = () => {
    setLinkUrl('');
    setLinkLabel('');
    setTab(0);
    onClose();
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    onSelect({ type: 'link', url: linkUrl.trim(), label: linkLabel.trim() || undefined });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add reference</DialogTitle>
      <Tabs value={tab} onChange={(_event, value: number) => setTab(value)} sx={{ px: 3 }}>
        <Tab label="Existing receipt" />
        <Tab label="Paste URL" />
      </Tabs>
      <DialogContent>
        {tab === 0 &&
          (receiptsStatus === 'loading' ? (
            <Typography color="text.secondary">Loading receipts…</Typography>
          ) : receipts.length === 0 ? (
            <Typography color="text.secondary">This customer has no receipts yet.</Typography>
          ) : (
            <Grid container spacing={1.5}>
              {receipts.map((receipt) => (
                <Grid key={receipt.receiptId} size={4}>
                  <Box
                    onClick={() => {
                      onSelect({
                        type: 'receipt',
                        receiptId: receipt.receiptId,
                        personId: receipt.personId,
                        label: receipt.vendor ?? receipt.originalFileName,
                      });
                      handleClose();
                    }}
                    sx={{
                      cursor: 'pointer',
                      border: '1px solid #e3e7eb',
                      borderRadius: 1,
                      p: 1,
                      textAlign: 'center',
                      '&:hover': { borderColor: 'secondary.main' },
                    }}
                  >
                    {receipt.thumbnailAccessUrl ? (
                      <Box
                        component="img"
                        src={receipt.thumbnailAccessUrl}
                        alt=""
                        sx={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ) : (
                      <Box sx={{ height: 72 }} />
                    )}
                    <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.5 }}>
                      {receipt.vendor ?? receipt.originalFileName}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ))}

        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="URL"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Label (optional)"
              value={linkLabel}
              onChange={(event) => setLinkLabel(event.target.value)}
              fullWidth
              size="small"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        {tab === 1 && (
          <Button variant="contained" color="secondary" disabled={!linkUrl.trim()} onClick={handleAddLink}>
            Add link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
