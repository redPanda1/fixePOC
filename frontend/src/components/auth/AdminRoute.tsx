import { Box, CircularProgress } from '@mui/material';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import ChatWidget from '../chat/ChatWidget';

export default function AdminRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const person = useAppSelector((state) => state.auth.person);
  const personStatus = useAppSelector((state) => state.auth.personStatus);

  if (token && !person && personStatus !== 'failed') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (person?.userType !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <ChatWidget />
      <Outlet />
    </>
  );
}
