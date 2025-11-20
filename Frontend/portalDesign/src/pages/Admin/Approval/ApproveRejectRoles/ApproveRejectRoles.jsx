// src/pages/Admin/Role/ApproveRejectRoles/ApproveRejectRoles.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../../../hooks/useSession";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import "./ApproveRejectRoles.css";

/**
 * ApproveRejectRoles
 *
 * Improvements:
 * - Uses a module-level in-flight promise (globalPendingPromise) to dedupe & protect the
 *   automatic initial fetch from being canceled by component unmounts / StrictMode.
 * - Manual Refresh forces a fresh request.
 * - Waits for session validate() before initial fetch to avoid racing with session logic.
 * - Safe handling of 401 (redirect to login).
 */

const API_PENDING = "/api/role/getPendingRoles";
const API_APPROVE = "/api/role/approveRole";
const DEFAULT_PAGE_SIZE = 10;

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  } catch {
    return iso;
  }
};

/* raw fetch that returns the Response and parsed body (if any) */
async function rawFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return { res, body };
}

/* Module-level in-flight promise to dedupe the pending roles request.
   This prevents the cancellation/duplicate problem caused by component unmounts
   (e.g. StrictMode dev double-mount or session validation causing rerenders).
*/
let globalPendingPromise = null;

/* Helper that performs the network call; returns normalized result object */
async function fetchPendingNetwork(getAuthHeader) {
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeader() || {}),
  };
  try {
    const { res, body } = await rawFetch(API_PENDING, {
      method: "GET",
      headers,
    });
    const ok = res.ok;
    const statusCode = res.status;
    const message = (body && (body.message || body.msg)) || null;
    const error = (body && (body.error || body.status || body.err)) || null;
    return { ok, statusCode, body, message, error };
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      body: null,
      message: null,
      error: err.message || "Network error",
    };
  }
}

/* Returns a promise for pending roles; reuses globalPendingPromise unless force===true */
function fetchPendingOnce(getAuthHeader, force = false) {
  if (globalPendingPromise && !force) {
    return globalPendingPromise;
  }

  // assign and return
  globalPendingPromise = (async () => {
    try {
      const resp = await fetchPendingNetwork(getAuthHeader);
      return resp;
    } finally {
      // clear so subsequent calls (or manual refresh) can create a new request
      globalPendingPromise = null;
    }
  })();

  return globalPendingPromise;
}

/* Module-level flag to avoid dev StrictMode duplicate side-effect (optional) */
let initialFetchDone = false;

export default function ApproveRejectRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const [workingId, setWorkingId] = useState(null); // roleId being approved/rejected
  const [msg, setMsg] = useState(null); // {type: 'success'|'error', text}

  const mountedRef = useRef(true);
  const navigate = useNavigate();

  // session hook: wait for validate/initialized before fetching
  const { initialized, validate } = useSession();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // helper to build auth header; update token key if your app uses another key
  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // safeFetch wrapper used for approve/reject (keeps 401 handling)
  const safeFetch = async (url, opts = {}) => {
    const headers = {
      ...(opts.headers || {}),
      ...getAuthHeader(),
    };

    const options = { ...opts, headers };

    try {
      const { res, body } = await rawFetch(url, options);
      if (res.status === 401) {
        setMsg({
          type: "error",
          text: "Session expired. Redirecting to login.",
        });
        try {
          // optionally clear tokens
        } catch (e) {}
        navigate("/login");
        const err = new Error("Unauthorized");
        err.status = 401;
        throw err;
      }

      return {
        ok: res.ok,
        statusCode: res.status,
        body,
        message: (body && (body.message || body.msg)) || null,
        error: (body && (body.error || body.status || body.err)) || null,
      };
    } catch (err) {
      throw err;
    }
  };

  // Use fetchPendingOnce to get data (force=false uses cached in-flight promise)
  const loadPending = async (opts = { force: false }) => {
    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      const resp = await fetchPendingOnce(getAuthHeader, opts.force);

      if (!resp.ok) {
        const text =
          resp.error || resp.message || `Fetch failed (${resp.statusCode})`;
        if (mountedRef.current) {
          setError(text);
          setMsg({ type: "error", text });
          setRoles([]);
        }
      } else {
        // normalize payload shapes
        const body = resp.body;
        const list = Array.isArray(body)
          ? body
          : Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.roles)
          ? body.roles
          : [];
        if (mountedRef.current) {
          setRoles(list);
        }
      }
    } catch (err) {
      console.error("loadPending error:", err);
      if (mountedRef.current) {
        setError(err.message || "Unable to load pending roles.");
        setMsg({
          type: "error",
          text: err.message || "Unable to load pending roles.",
        });
        setRoles([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // automatic initial fetch: wait for session validate (de-duped inside useSession),
  // then call loadPending. Module-level initialFetchDone prevents StrictMode double-run.
  useEffect(() => {
    if (initialFetchDone) return;

    let mounted = true;

    (async () => {
      try {
        // wait for session to be validated (no-op if already validated)
        if (!initialized) {
          await validate({ force: false });
        }
      } catch (e) {
        // ignore; safeFetch will handle 401/redirect
      }

      if (!mounted) return;

      initialFetchDone = true;
      // perform initial load (does not get canceled by component unmount)
      await loadPending({ force: false });
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Manual refresh forces a new network request (bypasses any existing in-flight promise)
  const handleRefresh = async () => {
    setMsg(null);
    try {
      await loadPending({ force: true }); // force new network call
    } catch (e) {
      /* handled inside loadPending */
    }
  };

  // CSV export
  const exportCsv = () => {
    if (!roles.length) return;
    const headers = [
      "roleId",
      "roleName",
      "roleDesc",
      "createdBy",
      "createdDate",
      "activeFlag",
    ];
    const rows = roles.map((r) => [
      r.roleId ?? "",
      r.roleName ?? "",
      r.roleDesc ?? "",
      r.createdBy ?? "",
      formatDate(r.createdDate),
      r.activeFlag ?? "",
    ]);
    const csv =
      [headers.join(",")]
        .concat(
          rows.map((row) =>
            row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
          )
        )
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending_roles_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setMsg({ type: "success", text: "Exported pending roles as CSV." });
  };

  // approve/reject (status: 'APPROVE' or 'REJECT')
  const postApproveReject = async (role, status) => {
    if (!role || workingId) return;
    const confirmText =
      status === "APPROVE"
        ? `Approve role "${role.roleName}"?`
        : `Reject role "${role.roleName}"? This action cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    setWorkingId(role.roleId);
    setMsg(null);

    const payload = {
      roleId: role.roleId,
      roleName: role.roleName,
      modifiedBy: localStorage.getItem("userName") || "ADMIN",
      status: status === "APPROVE" ? "APPROVED" : "REJECTED",
    };

    try {
      const resp = await safeFetch(API_APPROVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text =
          resp.error || resp.message || `Operation failed (${resp.statusCode})`;
        if (mountedRef.current) setMsg({ type: "error", text });
      } else {
        const text = resp.message || "Operation completed.";
        if (mountedRef.current) setMsg({ type: "success", text });
        // remove from local list (optimistic)
        if (mountedRef.current)
          setRoles((prev) => prev.filter((r) => r.roleId !== role.roleId));
      }
    } catch (err) {
      console.error("approve/reject error:", err);
      if (mountedRef.current)
        setMsg({ type: "error", text: "Network error — try again." });
    } finally {
      if (mountedRef.current) setWorkingId(null);
    }
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return roles;
    const q = debouncedSearch.toLowerCase();
    return roles.filter(
      (r) =>
        (r.roleName || "").toLowerCase().includes(q) ||
        (r.roleDesc || "").toLowerCase().includes(q) ||
        (r.createdBy || "").toLowerCase().includes(q)
    );
  }, [roles, debouncedSearch]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="apr-wrapper">
      <Sidebar />
      <div className="apr-content">
        <Header />
        <main className="apr-main" role="main" aria-labelledby="apr-title">
          <div className="apr-header">
            <div>
              <h2 id="apr-title">Role Approvals</h2>
              <div className="apr-sub">
                Approve or reject roles waiting for admin approval.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="btn"
                onClick={handleRefresh}
                aria-label="Refresh pending roles"
              >
                ⟳ Refresh
              </button>
              <button
                className="btn btn-outline"
                onClick={exportCsv}
                aria-label="Export pending roles"
                disabled={!roles.length}
              >
                Export
              </button>
            </div>
          </div>

          <div className="apr-panel">
            {msg && <div className={`apr-msg ${msg.type}`}>{msg.text}</div>}

            <div
              className="apr-list-controls"
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <input
                type="search"
                className="apr-search"
                placeholder="Search role name or description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search pending roles"
              />

              <label className="apr-pagesize" aria-hidden>
                Show
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="apr-empty">Loading pending roles…</div>
            ) : error ? (
              <div className="apr-empty" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="apr-empty">No roles pending approval.</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table
                    className="apr-table"
                    role="table"
                    aria-label="Pending roles"
                  >
                    <thead>
                      <tr>
                        <th>Role ID</th>
                        <th>Role Name</th>
                        <th>Description</th>
                        <th>Created By</th>
                        <th>Created Date</th>
                        <th>Status</th>
                        <th className="col-action">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pageData.map((r) => (
                        <tr key={r.roleId}>
                          <td>{r.roleId}</td>
                          <td className="role-name">{r.roleName}</td>
                          <td className="wrap">{r.roleDesc ?? "-"}</td>
                          <td>{r.createdBy ?? "-"}</td>
                          <td>{formatDate(r.createdDate)}</td>
                          <td>
                            <span
                              className={`active-badge ${
                                r.activeFlag ? "on" : "off"
                              }`}
                            >
                              {r.activeFlag ? "Active" : "Pending"}
                            </span>
                          </td>
                          <td className="col-action">
                            <button
                              className="btn-approve"
                              onClick={() => postApproveReject(r, "APPROVE")}
                              disabled={workingId === r.roleId}
                              aria-label={`Approve ${r.roleName}`}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => postApproveReject(r, "REJECT")}
                              disabled={workingId === r.roleId}
                              aria-label={`Reject ${r.roleName}`}
                              style={{ marginLeft: 8 }}
                            >
                              ✕ Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="apr-pager">
                  <div className="apr-pager-info">
                    Showing {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, filtered.length)} of{" "}
                    {filtered.length}
                  </div>

                  <div
                    className="apr-pager-controls"
                    role="navigation"
                    aria-label="Pagination"
                  >
                    <button
                      className="btn-ghost"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      « First
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ‹ Prev
                    </button>
                    <span className="pager-current">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Next ›
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                    >
                      Last »
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
