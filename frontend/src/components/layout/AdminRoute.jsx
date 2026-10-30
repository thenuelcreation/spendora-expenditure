import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

function AdminRoute() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default AdminRoute;
