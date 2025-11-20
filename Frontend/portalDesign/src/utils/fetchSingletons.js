// src/utils/fetchSingletons.js
// Shared singletons so multiple components don't each perform the same network call.

const GET_ROLES_API = "/api/role/getRoles";
const GET_PORTALS_API = "/api/portal/getPortals";

/* helper to parse JSON safely */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* --- Roles singleton --- */
let rolesSingleton = { promise: null };

async function fetchRolesNetwork(internalSignal) {
  const res = await fetch(GET_ROLES_API, { signal: internalSignal });
  const body = await safeJson(res);
  return {
    ok: res.ok,
    statusCode: res.status,
    body,
    message: (body && (body.message || body.msg)) || null,
    error: (body && (body.error || body.err || body.status)) || null,
  };
}

export function fetchRolesOnce(callerSignal = null, force = false) {
  if (!rolesSingleton.promise || force) {
    const internalController = new AbortController();
    const p = (async () => {
      try {
        return await fetchRolesNetwork(internalController.signal);
      } finally {
        rolesSingleton.promise = null;
      }
    })();
    rolesSingleton.promise = {
      promise: p,
      cancel: () => {
        try {
          internalController.abort();
        } catch {}
      },
    };
  }

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

      rolesSingleton.promise.promise
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

  return rolesSingleton.promise.promise;
}

/* --- Portals singleton --- */
let portalsSingleton = { promise: null };

async function fetchPortalsNetwork(internalSignal) {
  const res = await fetch(GET_PORTALS_API, { signal: internalSignal });
  const body = await safeJson(res);
  return {
    ok: res.ok,
    statusCode: res.status,
    body,
    message: (body && (body.message || body.msg)) || null,
    error: (body && (body.error || body.err || body.status)) || null,
  };
}

export function fetchPortalsOnce(callerSignal = null, force = false) {
  if (!portalsSingleton.promise || force) {
    const internalController = new AbortController();
    const p = (async () => {
      try {
        return await fetchPortalsNetwork(internalController.signal);
      } finally {
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

  return portalsSingleton.promise.promise;
}
