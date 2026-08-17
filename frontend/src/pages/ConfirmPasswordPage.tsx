import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { confirmPasswordReset } from '../apis/cognitoAuth';
import OtpCodeInput from '../components/auth/OtpCodeInput';
import PasswordField from '../components/auth/PasswordField';
import { validatePassword } from '../utils/password';
import logo from '../assets/fixe-logo.png';

const CODE_LENGTH = 6;

interface ConfirmPasswordLocationState {
  username?: string;
}

type ConfirmStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export default function ConfirmPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ConfirmPasswordLocationState | null;

  const [username, setUsername] = useState(state?.username ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<ConfirmStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit reset code.`);
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setError(null);

    const result = await confirmPasswordReset(username.trim(), code, newPassword);
    if (!result.ok) {
      setStatus('failed');
      setError(result.error.message);
      return;
    }

    setStatus('succeeded');
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
            Reset password
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {status === 'succeeded' ? (
            <Stack spacing={2}>
              <Alert severity="success">Your password has been reset.</Alert>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={() => navigate('/login')}
              >
                Continue to sign in
              </Button>
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  fullWidth
                />
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                    Reset code
                  </Typography>
                  <OtpCodeInput length={CODE_LENGTH} value={code} onChange={setCode} />
                </Box>
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
                  {status === 'loading' ? 'Resetting…' : 'Reset password'}
                </Button>
              </Stack>
            </Box>
          )}
          <Link component={RouterLink} to="/password/forgot" sx={{ textAlign: 'center' }}>
            Resend code
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
