// src/api/sessionApi.js
const API_BASE = "/api/session";

async function safeJson(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return text;
  }
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createSession(payload) {
  const resp = await fetch(`${API_BASE}/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await safeJson(resp);
  if (!resp.ok) throw body || { message: "Create session failed" };
  return body;
}

export async function validateSessionByToken(token) {
  const resp = await fetch(`${API_BASE}/validate-session-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ sessionToken: token }),
  });
  const body = await safeJson(resp);
  if (!resp.ok) throw body || { message: "Validation failed" };
  return body;
}

export async function refreshSession(sessionToken, ttlMinutes) {
  const resp = await fetch(`${API_BASE}/refresh-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, ttlMinutes }),
  });
  const body = await safeJson(resp);
  if (!resp.ok) throw body || { message: "Refresh failed" };
  return body;
}

export async function revokeSession({ sessionToken, sessionId, revokedBy }) {
  const resp = await fetch(`${API_BASE}/revoke-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, sessionId, revokedBy }),
  });
  const body = await safeJson(resp);
  if (!resp.ok) throw body || { message: "Revoke failed" };
  return body;
}
