import { useEffect, useState } from 'react';
import { Button, Paper, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ReceiptHistoryTable from '../components/receipts/ReceiptHistoryTable';
import ReceiptUploadDialog from '../components/receipts/ReceiptUploadDialog';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchReceipts } from '../store/receiptsSlice';

export default function ReceiptsPage() {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const listStatus = useAppSelector((state) => state.receipts.listStatus);

  useEffect(() => {
    if (listStatus === 'idle') {
      void dispatch(fetchReceipts());
    }
  }, [dispatch, listStatus]);

  return (
    <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Receipts
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshRoundedIcon />}
            loading={listStatus === 'loading'}
            onClick={() => void dispatch(fetchReceipts())}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add receipt
          </Button>
        </Stack>
      </Stack>

      <ReceiptHistoryTable />

      <ReceiptUploadDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Paper>
  );
}
