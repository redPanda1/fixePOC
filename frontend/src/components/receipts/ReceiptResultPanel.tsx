import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReceiptAnalysisStatus, ReceiptRecord } from '../../types/receipts';

const STATUS_META: Record<ReceiptAnalysisStatus, { severity: 'success' | 'warning' | 'error'; label: string }> = {
  analyzed: { severity: 'success', label: 'Analyzed' },
  not_receipt: { severity: 'error', label: 'Not a receipt' },
  unreadable: { severity: 'warning', label: 'Unreadable' },
  error: { severity: 'error', label: 'Analysis failed' },
};

function formatReceiptDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCurrency(amount: string | null, currency: string | null): string {
  if (amount === null) return '—';
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return amount;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency ?? 'USD' }).format(numeric);
  } catch {
    return `${amount}${currency ? ` ${currency}` : ''}`;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function ReceiptResultPanel({ receipt }: { receipt: ReceiptRecord }) {
  const meta = STATUS_META[receipt.analysisStatus];
  const isAnalyzed = receipt.analysisStatus === 'analyzed';

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Result
      </Typography>

      {!isAnalyzed && <Alert severity={meta.severity}>{receipt.analysisError?.message ?? meta.label}</Alert>}

      {isAnalyzed && (
        <>
          <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Detail label="Vendor" value={receipt.vendor ?? '—'} />
            <Detail label="Receipt date" value={formatReceiptDate(receipt.receiptDate)} />
            <Detail label="Total" value={formatCurrency(receipt.totalAmount, receipt.currency)} />
            <Detail label="Currency" value={receipt.currency ?? '—'} />
            <Detail
              label="Confidence"
              value={receipt.confidence !== null ? `${Math.round(receipt.confidence * 100)}%` : '—'}
            />
            <Detail label="Model" value={receipt.modelId ?? '—'} />
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit cost</TableCell>
                  <TableCell align="right">Line total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipt.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.quantity ?? '—'}</TableCell>
                    <TableCell align="right">{item.unitCost ?? '—'}</TableCell>
                    <TableCell align="right">{item.lineTotal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {receipt.analysisAttempts.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Model attempts
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {receipt.analysisAttempts.map((attempt, index) => (
              <Chip
                key={index}
                size="small"
                label={`${attempt.modelId} · ${attempt.outcome}${
                  attempt.confidence !== undefined ? ` (${Math.round(attempt.confidence * 100)}%)` : ''
                }`}
              />
            ))}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
