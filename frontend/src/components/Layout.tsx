import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useAuthStore } from "../stores/auth.store";
import { useMessagingStore } from "../stores/messaging.store";
import ThemePreferenceControl from "./ThemePreferenceControl";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h2.75A6.25 6.25 0 0 0 12 3Z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="9.5" cy="6.5" r="1" />
      <circle cx="14.5" cy="6.5" r="1" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 14l7-7" />
      <path d="M9 9l7-7" />
      <path d="M3 21l6-6" />
      <path d="M8 16l-3-3 7-7 3 3z" />
      <path d="M13 11l-3-3 2-2 3 3z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: string;
}

function NavItem({ to, label, icon, end, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {badge && <span className="badge">{badge}</span>}
    </NavLink>
  );
}

interface MobileTabItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  onSelect?: () => void;
}

function MobileTabItem({ to, label, icon, end, onSelect }: MobileTabItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `mobile-tab-item${isActive ? " active" : ""}`}
      onClick={onSelect}
    >
      <span className="mobile-tab-icon">{icon}</span>
      <span className="mobile-tab-label">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuthStore();
  const unreadTotal = useMessagingStore((state) => state.unreadTotal);
  const listenConversations = useMessagingStore((state) => state.listenConversations);
  const stopMessaging = useMessagingStore((state) => state.stopAll);
  const isAuthRoute = location.pathname.startsWith("/login");

  useEffect(() => {
    document.body.classList.toggle("mobile-menu-open", isMobile && isMoreOpen);
    return () => document.body.classList.remove("mobile-menu-open");
  }, [isMobile, isMoreOpen]);

  useEffect(() => {
    if (!isMobile || !isMoreOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, isMoreOpen]);

  useEffect(() => {
    if (!user) {
      stopMessaging();
      return;
    }

    listenConversations(user.uid);
  }, [listenConversations, stopMessaging, user]);

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Guest";
  const initials = displayName.trim().slice(0, 2).toUpperCase() || "G";
  const role = profile?.admin ? "Admin" : user ? "Student Member" : "Guest";
  const unreadBadge = unreadTotal > 99 ? "99+" : unreadTotal > 0 ? String(unreadTotal) : undefined;
  const moreActive =
    location.pathname.startsWith("/schedule") ||
    location.pathname.startsWith("/account") ||
    location.pathname.startsWith("/appearance") ||
    location.pathname.startsWith("/admin");

  const handleMobileSignOut = async () => {
    await signOut();
    setIsMoreOpen(false);
  };

  if (isAuthRoute) {
    return (
      <main className="auth-layout">
        <Outlet />
      </main>
    );
  }

  return (
    <div className={`app-shell${isMobile ? " mobile-shell" : ""}`}>
      {!isMobile && (
        <nav className="sidebar" aria-label="Primary sidebar">
          <div className="sidebar-logo">
            <div className="shield" style={{ width: 28, height: 32 }}>
              <div className="shield-text" style={{ fontSize: 12 }}>M</div>
            </div>
            <div className="sidebar-logo-text">
              MDX <span>Collab</span>
            </div>
          </div>

          <div className="nav-label">Main</div>
          <div className="sidebar-nav-scroll">
            <NavItem to="/" end label="Home" icon={<HomeIcon />} />
            <NavItem to="/collaborations" label="Collabs" icon={<TeamIcon />} />
            <NavItem to="/events" label="Events" icon={<CalendarIcon />} />
            <NavItem to="/schedule" label="Schedule" icon={<ClockIcon />} />
            <NavItem to="/messages" label="Messages" icon={<MessageIcon />} badge={unreadBadge} />
          </div>

          <div className="nav-label">Account</div>
          <div className="sidebar-nav-scroll">
            <NavItem to="/account" label="My Profile" icon={<UserIcon />} />
            <NavItem to="/appearance" label="Appearance" icon={<PaletteIcon />} />
            {profile?.admin && (
              <NavItem to="/admin/moderation" label="Moderation" icon={<GavelIcon />} />
            )}
          </div>

          <div className="sidebar-spacer" />

          <NavLink className="sidebar-user" to="/account">
            <div className="avatar av-red" style={{ width: 30, height: 30, fontSize: 10 }}>
              {initials}
            </div>
            <div>
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </NavLink>

          {!loading && (
            <div className="sidebar-auth-actions">
              {user ? (
                <button className="btn-sm outline" type="button" onClick={signOut}>
                  Sign Out
                </button>
              ) : (
                <NavLink className="btn-sm outline" to="/login">
                  Sign In
                </NavLink>
              )}
            </div>
          )}
        </nav>
      )}

      <main className={`main-content${isMobile ? " mobile-main-content" : ""}`}>
        <Outlet />
      </main>

      {isMobile && (
        <>
          <nav className="mobile-tabbar" aria-label="Primary mobile navigation">
            <MobileTabItem to="/" end label="Home" icon={<HomeIcon />} onSelect={() => setIsMoreOpen(false)} />
            <MobileTabItem
              to="/collaborations"
              label="Collabs"
              icon={<TeamIcon />}
              onSelect={() => setIsMoreOpen(false)}
            />
            <MobileTabItem to="/events" label="Events" icon={<CalendarIcon />} onSelect={() => setIsMoreOpen(false)} />
            <MobileTabItem
              to="/messages"
              label="Messages"
              icon={<MessageIcon />}
              onSelect={() => setIsMoreOpen(false)}
            />
            <button
              type="button"
              className={`mobile-tab-item mobile-tab-button${isMoreOpen || moreActive ? " active" : ""}`}
              aria-expanded={isMoreOpen}
              aria-controls="mobile-more-sheet"
              aria-label="More"
              onClick={() => setIsMoreOpen((current) => !current)}
            >
              <span className="mobile-tab-icon">
                <MoreIcon />
              </span>
              <span className="mobile-tab-label">More</span>
            </button>
          </nav>

          <button
            type="button"
            aria-label="Close menu"
            className={`mobile-more-backdrop${isMoreOpen ? " open" : ""}`}
            onClick={() => setIsMoreOpen(false)}
            tabIndex={isMoreOpen ? 0 : -1}
          />

          <section
            id="mobile-more-sheet"
            className={`mobile-more-sheet${isMoreOpen ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="More options"
          >
            <div className="mobile-more-sheet-header">
              <div className="mobile-more-user">
                <div className="avatar av-red" style={{ width: 34, height: 34, fontSize: 11 }}>
                  {initials}
                </div>
                <div>
                  <div className="sidebar-user-name">{displayName}</div>
                  <div className="sidebar-user-role">{role}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-sm outline"
                onClick={() => setIsMoreOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mobile-more-links">
              <div className="mobile-more-theme">
                <ThemePreferenceControl label="Theme" compact />
              </div>
              <NavLink
                className={({ isActive }) => `mobile-more-link${isActive ? " active" : ""}`}
                to="/schedule"
                onClick={() => setIsMoreOpen(false)}
              >
                <span className="nav-icon"><ClockIcon /></span>
                Schedule
              </NavLink>
              <NavLink
                className={({ isActive }) => `mobile-more-link${isActive ? " active" : ""}`}
                to="/account"
                onClick={() => setIsMoreOpen(false)}
              >
                <span className="nav-icon"><UserIcon /></span>
                My Profile
              </NavLink>
              <NavLink
                className={({ isActive }) => `mobile-more-link${isActive ? " active" : ""}`}
                to="/appearance"
                onClick={() => setIsMoreOpen(false)}
              >
                <span className="nav-icon"><PaletteIcon /></span>
                Appearance
              </NavLink>
              {profile?.admin && (
                <NavLink
                  className={({ isActive }) => `mobile-more-link${isActive ? " active" : ""}`}
                  to="/admin/moderation"
                  onClick={() => setIsMoreOpen(false)}
                >
                  <span className="nav-icon"><GavelIcon /></span>
                  Moderation
                </NavLink>
              )}
            </div>

            {!loading && (
              <div className="mobile-more-auth-actions">
                {user ? (
                  <button className="btn-sm outline" type="button" onClick={handleMobileSignOut}>
                    Sign Out
                  </button>
                ) : (
                  <NavLink className="btn-sm outline" to="/login" onClick={() => setIsMoreOpen(false)}>
                    Sign In
                  </NavLink>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
