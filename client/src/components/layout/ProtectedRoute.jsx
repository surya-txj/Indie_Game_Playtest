import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner } from '../ui/index.js';

/** UX guard only: the API enforces every permission on its own. */
export function ProtectedRoute({ roles }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading || (token && !user)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">This screen is not available for your role ({user.role}).</p>
        <p className="mt-1">It is for: {roles.join(', ')}.</p>
      </div>
    );
  }
  return <Outlet />;
}
