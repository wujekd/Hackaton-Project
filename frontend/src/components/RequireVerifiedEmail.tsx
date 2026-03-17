import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

function buildRedirect(location: ReturnType<typeof useLocation>): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export default function RequireVerifiedEmail() {
  const location = useLocation();
  const { user, loading, canAccessVerifiedFeatures } = useAuthStore();

  if (loading) {
    return (
      <div className="page-view">
        <div className="form-shell">
          <div className="empty-state">Checking your account access...</div>
        </div>
      </div>
    );
  }

  const redirectTarget = encodeURIComponent(buildRedirect(location));

  if (!user) {
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />;
  }

  if (!canAccessVerifiedFeatures) {
    return <Navigate to={`/verify-email?redirect=${redirectTarget}`} replace />;
  }

  return <Outlet />;
}
