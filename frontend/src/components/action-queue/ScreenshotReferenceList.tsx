import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ScreenshotMonitorRoundedIcon from '@mui/icons-material/ScreenshotMonitorRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { toPng } from 'html-to-image';
import { createChatImageUploadUrl, uploadFileToPresignedUrl } from '../../apis/endpoints';
import type { ReferenceInput } from '../../types/actionQueue';
import ReceiptImageDialog from './ReceiptImageDialog';

interface ScreenshotReferenceListProps {
  orgId: string | null;
  references: ReferenceInput[];
  onAdd: (reference: ReferenceInput, previewDataUrl: string) => void;
  onRemove: (index: number) => void;
}

function isChatWidgetNode(node: HTMLElement): boolean {
  return node.dataset?.chatWidgetRoot !== undefined;
}

// Falls back to a blank image rather than failing the whole capture when a single
// image can't be re-fetched to embed (e.g. an expired presigned S3 URL that's still
// displaying fine from the browser's cache but 403s on a fresh fetch).
const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export default function ScreenshotReferenceList({
  orgId,
  references,
  onAdd,
  onRemove,
}: ScreenshotReferenceListProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  const handleCapture = async () => {
    if (!orgId) return;
    setError(null);
    setCapturing(true);
    try {
      const dataUrl = await toPng(document.body, {
        filter: (node) => !(node instanceof HTMLElement && isChatWidgetNode(node)),
        pixelRatio: 1,
        imagePlaceholder: TRANSPARENT_PIXEL,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const uploadResult = await createChatImageUploadUrl({ orgId, contentType: 'image/png' });
      if (!uploadResult.ok) {
        throw new Error(uploadResult.error.message);
      }
      const { upload_url: uploadUrl, key } = uploadResult.data;
      await uploadFileToPresignedUrl(uploadUrl, blob, { 'Content-Type': 'image/png' });
      onAdd({ type: 'screenshot', screenshotKey: key, label: `Screenshot ${references.length + 1}` }, dataUrl);
      setPreviews((prev) => [...prev, dataUrl]);
    } catch {
      setError('Could not capture screenshot. Try again.');
    } finally {
      setCapturing(false);
    }
  };

  const handleRemove = (index: number) => {
    onRemove(index);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        References
      </Typography>
      {previews.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
          {previews.map((preview, index) => (
            <Box key={index} sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={preview}
                alt={references[index]?.label ?? 'Screenshot'}
                onClick={() => setZoomedIndex(index)}
                sx={{
                  width: 56,
                  height: 56,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: '1px solid #e3e7eb',
                  cursor: 'pointer',
                }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemove(index)}
                aria-label="Remove screenshot"
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bgcolor: 'background.paper',
                  border: '1px solid #e3e7eb',
                  width: 20,
                  height: 20,
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
      <Button
        size="small"
        startIcon={capturing ? <CircularProgress size={16} /> : <ScreenshotMonitorRoundedIcon />}
        onClick={() => void handleCapture()}
        disabled={!orgId || capturing}
      >
        {capturing ? 'Capturing…' : 'Take screenshot'}
      </Button>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <ReceiptImageDialog
        open={zoomedIndex !== null}
        url={zoomedIndex !== null ? previews[zoomedIndex] : null}
        label={zoomedIndex !== null ? (references[zoomedIndex]?.label ?? 'Screenshot') : null}
        onClose={() => setZoomedIndex(null)}
      />
    </Box>
  );
}
