// src/components/Header/Header.jsx
import React, { useEffect, useRef, useState } from "react";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import useSession from "../../hooks/useSession";

/**
 * Header with deduped portal fetch
 *
 * - Uses a module-level singleton to ensure the underlying network call to /api/portal/getPortals
 *   is performed only once at a time. Callers can pass an AbortSignal to stop waiting without
 *   cancelling the shared network request.
 * - Avoids double network calls from StrictMode mount/unmount behavior.
 */

/* Module-level singleton for portals */
let portalsSingleton = { promise: null };

async function fetchPortalsNetwork(internalSignal, token) {
  const res = await fetch("/api/portal/getPortals", {
    method: "GET",
    signal: internalSignal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    body,
    message: (body && (body.message || body.msg)) || null,
    error: (body && (body.error || body.err || body.status)) || null,
  };
}

/**
 * fetchPortalsOnce(callerSignal=null, token=null, force=false)
 * - Creates a shared network fetch (with its own internal AbortController) if one does not exist.
 * - Returns a promise resolving to normalized response. If callerSignal provided, we race caller abort
 *   against the shared promise so the caller can stop waiting without aborting the shared request.
 */
function fetchPortalsOnce(callerSignal = null, token = null, force = false) {
  // If there's no active singleton or caller asked to force, create one
  if (!portalsSingleton.promise || force) {
    const internalController = new AbortController();
    const p = (async () => {
      try {
        // perform the network fetch with the provided token (captured)
        return await fetchPortalsNetwork(internalController.signal, token);
      } finally {
        // allow next fetch to create a fresh promise
        portalsSingleton.promise = null;
      }
    })();

    portalsSingleton.promise = {
      promise: p,
      cancel: () => {
        try {
          internalController.abort();
        } catch {}
      },
    };
  }

  // If caller provided a signal, race it with the shared promise
  if (callerSignal) {
    return new Promise((resolve, reject) => {
      if (callerSignal.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        return reject(err);
      }
      const onAbort = () => {
        callerSignal.removeEventListener("abort", onAbort);
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      callerSignal.addEventListener("abort", onAbort);

      portalsSingleton.promise.promise
        .then((res) => {
          callerSignal.removeEventListener("abort", onAbort);
          resolve(res);
        })
        .catch((err) => {
          callerSignal.removeEventListener("abort", onAbort);
          reject(err);
        });
    });
  }

  // no caller signal -> return the shared promise directly
  return portalsSingleton.promise.promise;
}

/* Header component */
const Header = () => {
  const { token, session, initialized, logout } = useSession();
  const [portals, setPortals] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const hidePortalDropdown = ["/register", "/login", "/VerifyMail"].includes(
    location.pathname
  );

  const userName =
    session?.userName ?? localStorage.getItem("userName") ?? "ADMIN";
  const loginTime =
    session?.metaData?.loginTime ?? localStorage.getItem("loginTime") ?? "";

  const isLoggedIn = Boolean(token);

  const prevTokenRef = useRef(null);
  const mountedRef = useRef(true);
  const localAbortRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        localAbortRef.current?.abort();
      } catch {}
    };
  }, []);

  useEffect(() => {
    // Only attempt fetch after session initialization
    if (!initialized) return;

    // If not logged in or dropdown hidden on this route, clear portals and remember token
    if (!isLoggedIn || hidePortalDropdown) {
      setPortals([]);
      prevTokenRef.current = token || null;
      return;
    }

    // If token hasn't changed, nothing to do
    if (prevTokenRef.current && prevTokenRef.current === token) {
      return;
    }
    prevTokenRef.current = token;

    // create an AbortController for this caller so we can stop waiting without cancelling the shared fetch
    const controller = new AbortController();
    localAbortRef.current = controller;

    (async () => {
      try {
        // fetchPortalsOnce will dedupe the underlying network call across callers
        const resp = await fetchPortalsOnce(controller.signal, token, false);
        if (!mountedRef.current || controller.signal.aborted) return;

        if (!resp.ok) {
          // Normalize: empty list on non-ok
          setPortals([]);
          return;
        }

        // Normalize response: support array or wrapper object
        const data = resp.body;
        const portalsArr =
          (Array.isArray(data) && data) || data?.portals || data?.body || [];
        setPortals(Array.isArray(portalsArr) ? portalsArr : []);
      } catch (err) {
        if (err && err.name === "AbortError") {
          // caller aborted waiting; ignore
          return;
        }
        console.error("Portal fetch error:", err);
        if (mountedRef.current) setPortals([]);
      }
    })();

    return () => {
      try {
        controller.abort();
      } catch {}
    };
    // dependencies: only re-run when initialization, login state, path-hiding, or token changes
  }, [initialized, isLoggedIn, hidePortalDropdown, token]);

  const handlePortalChange = (e) => {
    const id = e.target.value;
    if (!id) return;
    const sel = portals.find((p) => String(p.portalId) === String(id));
    if (sel?.portalUrl) window.open(sel.portalUrl, "_blank");
  };

  const handleLogout = async () => {
    try {
      await logout({ revokedBy: userName || "FRONTEND" });
    } catch (err) {
      console.warn("Logout failed via useSession:", err);
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      } catch {}
    } finally {
      localStorage.removeItem("userName");
      localStorage.removeItem("loginTime");
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left">
          <FaUserCircle className="avatar-icon" />
          <div className="user-block">
            <div className="user-name">{userName}</div>
            {isLoggedIn && loginTime && (
              <div className="login-time">Logged in at {loginTime}</div>
            )}
          </div>
        </div>

        <div className="header-center" aria-hidden />

        <div className="header-right">
          {!hidePortalDropdown && isLoggedIn && portals.length > 0 && (
            <select
              className="portal-dropdown"
              onChange={handlePortalChange}
              defaultValue=""
              aria-label="Select portal"
            >
              <option value="">Select Portal</option>
              {portals
                .filter((p) => p.activeFlag !== false)
                .map((p) => (
                  <option key={p.portalId} value={p.portalId}>
                    {p.portalName || p.name || p.portalId}
                  </option>
                ))}
            </select>
          )}

          {isLoggedIn && (
            <button
              className="logout-button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <FaSignOutAlt aria-hidden="true" />
              <span className="logout-text">Logout</span>
            </button>
          )}
        </div>
      </div>

      <div className="app-header-divider" aria-hidden />
    </header>
  );
};

export default Header;
