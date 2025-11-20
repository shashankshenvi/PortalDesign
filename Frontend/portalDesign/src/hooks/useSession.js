// src/hooks/useSession.js
import { useEffect, useState, useCallback, useRef } from "react";
import * as api from "../api/sessionApi";

const TOKEN_KEY = "sessionToken";
const REFRESH_INTERVAL_MS = 1000 * 60 * 10; // 10 minutes
const DEFAULT_TTL = 60 * 24;
const VALIDATE_COOLDOWN_MS = 4000; // don't revalidate more than once every 4s

function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/**
 * useSession - centralized session manager hook (improved)
 *
 * - Reuses a module-level in-flight validate promise to dedupe work across instances.
 * - Prevents stale session reads by keeping a sessionRef.
 * - Keeps mounted checks to avoid setting state on unmounted components.
 */

// Module-level globals to dedupe validate across hook instances
let globalValidatingPromise = null;
let globalLastValidatedAt = 0;

export function useSession() {
  const [token, setTokenState] = useState(() => loadToken() || null);
  const [session, setSession] = useState(() => {
    try {
      const s = localStorage.getItem("sessionObj");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  // keep a ref to the latest session to avoid stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persistToken = useCallback((t) => {
    saveToken(t);
    if (mountedRef.current) setTokenState(t ? String(t) : null);
  }, []);

  const persistSessionObj = useCallback((s) => {
    try {
      if (s) localStorage.setItem("sessionObj", JSON.stringify(s));
      else localStorage.removeItem("sessionObj");
    } catch {}
    if (mountedRef.current) setSession(s || null);
    // also update ref immediately
    sessionRef.current = s || null;
  }, []);

  const setToken = useCallback(
    (newToken, maybeSession = null) => {
      persistToken(newToken);
      if (maybeSession) persistSessionObj(maybeSession);
    },
    [persistToken, persistSessionObj]
  );

  /**
   * validate(opts)
   * - deduplicated across hook instances by globalValidatingPromise
   * - honors a cooldown to avoid spamming validation
   */
  const validate = useCallback(
    async (opts = { force: false }) => {
      const currentToken = loadToken();
      if (!currentToken) {
        // Clear local state if no token
        if (mountedRef.current) {
          setSession(null);
          setTokenState(null);
          setInitialized(true);
        }
        return null;
      }

      const now = Date.now();
      if (!opts.force && now - globalLastValidatedAt < VALIDATE_COOLDOWN_MS) {
        // Cooldown - return the most recent session (from ref to avoid stale closure)
        return sessionRef.current ?? null;
      }

      // Reuse global in-flight promise if present
      if (globalValidatingPromise) {
        try {
          return await globalValidatingPromise;
        } catch {
          return null;
        }
      }

      if (mountedRef.current) setLoading(true);

      const p = (async () => {
        try {
          const validated = await api.validateSessionByToken(currentToken);
          globalLastValidatedAt = Date.now();

          if (!mountedRef.current) return validated || null;

          // update state + storage
          setTokenState(currentToken);
          if (validated) {
            setSession(validated);
            persistSessionObj(validated);
          } else {
            setSession(null);
            persistSessionObj(null);
          }
          setInitialized(true);
          return validated || null;
        } catch (err) {
          // validation failed — clear token to avoid infinite retries
          try {
            saveToken(null);
          } catch {}
          if (mountedRef.current) {
            setSession(null);
            setTokenState(null);
            setInitialized(true);
          }
          return null;
        } finally {
          if (mountedRef.current) setLoading(false);
          // ensure other callers can create a fresh validate promise later
          globalValidatingPromise = null;
        }
      })();

      globalValidatingPromise = p;
      try {
        return await p;
      } catch {
        return null;
      }
    },
    [persistSessionObj]
  );

  // loginWithSession: create session & persist token/session
  const loginWithSession = useCallback(
    async (createPayload) => {
      if (mountedRef.current) setLoading(true);
      try {
        const created = await api.createSession(createPayload);
        const sessionToken =
          created?.sessionToken ||
          (created?.session && created.session.sessionToken);
        if (!sessionToken) throw new Error("No session token returned");
        persistToken(sessionToken);

        // Try to validate immediately to get canonical session object
        let validated = null;
        try {
          validated = await api.validateSessionByToken(sessionToken);
        } catch {
          validated = created.session ?? null;
        }

        persistSessionObj(validated || created.session || null);
        setInitialized(true);
        return validated || created.session || null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [persistToken, persistSessionObj]
  );

  const refresh = useCallback(
    async (ttlMinutes = DEFAULT_TTL) => {
      const t = loadToken();
      if (!t) throw new Error("No token to refresh");
      const res = await api.refreshSession(t, ttlMinutes);
      if (res?.sessionToken) {
        persistToken(res.sessionToken);
        persistSessionObj(res.session || null);
      } else if (res?.session) {
        persistSessionObj(res.session);
      }
      return res;
    },
    [persistToken, persistSessionObj]
  );

  const logout = useCallback(
    async (options = {}) => {
      const t = loadToken();
      try {
        if (t) {
          await api.revokeSession({
            sessionToken: t,
            revokedBy: options.revokedBy || "FRONTEND",
          });
        }
      } catch (e) {
        console.warn("revoke failed:", e);
      } finally {
        persistToken(null);
        persistSessionObj(null);
        try {
          localStorage.removeItem("userName");
          localStorage.removeItem("loginTime");
        } catch {}
      }
    },
    [persistToken, persistSessionObj]
  );

  // run a single validate on mount (will reuse global promise if other components call too)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await validate({ force: false });
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setInitialized(true);
      }
    })();
    return () => {
      mounted = false;
    };
    // intentionally not listing validate in deps so this runs once on mount;
    // validate itself is stable via useCallback and persistSessionObj is in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // periodic refresh
  useEffect(() => {
    const tick = async () => {
      const t = loadToken();
      if (!t) return;
      if (document.hidden) return;
      try {
        await refresh(undefined);
      } catch (e) {
        persistToken(null);
        persistSessionObj(null);
      }
    };
    const id = setInterval(tick, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    token,
    session,
    loading,
    initialized,
    loginWithSession,
    logout,
    validate,
    refresh,
    setToken,
  };
}

export default useSession;
