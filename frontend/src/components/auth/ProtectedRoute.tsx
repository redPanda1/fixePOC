import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function ProtectedRoute() {
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.token));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
