import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { resolveRedirectTarget } from "../utils/auth";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = resolveRedirectTarget(searchParams.get("redirect"), "/");
  const {
    user,
    loading,
    isEmailVerified,
    resendVerificationEmail,
    refreshVerificationStatus,
    signOut,
  } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return (
      <div className="auth-container">
        <div className="login-box">
          <div className="empty-state">Loading your account...</div>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  if (!loading && user && isEmailVerified) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);

    try {
      await resendVerificationEmail();
      setNotice(`Verification email sent to ${user?.email ?? "your inbox"}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    setNotice(null);
    setChecking(true);

    try {
      const verified = await refreshVerificationStatus();
      if (verified) {
        navigate(redirectTarget, { replace: true });
        return;
      }
      setNotice("Your email is still unverified. Finish the link in your inbox, then try again.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh verification status.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setNotice(null);
    setSigningOut(true);

    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="login-box">
        <div className="login-logo">
          <div className="shield" style={{ width: 34, height: 38 }}>
            <div className="shield-text" style={{ fontSize: 14 }}>M</div>
          </div>
          <div className="login-logo-text">
            MDX <span>Collab</span>
          </div>
        </div>

        <p className="login-tagline">
          Confirm your email address to unlock collaboration posts, messages, schedules, and event signups.
        </p>

        {user?.email && <div className="auth-notice">Verification pending for {user.email}</div>}
        {notice && <div className="auth-notice">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}

        <div className="form-shell" style={{ width: "100%", padding: 0 }}>
          <div className="form-card" style={{ margin: 0 }}>
            <p>
              Open the verification link from your inbox, then come back here to continue. If you did not get the
              email, resend it.
            </p>
            <div className="detail-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" type="button" disabled={checking} onClick={() => void handleRefresh()}>
                {checking ? "Checking..." : "I Verified My Email"}
              </button>
              <button className="btn-sm outline" type="button" disabled={resending} onClick={() => void handleResend()}>
                {resending ? "Sending..." : "Resend Email"}
              </button>
              <button className="btn-sm outline" type="button" disabled={signingOut} onClick={() => void handleSignOut()}>
                {signingOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
