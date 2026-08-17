import { useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { removeReceipt } from '../../store/receiptsSlice';
import type { ReceiptAnalysisStatus, ReceiptSummary } from '../../types/receipts';

const STATUS_COLOR: Record<ReceiptAnalysisStatus, 'success' | 'warning' | 'error'> = {
  analyzed: 'success',
  not_receipt: 'error',
  unreadable: 'warning',
  error: 'error',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatReceiptDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ReceiptHistoryTable() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const items = useAppSelector((state) => state.receipts.items);
  const deletingId = useAppSelector((state) => state.receipts.deletingId);
  const [pendingDelete, setPendingDelete] = useState<ReceiptSummary | null>(null);

  const confirmDelete = () => {
    if (pendingDelete) {
      void dispatch(removeReceipt(pendingDelete.id));
      setPendingDelete(null);
    }
  };

  const handleDeleteClick = (event: MouseEvent, item: ReceiptSummary) => {
    event.stopPropagation();
    setPendingDelete(item);
  };

  if (items.length === 0) {
    return <Typography color="text.secondary">No receipts uploaded yet.</Typography>;
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Vendor</TableCell>
              <TableCell>Receipt date</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                hover
                onClick={() => navigate(`/receipt/${item.id}`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ width: 56 }}>
                  {item.thumbnailAccessUrl ? (
                    <Box
                      component="img"
                      src={item.thumbnailAccessUrl}
                      alt=""
                      sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, border: '1px solid #e3e7eb' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        border: '1px solid #e3e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <ReceiptLongOutlinedIcon fontSize="small" />
                    </Box>
                  )}
                </TableCell>
                <TableCell>{item.vendor ?? item.originalFileName}</TableCell>
                <TableCell>{formatReceiptDate(item.receiptDate)}</TableCell>
                <TableCell align="right">
                  {item.totalAmount ? `${item.totalAmount}${item.currency ? ` ${item.currency}` : ''}` : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={STATUS_COLOR[item.analysisStatus]}
                    label={item.analysisStatus.replace('_', ' ')}
                  />
                </TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    disabled={deletingId === item.id}
                    onClick={(event) => handleDeleteClick(event, item)}
                    aria-label="Delete receipt"
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete receipt?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently remove {pendingDelete?.vendor ?? pendingDelete?.originalFileName ?? 'this receipt'}{' '}
            from your history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
