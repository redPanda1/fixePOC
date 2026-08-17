import { useState } from 'react';
import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import type { ThreadMessage } from '../../types/actionQueue';
import ReceiptImageDialog from './ReceiptImageDialog';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface ChatPaneProps {
  messages: ThreadMessage[];
  currentPersonId: string;
  canSelectOptions: boolean;
  onSelectOption?: (messageId: string, optionId: string) => void;
}

export default function ChatPane({
  messages,
  currentPersonId,
  canSelectOptions,
  onSelectOption,
}: ChatPaneProps) {
  const [zoomedImage, setZoomedImage] = useState<{
    url: string | null;
    label: string | null;
  } | null>(null);

  if (messages.length === 0) {
    return <Typography color="text.secondary">No messages yet.</Typography>;
  }

  return (
    <>
      <Stack spacing={2} sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        {messages.map((message) => {
          if (message.messageType === 'system') {
            return (
              <Box key={message.messageId} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {message.content}
                </Typography>
              </Box>
            );
          }

          const isOwn = message.author === currentPersonId;
          const canAnswerThis = canSelectOptions && !isOwn && message.selectedOptionId === null;

          return (
            <Box
              key={message.messageId}
              sx={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', maxWidth: '75%' }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.25 }}
              >
                {message.authorName}
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: isOwn ? 'secondary.main' : '#f0f2f5',
                  color: isOwn ? 'secondary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>

                {message.references.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {message.references.map((ref, index) =>
                      ref.type === 'receipt' ? (
                        <Box
                          key={index}
                          component="img"
                          src={ref.thumbnailUrl ?? ref.url ?? undefined}
                          alt={ref.label ?? 'Receipt'}
                          onClick={() => setZoomedImage({ url: ref.url, label: ref.label })}
                          sx={{
                            width: 56,
                            height: 56,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid #e3e7eb',
                            cursor: 'pointer',
                          }}
                        />
                      ) : (
                        <Link
                          key={index}
                          href={ref.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          variant="body2"
                        >
                          {ref.label ?? ref.url}
                        </Link>
                      ),
                    )}
                  </Stack>
                )}
              </Paper>

              {message.options.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {message.options.map((option) => {
                    const selected = message.selectedOptionId === option.id;
                    return (
                      <Chip
                        key={option.id}
                        label={option.label}
                        color={selected ? 'secondary' : 'default'}
                        variant={selected ? 'filled' : 'outlined'}
                        clickable={canAnswerThis}
                        onClick={
                          canAnswerThis
                            ? () => onSelectOption?.(message.messageId, option.id)
                            : undefined
                        }
                      />
                    );
                  })}
                </Stack>
              )}
              {message.selectedByName && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Answered by {message.selectedByName}
                </Typography>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.25 }}
              >
                {formatTime(message.createdAt)}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      <ReceiptImageDialog
        open={zoomedImage !== null}
        url={zoomedImage?.url ?? null}
        label={zoomedImage?.label ?? null}
        onClose={() => setZoomedImage(null)}
      />
    </>
  );
}
