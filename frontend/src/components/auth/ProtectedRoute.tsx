import { Navigate } from 'react-router-dom';
import { authApi } from '../../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that redirects to login if user is not authenticated.
 * Wraps routes that require authentication.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = authApi.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
}
