import { useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import PasswordField from '../components/auth/PasswordField';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { LOGIN_WITH_PASSWORD } from '../store/authSlice';
import logo from '../assets/fixe-logo.png';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error, token } = useAppSelector((state) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const outcome = await dispatch(LOGIN_WITH_PASSWORD({ username, password })).unwrap();
      if (outcome.kind === 'challenge') {
        navigate('/password/new', {
          state: {
            session: outcome.session,
            username: outcome.username,
            requiredAttributes: outcome.requiredAttributes,
            userAttributes: outcome.userAttributes,
          },
        });
      }
    } catch {
      // Rejected: state.auth.error is already populated by the LOGIN_WITH_PASSWORD reducer.
    }
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
            Sign in
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
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
                {status === 'loading' ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Box>
          <Link component={RouterLink} to="/password/forgot" sx={{ textAlign: 'center' }}>
            Forgot password?
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}
