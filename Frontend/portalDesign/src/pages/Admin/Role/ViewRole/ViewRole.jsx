// src/pages/Admin/Role/ViewRole/ViewRole.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../../../hooks/useSession";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import "./ViewRole.css";

const API_ROLES = "/api/role/getRoles";
const PAGE_SIZES = [10, 25, 50];

const fmtDate = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

/** helper: treat many representations as active */
const isActiveFlag = (val) => {
  if (val === 1 || val === "1" || val === true || val === "true") return true;
  if (val === "Y" || val === "y") return true;
  return false;
};

/* raw fetch that returns parsed body (if any) */
async function rawFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

/* Module-level in-flight promise to dedupe the roles request */
let globalRolesPromise = null;

/* Network call to fetch roles; returns normalized response */
async function fetchRolesNetwork(getAuthHeader) {
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeader() || {}),
  };
  try {
    const { res, body } = await rawFetch(API_ROLES, { method: "GET", headers });
    return {
      ok: res.ok,
      statusCode: res.status,
      body,
      message: (body && (body.message || body.msg)) || null,
      error: (body && (body.error || body.status || body.err)) || null,
    };
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

/* Returns a promise for roles; reuses in-flight promise unless force===true */
function fetchRolesOnce(getAuthHeader, force = false) {
  if (globalRolesPromise && !force) return globalRolesPromise;

  globalRolesPromise = (async () => {
    try {
      const resp = await fetchRolesNetwork(getAuthHeader);
      return resp;
    } finally {
      // allow future forced refreshes
      globalRolesPromise = null;
    }
  })();

  return globalRolesPromise;
}

export default function ViewRole() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // message banner: { type: 'success'|'error', text }
  const [msg, setMsg] = useState(null);

  const navigate = useNavigate();
  const mountedRef = useRef(true);

  // session hook
  const { initialized, validate } = useSession();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // auth header helper
  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // safe handler for 401 redirects for actions that use network
  const handleUnauthorized = () => {
    if (mountedRef.current) {
      setMsg({ type: "error", text: "Session expired. Redirecting to login." });
    }
    try {
      // optionally clear tokens here
    } catch {}
    navigate("/login");
  };

  // load roles using module-level in-flight promise; force=true to bypass cached/in-flight
  const loadRoles = async (opts = { force: false }) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setMsg(null);
    }

    try {
      const resp = await fetchRolesOnce(getAuthHeader, opts.force);

      if (!resp.ok) {
        // If API returned message/error, show it; otherwise generic
        const text =
          resp.error ||
          resp.message ||
          `Failed to fetch roles (${resp.statusCode})`;
        if (mountedRef.current) {
          setError(text);
          setMsg({ type: "error", text });
          setRoles([]);
        }
        // If unauthorized, redirect
        if (resp.statusCode === 401) handleUnauthorized();
        return;
      }

      // Success shapes: array | { roles: [] } | { data: [] }
      const body = resp.body;
      let list = [];
      if (Array.isArray(body)) list = body;
      else if (body && Array.isArray(body.roles)) list = body.roles;
      else if (body && Array.isArray(body.data)) list = body.data;
      else list = [];

      if (mountedRef.current) {
        setRoles(list);
        // show a one-time informational message if API provided one
        if (resp.message) setMsg({ type: "success", text: resp.message });
      }
    } catch (err) {
      console.error("loadRoles error:", err);
      if (mountedRef.current) {
        setError(err.message || "Could not load roles.");
        setMsg({ type: "error", text: err.message || "Could not load roles." });
        setRoles([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRolesLoading(false);
      }
    }
  };

  // initial automatic load: wait for session validate (de-duped in useSession) to avoid racing,
  // then call loadRoles (module-level promise prevents cancellation / dupes)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!initialized) {
          await validate({ force: false });
        }
      } catch (e) {
        // ignore; loadRoles will handle 401
      }
      if (!mounted) return;
      await loadRoles({ force: false });
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // manual refresh (bypass in-flight)
  const handleRefresh = async () => {
    await loadRoles({ force: true });
  };

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // filtered roles
  const filtered = useMemo(() => {
    if (!debouncedSearch) return roles;
    const q = debouncedSearch.toLowerCase();
    return roles.filter(
      (r) =>
        String(r.roleName || "")
          .toLowerCase()
          .includes(q) ||
        String(r.roleDesc || "")
          .toLowerCase()
          .includes(q) ||
        String(r.createdBy || "")
          .toLowerCase()
          .includes(q)
    );
  }, [roles, debouncedSearch]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [pageSize, totalPages, page]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // CSV export
  const exportCsv = () => {
    if (!filtered.length) {
      if (mountedRef.current)
        setMsg({ type: "error", text: "No roles to export." });
      return;
    }
    const headers = [
      "roleId",
      "roleName",
      "roleDesc",
      "activeFlag",
      "createdBy",
      "createdDate",
      "modifiedBy",
      "modifiedDate",
    ];
    const rows = filtered.map((r) => [
      r.roleId ?? "",
      r.roleName ?? "",
      r.roleDesc ?? "",
      r.activeFlag ?? "",
      r.createdBy ?? "",
      fmtDate(r.createdDate),
      r.modifiedBy ?? "",
      fmtDate(r.modifiedDate),
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
    a.download = `roles_export_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (mountedRef.current)
      setMsg({ type: "success", text: "Roles exported as CSV." });
  };

  return (
    <div className="viewrole-wrapper">
      <Sidebar />
      <div className="viewrole-content">
        <Header />

        <main
          className="viewrole-main"
          role="main"
          aria-labelledby="viewrole-title"
        >
          <div className="viewrole-header">
            <h2 id="viewrole-title">View Roles</h2>

            <div className="viewrole-controls">
              <div className="left-controls">
                <label className="search-label">
                  <input
                    type="search"
                    className="search-input"
                    placeholder="Search by role name, description or creator..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search roles"
                  />
                </label>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setMsg(null);
                  }}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              </div>

              <div className="right-controls">
                <label className="page-size-label">
                  Show
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="btn"
                  onClick={exportCsv}
                  disabled={!roles.length}
                  aria-label="Export CSV"
                >
                  Export CSV
                </button>

                <button
                  className="btn-ghost"
                  onClick={handleRefresh}
                  aria-label="Refresh roles"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Message banner */}
          {msg && (
            <div
              className={`viewrole-msg ${
                msg.type === "error" ? "error" : "success"
              }`}
              role={msg.type === "error" ? "alert" : "status"}
              onClick={() => setMsg(null)}
            >
              {msg.text}
            </div>
          )}

          <section className="table-panel" aria-live="polite">
            {loading || rolesLoading ? (
              <div className="state">Loading roles…</div>
            ) : error ? (
              <div className="state error">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="state">No roles found.</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table
                    className="role-table"
                    role="table"
                    aria-label="Roles table"
                  >
                    <thead>
                      <tr>
                        <th>Role ID</th>
                        <th>Role Name</th>
                        <th>Description</th>
                        <th>Active</th>
                        <th>Created By</th>
                        <th>Created Date</th>
                        <th>Modified By</th>
                        <th>Modified Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((r) => {
                        const active = isActiveFlag(r.activeFlag);
                        return (
                          <tr key={r.roleId}>
                            <td>{r.roleId}</td>
                            <td className="role-name">{r.roleName}</td>
                            <td className="wrap">{r.roleDesc ?? "-"}</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  active ? "active" : "inactive"
                                }`}
                              >
                                {active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>{r.createdBy ?? "-"}</td>
                            <td>{fmtDate(r.createdDate)}</td>
                            <td>{r.modifiedBy ?? "-"}</td>
                            <td>{fmtDate(r.modifiedDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pager">
                  <div className="pager-info">
                    Showing {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, filtered.length)} of{" "}
                    {filtered.length}
                  </div>

                  <div
                    className="pager-controls"
                    role="navigation"
                    aria-label="Pagination"
                  >
                    <button
                      className="btn-ghost"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      aria-label="First page"
                    >
                      « First
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      ‹ Prev
                    </button>
                    <span className="pager-current">
                      Page {page} /{" "}
                      {Math.max(1, Math.ceil(filtered.length / pageSize))}
                    </span>
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(Math.ceil(filtered.length / pageSize), p + 1)
                        )
                      }
                      disabled={page === Math.ceil(filtered.length / pageSize)}
                      aria-label="Next page"
                    >
                      Next ›
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        setPage(Math.ceil(filtered.length / pageSize))
                      }
                      disabled={page === Math.ceil(filtered.length / pageSize)}
                      aria-label="Last page"
                    >
                      Last »
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
