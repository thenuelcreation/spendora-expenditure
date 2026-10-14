import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

function ProtectedRoute() {
  const location = useLocation();
  const { user, loading, error } = useAuth();

  if (loading) return <main className="auth-loading">Loading your account…</main>;
  if (error) return <main className="auth-loading">{error}</main>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;