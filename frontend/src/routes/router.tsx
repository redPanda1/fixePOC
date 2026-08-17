import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import AdminRoute from '../components/auth/AdminRoute';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import ActionQueuePage from '../pages/ActionQueuePage';
import ActionQueueThreadPage from '../pages/ActionQueueThreadPage';
import ChatPage from '../pages/ChatPage';
import ConfirmPasswordPage from '../pages/ConfirmPasswordPage';
import DashboardPage from '../pages/DashboardPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import LoginPage from '../pages/LoginPage';
import MemberDashboardPage from '../pages/MemberDashboardPage';
import NewPasswordPage from '../pages/NewPasswordPage';
import ProfilePage from '../pages/ProfilePage';
import ReceiptDetailPage from '../pages/ReceiptDetailPage';
import ReceiptsPage from '../pages/ReceiptsPage';

// Unauthenticated routes.
const publicRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/password/new', element: <NewPasswordPage /> },
  { path: '/password/forgot', element: <ForgotPasswordPage /> },
  { path: '/password/confirm', element: <ConfirmPasswordPage /> },
];

const protectedRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            element: <AdminRoute />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/chat', element: <ChatPage /> },
              { path: '/receipts', element: <ReceiptsPage /> },
              { path: '/receipt/:id', element: <ReceiptDetailPage /> },
            ],
          },
          { path: '/dashboard', element: <MemberDashboardPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/action-queue', element: <ActionQueuePage /> },
          { path: '/action-queue/:threadId', element: <ActionQueueThreadPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter([...publicRoutes, ...protectedRoutes]);
