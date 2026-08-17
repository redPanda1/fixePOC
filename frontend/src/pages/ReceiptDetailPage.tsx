import { useEffect } from 'react';
import { Alert, Box, CircularProgress, IconButton, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import ReceiptResultPanel from '../components/receipts/ReceiptResultPanel';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchReceiptDetail } from '../store/receiptsSlice';

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const current = useAppSelector((state) => state.receipts.current);
  const detailStatus = useAppSelector((state) => state.receipts.detailStatus);
  const error = useAppSelector((state) => state.receipts.error);

  useEffect(() => {
    if (id && current?.id !== id) {
      void dispatch(fetchReceiptDetail(id));
    }
  }, [id, current?.id, dispatch]);

  const receipt = current?.id === id ? current : null;

  return (
    <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/receipts')} aria-label="Back to receipts">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Receipt
        </Typography>
      </Stack>

      {detailStatus === 'loading' && !receipt && (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

      {detailStatus === 'failed' && !receipt && <Alert severity="error">{error ?? 'Receipt could not be loaded'}</Alert>}

      {receipt && (
        <Stack spacing={4} direction={{ xs: 'column', md: 'row' }}>
          <Box
            component="img"
            src={receipt.imageAccessUrl}
            alt={receipt.originalFileName}
            sx={{
              width: { xs: '100%', md: 320 },
              maxHeight: 480,
              objectFit: 'contain',
              borderRadius: 1,
              border: '1px solid #e3e7eb',
              bgcolor: 'background.default',
            }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <ReceiptResultPanel receipt={receipt} />
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
