import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import PasswordField from '../components/auth/PasswordField';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { COMPLETE_NEW_PASSWORD_CHALLENGE } from '../store/authSlice';
import { validatePassword } from '../utils/password';
import logo from '../assets/fixe-logo.png';

interface NewPasswordLocationState {
  session: string;
  username: string;
  requiredAttributes: string[];
  userAttributes: Record<string, string>;
}

export default function NewPasswordPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { status, error, token } = useAppSelector((state) => state.auth);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const state = location.state as NewPasswordLocationState | null;

  if (token) {
    return <Navigate to="/" replace />;
  }

  if (!state?.session || !state?.username) {
    return <Navigate to="/login" replace />;
  }

  const { session, username, userAttributes } = state;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setValidationError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setValidationError(null);
    void dispatch(COMPLETE_NEW_PASSWORD_CHALLENGE({ username, newPassword, session }));
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper elevation={0} sx={{ p: 5, width: 400, border: '1px solid #e3e7eb' }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <img src={logo} alt="FIXE" height={40} />
          </Box>
          <Typography
            variant="h5"
            component="h1"
            sx={{ textAlign: 'center', fontWeight: 700 }}
          >
            Set a new password
          </Typography>
          {userAttributes.email && (
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              Setting a new password for {userAttributes.email}
            </Typography>
          )}
          {(validationError || error) && (
            <Alert severity="error">{validationError ?? error}</Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                fullWidth
              />
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                disabled={status === 'loading'}
                fullWidth
              >
                {status === 'loading' ? 'Setting password…' : 'Set password'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
