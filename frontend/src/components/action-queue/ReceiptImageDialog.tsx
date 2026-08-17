import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

interface ReceiptImageDialogProps {
  open: boolean;
  url: string | null;
  label: string | null;
  onClose: () => void;
}

export default function ReceiptImageDialog({ open, url, label, onClose }: ReceiptImageDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        {label ?? 'Receipt'}
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', justifyContent: 'center', pb: 3 }}>
        {url && (
          <Box
            component="img"
            src={url}
            alt={label ?? 'Receipt'}
            sx={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 1 }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
