import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { uploadReceipt } from '../../store/receiptsSlice';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 3.5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface ReceiptUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ReceiptUploadDialog({ open, onClose }: ReceiptUploadDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const uploadStatus = useAppSelector((state) => state.receipts.uploadStatus);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    setSubmitError(null);
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setValidationError(null);
    setSubmitError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setValidationError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setValidationError('The receipt image must be 3.5 MB or smaller.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setSubmitError(null);
    const dataBase64 = await fileToBase64(selectedFile);
    try {
      const receipt = await dispatch(
        uploadReceipt({
          image: {
            file_name: selectedFile.name,
            content_type: selectedFile.type as 'image/jpeg' | 'image/png' | 'image/webp',
            data_base64: dataBase64,
          },
        }),
      ).unwrap();
      resetState();
      onClose();
      navigate(`/receipt/${receipt.id}`);
    } catch {
      setSubmitError('The receipt could not be analyzed. Try again.');
    }
  };

  const uploading = uploadStatus === 'loading';

  return (
    <Dialog open={open} onClose={uploading ? undefined : handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add receipt</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Upload a receipt image to extract the vendor, total, and line items automatically.
          </Typography>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Button
              variant="outlined"
              component="label"
              disabled={uploading}
              startIcon={<UploadFileRoundedIcon />}
            >
              {selectedFile ? 'Choose a different file' : 'Choose file'}
              <input
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelected}
              />
            </Button>
            {previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                alt="Receipt preview"
                sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1, border: '1px solid #e3e7eb' }}
              />
            )}
          </Stack>

          {selectedFile && !validationError && (
            <Typography variant="caption" color="text.secondary">
              {selectedFile.name}
            </Typography>
          )}
          {validationError && <Alert severity="error">{validationError}</Alert>}
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Typography variant="caption" color="text.secondary">
            JPEG, PNG, or WebP, up to 3.5 MB.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={!selectedFile || uploading}
          onClick={() => void handleAnalyze()}
          startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {uploading ? 'Analyzing…' : 'Analyze'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
