import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function ProtectedRoute() {
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.token));
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the originally-requested path (e.g. a notification deep link into an
    // Action Queue thread) so LoginPage can return here after a successful sign-in.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
