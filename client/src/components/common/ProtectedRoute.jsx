import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from './LoadingSpinner';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location           = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const redirect =
      user.role === 'admin'   ? '/admin'   :
      user.role === 'owner'   ? '/owner'   :
      user.role === 'manager' ? '/manager' : '/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
}
