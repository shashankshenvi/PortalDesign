// src/pages/Admin/User/EditUser/EditUser.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit } from "react-icons/fa";
import { useSession } from "../../../../hooks/useSession";
import ProfilePage from "../../../ProfilePage/ProfilePage";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import "./EditUser.css";

const API_USERS = "/api/user/getAllUsers";
const API_ROLES = "/api/role/getRoles";

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

/* Network wrappers */
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

export default function EditUser() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState(null);

  // message banner state: { type: "success" | "error", text }
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

  const handleUnauthorized = () => {
    if (mountedRef.current)
      setMsg({ type: "error", text: "Session expired. Redirecting to login." });
    try {
      // optional: clear tokens here
    } catch {}
    navigate("/login");
  };

  // load users & roles using module-level promises (prevents canceled first request)
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
        setError(err.message || "Unable to load users.");
        setMsg({ type: "error", text: err.message || "Unable to load users." });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

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

  // automatic initial load: wait for session validate() then load (prevents session race)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!initialized) await validate({ force: false });
      } catch (e) {
        // ignore - load* will handle 401
      }
      if (!mounted) return;
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

  // manual refresh
  const handleRefresh = async () => {
    setSearchTerm("");
    setDebounced("");
    setPageToFirstIfNeeded();
    await Promise.all([loadRoles({ force: true }), loadUsers({ force: true })]);
  };

  // small helper that tries to reset page (if your UI had pagination)
  const setPageToFirstIfNeeded = () => {
    // placeholder - EditUser currently doesn't have a page state. Kept for parity with other pages.
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim()), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const roleMap = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(r.roleId, r.roleName));
    return m;
  }, [roles]);

  const getRoleName = (roleId) => roleMap.get(roleId) || "—";

  const filteredUsers = useMemo(() => {
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

  const handleEditClick = (userName) => {
    setSelectedUserName(userName);
    setPopupOpen(true);
    document.body.style.overflow = "hidden";
  };

  const handleCloseModal = () => {
    setPopupOpen(false);
    setSelectedUserName("");
    document.body.style.overflow = "";
    // optionally refresh users if ProfilePage makes changes
    // loadUsers({ force: true });
  };

  return (
    <div className="edituser-wrapper">
      <Sidebar />
      <div className="edituser-content">
        <Header />
        <main className="edituser-main" role="main">
          <div className="edituser-header">
            <h2>Edit Users</h2>

            <div className="edituser-controls">
              <div className="search-area">
                <input
                  className="search-input"
                  type="search"
                  placeholder="Search by username, name, email or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setDebounced("");
                    setMsg(null);
                    setError(null);
                  }}
                >
                  Clear
                </button>
                <button
                  className="btn-ghost"
                  onClick={handleRefresh}
                  title="Refresh"
                >
                  ⟳
                </button>
              </div>
            </div>
          </div>

          {/* Message banner — success / error */}
          {msg && (
            <div
              className={`edit-msg ${
                msg.type === "error" ? "error" : "success"
              }`}
              role={msg.type === "error" ? "alert" : "status"}
              onClick={() => setMsg(null)}
            >
              {msg.text}
            </div>
          )}

          <section className="edituser-table-panel">
            {loading || rolesLoading ? (
              <div className="state">Loading...</div>
            ) : error ? (
              <div className="state error">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="state">No users found.</div>
            ) : (
              <div className="table-wrap">
                <table className="edituser-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Username</th>
                      <th>First</th>
                      <th>Last</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Created By</th>
                      <th>Created Date</th>
                      <th>Approved By</th>
                      <th>Approved Date</th>
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.userId}>
                        <td>{u.userId}</td>
                        <td className="mono">{u.userName}</td>
                        <td>{u.firstName}</td>
                        <td>{u.lastName}</td>
                        <td>
                          <span className="role-pill">
                            {getRoleName(u.roleIdFk?.[0] ?? u.roleIdFk)}
                          </span>
                        </td>
                        <td className="wrap">{u.emailId}</td>
                        <td>{u.contactNumber}</td>
                        <td>{u.createdBy ?? "-"}</td>
                        <td>
                          {u.createdDate
                            ? new Date(u.createdDate).toLocaleString()
                            : "-"}
                        </td>
                        <td>{u.approvedBy ?? "-"}</td>
                        <td>
                          {u.approvedDate
                            ? new Date(u.approvedDate).toLocaleString()
                            : "-"}
                        </td>
                        <td className="col-action">
                          <button
                            className="icon-btn"
                            onClick={() => handleEditClick(u.userName)}
                          >
                            <FaEdit />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>

      {/* Modal */}
      {popupOpen && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Edit user — {selectedUserName}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <div className="edit-modal-body">
              <ProfilePage
                overrideUserName={selectedUserName}
                onClose={handleCloseModal}
                // optionally pass a callback to setMsg on successful save
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
