// src/pages/Admin/Role/ViewUser/ViewUser.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../../../hooks/useSession";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import "./ViewUser.css";

/**
 * ViewUser (improved controls layout + robust fetching)
 *
 * - Module-level in-flight promises dedupe and protect initial fetches from cancellation
 * - Waits for session validate() before automatic fetch to avoid races
 * - Handles 401 by redirecting to /login
 * - Adds a Refresh button to force fresh fetches
 */

const DEFAULT_PAGE_SIZE = 10;
const API_USERS = "/api/user/getAllUsers";
const API_ROLES = "/api/role/getRoles";

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const headCols = [
  { key: "userId", label: "User ID" },
  { key: "userName", label: "Username" },
  { key: "firstName", label: "First" },
  { key: "lastName", label: "Last" },
  { key: "role", label: "Role" },
  { key: "emailId", label: "Email" },
  { key: "contactNumber", label: "Contact" },
  { key: "createdBy", label: "Created By" },
  { key: "createdDate", label: "Created Date" },
  { key: "approvedBy", label: "Approved By" },
  { key: "approvedDate", label: "Approved Date" },
];

/* rawFetch helper */
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

/* Module-level in-flight promises to dedupe network calls */
let globalUsersPromise = null;
let globalRolesPromise = null;

/* Network call wrappers */
async function fetchUsersNetwork(getAuthHeader) {
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeader() || {}),
  };
  try {
    const { res, body } = await rawFetch(API_USERS, { method: "GET", headers });
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

/* fetchOnce functions reuse existing promise unless force===true */
function fetchUsersOnce(getAuthHeader, force = false) {
  if (globalUsersPromise && !force) return globalUsersPromise;
  globalUsersPromise = (async () => {
    try {
      return await fetchUsersNetwork(getAuthHeader);
    } finally {
      globalUsersPromise = null;
    }
  })();
  return globalUsersPromise;
}

function fetchRolesOnce(getAuthHeader, force = false) {
  if (globalRolesPromise && !force) return globalRolesPromise;
  globalRolesPromise = (async () => {
    try {
      return await fetchRolesNetwork(getAuthHeader);
    } finally {
      globalRolesPromise = null;
    }
  })();
  return globalRolesPromise;
}

const ViewUser = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [sortBy, setSortBy] = useState({ key: "userId", dir: "asc" });

  const [selectedUser, setSelectedUser] = useState(null); // for modal

  // message banner state: { type: "success"|"error", text }
  const [msg, setMsg] = useState(null);

  const mountedRef = useRef(true);
  const navigate = useNavigate();
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

  // handle unauthorized
  const handleUnauthorized = () => {
    if (mountedRef.current)
      setMsg({ type: "error", text: "Session expired. Redirecting to login." });
    try {
      // optional: clear tokens
    } catch {}
    navigate("/login");
  };

  // load users (uses module-level promise)
  const loadUsers = async (opts = { force: false }) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setMsg(null);
    }

    try {
      const resp = await fetchUsersOnce(getAuthHeader, opts.force);

      if (!resp.ok) {
        const text =
          resp.error ||
          resp.message ||
          `Failed to load users (${resp.statusCode})`;
        if (mountedRef.current) {
          setUsers([]);
          setError(text);
          setMsg({ type: "error", text });
        }
        if (resp.statusCode === 401) handleUnauthorized();
        return;
      }

      const body = resp.body;
      const list = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.users)
        ? body.users
        : [];

      if (mountedRef.current) setUsers(list);
    } catch (err) {
      console.error("loadUsers error:", err);
      if (mountedRef.current) {
        setUsers([]);
        setError(err.message || "Failed to load users.");
        setMsg({ type: "error", text: err.message || "Failed to load users." });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // load roles (uses module-level promise)
  const loadRoles = async (opts = { force: false }) => {
    if (mountedRef.current) setRolesLoading(true);

    try {
      const resp = await fetchRolesOnce(getAuthHeader, opts.force);

      if (!resp.ok) {
        const text =
          resp.error ||
          resp.message ||
          `Failed to load roles (${resp.statusCode})`;
        if (mountedRef.current) {
          setRoles([]);
          setMsg({ type: "error", text });
        }
        if (resp.statusCode === 401) handleUnauthorized();
        return;
      }

      const body = resp.body;
      const list = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.roles)
        ? body.roles
        : [];

      if (mountedRef.current) setRoles(list);
    } catch (err) {
      console.error("loadRoles error:", err);
      if (mountedRef.current) setRoles([]);
    } finally {
      if (mountedRef.current) setRolesLoading(false);
    }
  };

  // Automatic initial fetch: wait for session validation (de-duped in useSession), then load both
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!initialized) {
          await validate({ force: false });
        }
      } catch (e) {
        // ignore - load* will handle 401
      }
      if (!mounted) return;
      // load roles & users in parallel (both protected by module-level promises)
      await Promise.all([
        loadRoles({ force: false }),
        loadUsers({ force: false }),
      ]);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // manual refresh button forces fresh network calls
  const handleRefresh = async () => {
    setPage(1);
    await Promise.all([loadRoles({ force: true }), loadUsers({ force: true })]);
  };

  // role lookup map
  const roleMap = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(r.roleId, r.roleName));
    return m;
  }, [roles]);

  const roleNameFrom = (roleOrArr) => {
    if (!roleOrArr) return "-";
    if (Array.isArray(roleOrArr)) {
      return roleOrArr.map((id) => roleMap.get(id) || id).join(", ");
    }
    return roleMap.get(roleOrArr) || roleOrArr;
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim()), 260);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // filtered
  const filtered = useMemo(() => {
    if (!debounced) return users;
    const q = debounced.toLowerCase();
    return users.filter((u) => {
      return (
        String(u.userName || "")
          .toLowerCase()
          .includes(q) ||
        String(u.firstName || "")
          .toLowerCase()
          .includes(q) ||
        String(u.lastName || "")
          .toLowerCase()
          .includes(q) ||
        String(u.emailId || "")
          .toLowerCase()
          .includes(q) ||
        String(u.contactNumber || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [users, debounced]);

  // sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sortBy;
    if (!key) return arr;
    arr.sort((a, b) => {
      let va, vb;
      switch (key) {
        case "role":
          va = roleNameFrom(a.roleIdFk?.[0] ?? a.roleIdFk) || "";
          vb = roleNameFrom(b.roleIdFk?.[0] ?? b.roleIdFk) || "";
          return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "createdDate":
        case "approvedDate":
          va = a[key] || "";
          vb = b[key] || "";
          return dir === "asc"
            ? new Date(va) - new Date(vb)
            : new Date(vb) - new Date(va);
        default:
          va = String(a[key] ?? "").toLowerCase();
          vb = String(b[key] ?? "").toLowerCase();
          return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
    });
    return arr;
  }, [filtered, sortBy, roleMap]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [pageSize, totalPages, page]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // CSV export (filtered / sorted)
  const exportCsv = () => {
    try {
      if (!sorted.length) {
        setMsg({ type: "error", text: "No users to export." });
        return;
      }
      const headers = [
        "userId",
        "userName",
        "firstName",
        "lastName",
        "roleName",
        "emailId",
        "contactNumber",
        "createdBy",
        "createdDate",
        "approvedBy",
        "approvedDate",
      ];
      const rows = sorted.map((u) => [
        u.userId ?? "",
        u.userName ?? "",
        u.firstName ?? "",
        u.lastName ?? "",
        roleNameFrom(u.roleIdFk?.[0] ?? u.roleIdFk),
        u.emailId ?? "",
        u.contactNumber ?? "",
        u.createdBy ?? "",
        formatDate(u.createdDate),
        u.approvedBy ?? "",
        formatDate(u.approvedDate),
      ]);
      const csv =
        [headers.join(",")]
          .concat(
            rows.map((r) =>
              r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
            )
          )
          .join("\n") + "\n";

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.csv`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMsg({ type: "success", text: "Users exported as CSV." });
    } catch (err) {
      console.error("Export CSV error:", err);
      setMsg({ type: "error", text: "Failed to export CSV." });
    }
  };

  const toggleSort = (key) => {
    setSortBy((s) => {
      if (s.key === key) return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "asc" };
    });
  };

  // modal: simple details
  const openDetails = (u) => setSelectedUser(u);
  const closeDetails = () => setSelectedUser(null);

  return (
    <div className="viewuser-wrapper">
      <Sidebar />
      <div className="viewuser-content">
        <Header />
        <main
          className="viewuser-main"
          role="main"
          aria-labelledby="viewuser-title"
        >
          <div className="viewuser-header">
            <h2 id="viewuser-title">View Users</h2>

            {/* Controls row: left = search & clear, right = page-size + export */}
            <div className="viewuser-controls full-width">
              <div className="controls-left">
                <div className="search-wrap" role="search">
                  <input
                    className="search-input"
                    aria-label="Search users"
                    type="search"
                    placeholder="Search name, username, email or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setSearchTerm("");
                      setDebounced("");
                      setMsg(null);
                    }}
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="controls-right">
                <label className="page-size-label" aria-label="Rows per page">
                  Show
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Select page size"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>

                <button
                  className="btn"
                  onClick={exportCsv}
                  disabled={!users.length}
                  aria-label="Export CSV"
                >
                  Export CSV
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={handleRefresh}
                  aria-label="Refresh users and roles"
                >
                  ⟳ Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Message banner — success / error */}
          {msg && (
            <div
              className={`view-msg ${
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
              <div className="loading">Loading...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : sorted.length === 0 ? (
              <div className="empty">No users found.</div>
            ) : (
              <>
                <div
                  className="table-wrap"
                  role="region"
                  aria-label="Users table"
                >
                  <table className="user-table" role="table">
                    <thead>
                      <tr role="row">
                        {headCols.map((c) => {
                          const activeKey = sortBy.key;
                          const active = activeKey === c.key;
                          const indicator = active
                            ? sortBy.dir === "asc"
                              ? "▲"
                              : "▼"
                            : "↕";
                          return (
                            <th
                              key={c.key}
                              role="columnheader"
                              scope="col"
                              onClick={() => toggleSort(c.key)}
                              className={`col-sort ${active ? "active" : ""}`}
                              aria-sort={
                                active
                                  ? sortBy.dir === "asc"
                                    ? "ascending"
                                    : "descending"
                                  : "none"
                              }
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ")
                                  toggleSort(c.key);
                              }}
                            >
                              <span>{c.label}</span>
                              <span className="sort-indicator">
                                {indicator}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {pageData.map((u) => (
                        <tr
                          key={u.userId}
                          onClick={() => openDetails(u)}
                          tabIndex={0}
                          role="row"
                          className="clickable-row"
                          aria-label={`Open details for ${u.userName}`}
                        >
                          <td>{u.userId}</td>
                          <td className="mono">{u.userName}</td>
                          <td>{u.firstName}</td>
                          <td>{u.lastName}</td>
                          <td>
                            <span className="role-pill">
                              {roleNameFrom(u.roleIdFk?.[0] ?? u.roleIdFk)}
                            </span>
                          </td>
                          <td className="wrap">
                            <span className="truncate">{u.emailId ?? "-"}</span>
                          </td>
                          <td>{u.contactNumber ?? "-"}</td>
                          <td>{u.createdBy ?? "-"}</td>
                          <td>{formatDate(u.createdDate)}</td>
                          <td>{u.approvedBy ?? "-"}</td>
                          <td>{formatDate(u.approvedDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pager">
                  <div className="pager-info">
                    Showing {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, sorted.length)} of{" "}
                    {sorted.length}
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
                      Page {page} / {totalPages}
                    </span>
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      aria-label="Next page"
                    >
                      Next ›
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
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

      {/* Details modal */}
      {selectedUser && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="User details"
        >
          <div className="modal">
            <header className="modal-header">
              <h3>User Details — {selectedUser.userName}</h3>
              <button
                className="btn-ghost"
                onClick={closeDetails}
                aria-label="Close"
              >
                Close
              </button>
            </header>
            <div className="modal-body">
              <div className="details-grid">
                <div>
                  <strong>User ID</strong>
                </div>
                <div>{selectedUser.userId}</div>
                <div>
                  <strong>Username</strong>
                </div>
                <div className="mono">{selectedUser.userName}</div>
                <div>
                  <strong>First name</strong>
                </div>
                <div>{selectedUser.firstName}</div>
                <div>
                  <strong>Last name</strong>
                </div>
                <div>{selectedUser.lastName}</div>
                <div>
                  <strong>Role(s)</strong>
                </div>
                <div>
                  {roleNameFrom(
                    selectedUser.roleIdFk?.[0] ?? selectedUser.roleIdFk
                  )}
                </div>
                <div>
                  <strong>Email</strong>
                </div>
                <div>{selectedUser.emailId ?? "-"}</div>
                <div>
                  <strong>Contact</strong>
                </div>
                <div>{selectedUser.contactNumber ?? "-"}</div>
                <div>
                  <strong>Created By</strong>
                </div>
                <div>{selectedUser.createdBy ?? "-"}</div>
                <div>
                  <strong>Created Date</strong>
                </div>
                <div>{formatDate(selectedUser.createdDate)}</div>
                <div>
                  <strong>Approved By</strong>
                </div>
                <div>{selectedUser.approvedBy ?? "-"}</div>
                <div>
                  <strong>Approved Date</strong>
                </div>
                <div>{formatDate(selectedUser.approvedDate)}</div>
                <div>
                  <strong>Raw JSON</strong>
                </div>
                <div>
                  <pre className="raw-json">
                    {JSON.stringify(selectedUser, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn" onClick={closeDetails}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewUser;
