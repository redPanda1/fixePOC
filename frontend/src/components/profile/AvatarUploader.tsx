import { useEffect, useState, type ChangeEvent } from 'react';
import { Alert, Avatar, Button, CircularProgress, Stack, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { createAvatarUploadUrl, uploadFileToPresignedUrl } from '../../apis/endpoints';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024;

interface AvatarUploaderProps {
  target: 'person' | 'organization';
  label: string;
  currentAvatarUrl: string | null;
  initials?: string;
  onUploaded: (fileUrl: string) => Promise<void> | void;
}

export default function AvatarUploader({
  target,
  label,
  currentAvatarUrl,
  initials,
  onUploaded,
}: AvatarUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('The image must be 2 MB or smaller.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const urlResult = await createAvatarUploadUrl({ target, contentType: file.type });
      if (!urlResult.ok) {
        throw new Error(urlResult.error.message);
      }
      const { upload_url: uploadUrl, file_url: fileUrl, headers } = urlResult.data;
      await uploadFileToPresignedUrl(uploadUrl, file, headers);
      await onUploaded(fileUrl);
    } catch {
      setError('The image could not be uploaded. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = previewUrl ?? currentAvatarUrl ?? undefined;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{label}</Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar src={displayUrl} sx={{ width: 64, height: 64, bgcolor: '#38d29f', color: '#132030' }}>
          {initials}
        </Avatar>
        <Button
          variant="outlined"
          component="label"
          disabled={uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileRoundedIcon />}
        >
          {uploading ? 'Uploading…' : 'Change image'}
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleFileSelected(event)}
          />
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="caption" color="text.secondary">
        JPEG, PNG, or WebP, up to 2 MB.
      </Typography>
    </Stack>
  );
}
