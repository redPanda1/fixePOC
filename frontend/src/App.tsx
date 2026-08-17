import { useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import StatusController from './components/StatusController';
import { theme } from './theme/theme';
import { router } from './routes/router';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { FETCH_CURRENT_PERSON } from './store/authSlice';

export default function App() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const person = useAppSelector((state) => state.auth.person);
  const personStatus = useAppSelector((state) => state.auth.personStatus);

  useEffect(() => {
    if (token && !person && personStatus === 'idle') {
      void dispatch(FETCH_CURRENT_PERSON());
    }
  }, [token, person, personStatus, dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
      <StatusController />
    </ThemeProvider>
  );
}
