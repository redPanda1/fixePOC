import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { requestPasswordReset } from '../apis/cognitoAuth';
import logo from '../assets/fixe-logo.png';

type RequestStatus = 'idle' | 'loading' | 'failed';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setError(null);

    const trimmedUsername = username.trim();
    const result = await requestPasswordReset(trimmedUsername);
    if (!result.ok) {
      setStatus('failed');
      setError(result.error.message);
      return;
    }

    navigate('/password/confirm', { state: { username: trimmedUsername } });
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
            Forgot password
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
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
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                disabled={status === 'loading'}
                fullWidth
              >
                {status === 'loading' ? 'Sending…' : 'Send reset code'}
              </Button>
            </Stack>
          </Box>
          <Link component={RouterLink} to="/login" sx={{ textAlign: 'center' }}>
            Back to sign in
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
