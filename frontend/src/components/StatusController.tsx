import { Alert, Backdrop, CircularProgress, Snackbar, Typography } from '@mui/material';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { CLOSE_MESSAGE } from '../store/statusSlice';

const SEVERITY_MAP = {
  ERROR: 'error',
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
} as const;

export default function StatusController() {
  const dispatch = useAppDispatch();
  const message = useAppSelector((state) => state.status.message);
  const loading = useAppSelector((state) => state.status.loading);

  function handleClose(_event: React.SyntheticEvent | Event, reason?: string) {
    if (reason === 'clickaway') return;
    dispatch(CLOSE_MESSAGE());
  }

  return (
    <>
      <Snackbar
        open={message !== null}
        autoHideDuration={4200}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {message ? (
          <Alert
            severity={SEVERITY_MAP[message.type]}
            onClose={handleClose}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {message.text}
          </Alert>
        ) : undefined}
      </Snackbar>

      <Backdrop
        open={loading.active && loading.showBackdrop}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1, flexDirection: 'column', gap: 2 }}
      >
        <CircularProgress color="inherit" />
        {loading.backdropMessage ? (
          <Typography variant="body2" color="inherit">
            {loading.backdropMessage}
          </Typography>
        ) : null}
      </Backdrop>
    </>
  );
}
