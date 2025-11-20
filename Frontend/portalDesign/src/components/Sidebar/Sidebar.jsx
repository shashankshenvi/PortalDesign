// src/components/Sidebar/Sidebar.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { FaHome, FaUser, FaUserShield, FaBars, FaTimes } from "react-icons/fa";
import "./Sidebar.css";
import { useSession } from "../../hooks/useSession"; // MUST be named export in your hook

/**
 * Sidebar
 *
 * Props:
 *  - onToggle(expanded:boolean) optional
 *  - defaultExpanded boolean (optional)
 *  - enableCounts boolean (optional)
 *  - countEndpoints { notifications, tasks } optional
 */
const Sidebar = ({
  onToggle,
  defaultExpanded,
  enableCounts,
  countEndpoints,
}) => {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Defensive: ensure hook is available
  const sessionHook = (() => {
    try {
      return useSession();
    } catch (err) {
      // In case someone accidentally imported default, degrade gracefully
      // eslint-disable-next-line no-console
      console.error("useSession hook failed to run:", err);
      return {
        token: null,
        session: null,
        loading: false,
        validate: async () => {},
        refresh: async () => {},
        logout: async () => {},
        initialized: true,
      };
    }
  })();

  const {
    token,
    session,
    loading: sessionLoading,
    validate,
    refresh,
    logout,
    initialized,
  } = sessionHook;

  // counts
  const [counts, setCounts] = useState({ notifications: 0, tasks: 0 });
  const [countsLoading, setCountsLoading] = useState(false);
  const abortCountsRef = useRef(null);
  const lastLoadRef = useRef(0);
  const MIN_INTERVAL_MS = 30 * 1000;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortCountsRef.current?.abort?.();
    };
  }, []);

  // inform parent about expanded state
  useEffect(() => {
    if (typeof onToggle === "function") onToggle(Boolean(expanded));
  }, [expanded, onToggle]);

  // prevent body scroll while mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // avoid hover expansion on touch devices
  const isTouchRef = useRef(false);
  useEffect(() => {
    const onTouchStart = () => {
      isTouchRef.current = true;
      window.removeEventListener("touchstart", onTouchStart);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => window.removeEventListener("touchstart", onTouchStart);
  }, []);

  // menu
  const menuItems = useMemo(
    () => [
      { label: "Dashboard", icon: <FaHome />, path: "/MainPage" },
      { label: "Profile", icon: <FaUser />, path: "/ProfilePage" },
      { label: "Admin", icon: <FaUserShield />, path: "/admin" },
    ],
    []
  );

  const renderItem = (item) => (
    <NavLink
      to={item.path}
      key={item.label}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? "active" : ""} ${
          expanded ? "expanded" : "collapsed"
        }`
      }
      tabIndex={0}
      aria-label={item.label}
      onClick={() => {
        if (mobileOpen) setMobileOpen(false);
      }}
    >
      <span className="sidebar-icon" aria-hidden>
        {item.icon}
      </span>

      <span className="sidebar-label">{item.label}</span>

      {!expanded && (
        <span className="sidebar-tooltip" role="tooltip">
          {item.label}
        </span>
      )}
    </NavLink>
  );

  // loadCounts with cancellation and min interval
  const loadCounts = useCallback(
    async (force = false) => {
      if (!enableCounts) return;
      if (!initialized) return;
      if (!token) return;

      const now = Date.now();
      if (
        !force &&
        lastLoadRef.current &&
        now - lastLoadRef.current < MIN_INTERVAL_MS
      )
        return;
      lastLoadRef.current = now;

      const endpointsObj = {
        notifications:
          typeof countEndpoints.notifications === "string"
            ? countEndpoints.notifications
            : null,
        tasks:
          typeof countEndpoints.tasks === "string"
            ? countEndpoints.tasks
            : null,
      };
      const entries = Object.entries(endpointsObj).filter(([, url]) => !!url);
      if (entries.length === 0) return;

      abortCountsRef.current?.abort?.();
      const ac = new AbortController();
      abortCountsRef.current = ac;
      setCountsLoading(true);

      try {
        const promises = entries.map(([key, url]) =>
          fetch(url, {
            signal: ac.signal,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then(async (r) => {
              if (!r.ok) return [key, 0];
              const body = await r.json().catch(() => null);
              const count =
                body && (body.count ?? body.total ?? body.value ?? null);
              if (typeof count === "number") return [key, count];
              if (typeof body === "number") return [key, body];
              return [key, 0];
            })
            .catch((err) => {
              if (err.name === "AbortError") throw err;
              return [key, 0];
            })
        );

        const results = await Promise.allSettled(promises);
        const next = {};
        results.forEach((r) => {
          if (r.status === "fulfilled" && Array.isArray(r.value)) {
            const [k, v] = r.value;
            next[k] = Number.isFinite(v) ? v : 0;
          }
        });

        if (mountedRef.current) setCounts((c) => ({ ...c, ...next }));
      } catch (err) {
        if (err.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.warn("loadCounts unexpected error:", err);
        }
      } finally {
        if (mountedRef.current) setCountsLoading(false);
      }
    },
    [enableCounts, token, initialized, countEndpoints]
  );

  // only validate once after global initialized
  useEffect(() => {
    if (!initialized) return;
    if (typeof validate === "function") {
      validate({ force: false }).catch(() => {});
    }
    if (enableCounts) loadCounts().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // run counts on expand
  useEffect(() => {
    if (expanded && enableCounts) {
      loadCounts().catch(() => {});
    }
  }, [expanded, enableCounts, loadCounts]);

  // hover debounce to avoid flash
  const hoverTimerRef = useRef(null);
  const handleMouseEnter = () => {
    if (isTouchRef.current) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setExpanded(true), 80);
  };
  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setExpanded(false), 120);
  };

  // mobile toggle keyboard support
  const toggleMobile = (evt) => {
    // support space/enter and click
    if (evt.type === "keydown" && evt.key !== "Enter" && evt.key !== " ")
      return;
    setMobileOpen((s) => !s);
  };

  const sessionSummary = useMemo(() => {
    if (!token) return { status: "No token", userName: null };
    if (sessionLoading)
      return { status: "Checking...", userName: session?.userName ?? null };
    if (!session) return { status: "Invalid", userName: null };
    const expiresAt = session.expiresAt
      ? ` · expires ${new Date(session.expiresAt).toLocaleString()}`
      : "";
    return { status: `Active${expiresAt}`, userName: session.userName ?? null };
  }, [token, session, sessionLoading]);

  // we deliberately do NOT show refresh/logout here (moved to Header)
  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        onClick={toggleMobile}
        onKeyDown={toggleMobile}
      >
        {mobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      <nav
        className={`sidebar ${expanded ? "expanded" : "collapsed"} ${
          mobileOpen ? "mobile-open" : ""
        }`}
        role="navigation"
        aria-label="Main navigation"
        aria-expanded={expanded}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-top">
          <div className="sidebar-brand" aria-hidden>
            <span className="brand-small">v1</span>
          </div>

          <div className="sidebar-session" aria-hidden={!expanded}>
            <div className="sidebar-session-user">
              <strong>{session?.userName ?? "Guest"}</strong>
            </div>
            <div
              className="sidebar-session-status"
              title={sessionSummary.status}
            >
              {sessionSummary.status}
            </div>
          </div>
        </div>

        <div className="sidebar-items" role="menu">
          {menuItems.map(renderItem)}

          {/* badges (optional) */}
          <div
            className={`sidebar-item extra ${
              expanded ? "expanded" : "collapsed"
            }`}
            tabIndex={0}
            role="menuitem"
          >
            <span className="sidebar-icon" aria-hidden>
              🔔
            </span>
            <span className="sidebar-label">Notifications</span>
            {!expanded && (
              <span className="sidebar-tooltip">Notifications</span>
            )}
            {expanded && (
              <span className="sidebar-badge" aria-hidden>
                {countsLoading ? "…" : counts.notifications}
              </span>
            )}
          </div>

          <div
            className={`sidebar-item extra ${
              expanded ? "expanded" : "collapsed"
            }`}
            tabIndex={0}
            role="menuitem"
          >
            <span className="sidebar-icon" aria-hidden>
              ✅
            </span>
            <span className="sidebar-label">Tasks</span>
            {!expanded && <span className="sidebar-tooltip">Tasks</span>}
            {expanded && (
              <span className="sidebar-badge" aria-hidden>
                {countsLoading ? "…" : counts.tasks}
              </span>
            )}
          </div>
        </div>

        <div className="sidebar-footer" aria-hidden={!expanded}>
          <small className="sidebar-footer-text">v1.0</small>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};

Sidebar.propTypes = {
  onToggle: PropTypes.func,
  defaultExpanded: PropTypes.bool,
  enableCounts: PropTypes.bool,
  countEndpoints: PropTypes.shape({
    notifications: PropTypes.string,
    tasks: PropTypes.string,
  }),
};

Sidebar.defaultProps = {
  onToggle: () => {},
  defaultExpanded: false,
  enableCounts: false,
  countEndpoints: {},
};

export default Sidebar;
