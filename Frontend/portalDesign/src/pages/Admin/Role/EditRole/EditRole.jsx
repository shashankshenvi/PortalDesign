// src/pages/Admin/Role/EditRole/EditRole.jsx
import React, { useEffect, useRef, useState } from "react";
import { FaEdit, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../../../hooks/useSession";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import "./EditRole.css";

const API_GET = "/api/role/getRoles";
const API_UPDATE = "/api/role/updateRole";

/**
 * EditRole - list roles, search, edit via modal with toggle switch
 * shows success/error banner under header
 *
 * Improvements:
 * - module-level in-flight promise (globalRolesPromise) prevents initial fetch from being
 *   canceled by StrictMode / other unmounts and dedupes simultaneous requests
 * - waits for useSession().validate() before initial fetch to avoid racing with session work
 * - safeFetch handles 401 -> redirect
 * - only active roles can be edited (UI + server-side check before update)
 */

/** helper: treat multiple representations as active */
const isActiveFlag = (val) =>
  val === 1 ||
  val === "1" ||
  val === true ||
  val === "true" ||
  val === "Y" ||
  val === "y";

const toNormalizedFlag = (val) => (isActiveFlag(val) ? 1 : 0);

/* raw fetch helper that returns parsed body when possible */
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

/* network call for roles - returns normalized object */
async function fetchRolesNetwork(getAuthHeader) {
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeader() || {}),
  };
  try {
    const { res, body } = await rawFetch(API_GET, { method: "GET", headers });
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

/* return promise for roles; reuse in-flight promise unless force === true */
function fetchRolesOnce(getAuthHeader, force = false) {
  if (globalRolesPromise && !force) return globalRolesPromise;

  globalRolesPromise = (async () => {
    try {
      const resp = await fetchRolesNetwork(getAuthHeader);
      return resp;
    } finally {
      // clear so manual refresh can create a new request
      globalRolesPromise = null;
    }
  })();

  return globalRolesPromise;
}

const EditRole = () => {
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [saving, setSaving] = useState(false);

  // message banner: { type: "success"|"error", text }
  const [msg, setMsg] = useState(null);

  const navigate = useNavigate();
  const mountedRef = useRef(true);

  // session hook - wait for validate before initial fetch to avoid races
  const { initialized, validate } = useSession();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // helper to get auth header (adjust key to your app)
  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // safeFetch used for updates - handles 401 -> redirect
  const safeFetch = async (url, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...getAuthHeader(),
    };
    const opts = { ...options, headers };
    const { res, body } = await rawFetch(url, opts);
    if (res.status === 401) {
      if (mountedRef.current)
        setMsg({
          type: "error",
          text: "Session expired. Redirecting to login.",
        });
      try {
        // optionally clear tokens here
      } catch {}
      navigate("/login");
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    return { res, body };
  };

  // load roles (module-level in-flight promise protects against cancels/duplicates)
  const loadRoles = async (opts = { force: false }) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setMsg(null);
    }

    try {
      const resp = await fetchRolesOnce(getAuthHeader, opts.force);

      if (!resp.ok) {
        const text =
          resp.error ||
          resp.message ||
          `Failed to load roles (${resp.statusCode})`;
        if (mountedRef.current) {
          setRoles([]);
          setError(text);
          setMsg({ type: "error", text });
        }
        if (resp.statusCode === 401 && mountedRef.current) {
          navigate("/login");
        }
        return;
      }

      const body = resp.body;
      let list = [];
      if (Array.isArray(body)) list = body;
      else if (body && Array.isArray(body.roles)) list = body.roles;
      else if (body && Array.isArray(body.data)) list = body.data;
      else list = [];

      if (mountedRef.current) {
        setRoles(list);
        if (resp.message) setMsg({ type: "success", text: resp.message });
      }
    } catch (err) {
      console.error("loadRoles error:", err);
      if (mountedRef.current) {
        setRoles([]);
        setError(err.message || "Unable to load roles.");
        setMsg({ type: "error", text: err.message || "Unable to load roles." });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // initial automatic load: wait for session validate (de-duped inside useSession) then fetch roles
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!initialized) await validate({ force: false });
      } catch (e) {
        // ignore - loadRoles will handle 401
      }
      if (!mounted) return;
      await loadRoles({ force: false });
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // manual refresh forces new network call
  const handleRefresh = async () => {
    await loadRoles({ force: true });
  };

  const filteredRoles = roles.filter((r) =>
    String(r.roleName || "")
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase())
  );

  const handleEditClick = (role) => {
    // only allow editing active roles (UI guard)
    if (!isActiveFlag(role.activeFlag)) {
      setMsg({ type: "error", text: "Only active roles can be edited." });
      return;
    }

    setSelectedRole({
      ...role,
      // normalize activeFlag to 1/0
      activeFlag: toNormalizedFlag(role.activeFlag),
    });
    setPopupOpen(true);
    document.body.style.overflow = "hidden";
    setMsg(null);
  };

  const closeModal = () => {
    setPopupOpen(false);
    setSelectedRole(null);
    document.body.style.overflow = "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedRole((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleActive = (checked) => {
    setSelectedRole((prev) => ({ ...prev, activeFlag: checked ? 1 : 0 }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    // server-side check: ensure active before sending update
    if (!isActiveFlag(selectedRole.activeFlag)) {
      setMsg({ type: "error", text: "Cannot update an inactive role." });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const payload = {
        ...selectedRole,
        modifiedBy: localStorage.getItem("userName") || "SYSTEM",
        activeFlag:
          selectedRole.activeFlag === 0 || selectedRole.activeFlag === 1
            ? selectedRole.activeFlag
            : 1,
      };

      const { res, body } = await safeFetch(API_UPDATE, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responseBody = body || {};
      if (!res.ok) {
        const text =
          responseBody?.status || responseBody?.message || "Update failed.";
        if (mountedRef.current) setMsg({ type: "error", text });
      } else {
        const text = responseBody?.message || "Role updated successfully.";
        if (mountedRef.current) setMsg({ type: "success", text });
        // reload list after success (force fresh network call)
        await loadRoles({ force: true });
        closeModal();
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("Update request aborted");
      } else {
        console.error("Update error:", err);
        if (mountedRef.current)
          setMsg({ type: "error", text: "Network error. Try again." });
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <div className="editrole-wrapper">
      <Sidebar />
      <div className="editrole-content">
        <Header />

        <main
          className="editrole-main"
          role="main"
          aria-labelledby="role-title"
        >
          <div className="editrole-header">
            <div>
              <h2 id="role-title" className="page-heading">
                Manage Roles
              </h2>
              <p className="page-sub">
                Create, edit and toggle role availability. Click a role's edit
                icon to modify it.
              </p>
            </div>

            <div className="editrole-controls">
              <div className="search-group">
                <input
                  className="search-input"
                  type="search"
                  placeholder="Search role name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search roles"
                />
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setMsg(null);
                  }}
                  aria-label="Clear search"
                >
                  Clear
                </button>
                <button
                  className="btn-ghost"
                  onClick={handleRefresh}
                  aria-label="Refresh roles"
                >
                  ⟳
                </button>
              </div>
            </div>
          </div>

          {/* message banner */}
          {msg && (
            <div
              className={`role-msg ${
                msg.type === "error" ? "error" : "success"
              }`}
              role={msg.type === "error" ? "alert" : "status"}
              onClick={() => setMsg(null)}
            >
              {msg.text}
            </div>
          )}

          <section className="role-table-panel">
            {loading ? (
              <div className="state">Loading roles...</div>
            ) : error ? (
              <div className="state error">{error}</div>
            ) : filteredRoles.length === 0 ? (
              <div className="state">No roles found.</div>
            ) : (
              <div className="table-wrap">
                <table className="role-table" role="table" aria-label="Roles">
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
                      <th className="col-action">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRoles.map((r) => {
                      const active = isActiveFlag(r.activeFlag);
                      return (
                        <tr key={r.roleId}>
                          <td>{r.roleId}</td>
                          <td className="role-name">{r.roleName}</td>
                          <td className="wrap">{r.roleDesc}</td>
                          <td>
                            <span
                              className={`active-badge ${
                                active ? "on" : "off"
                              }`}
                            >
                              {active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{r.createdBy ?? "-"}</td>
                          <td>
                            {r.createdDate
                              ? new Date(r.createdDate).toLocaleString()
                              : "-"}
                          </td>
                          <td>{r.modifiedBy ?? "-"}</td>
                          <td>
                            {r.modifiedDate
                              ? new Date(r.modifiedDate).toLocaleString()
                              : "-"}
                          </td>
                          <td className="col-action">
                            <button
                              className={`icon-btn edit-icon ${
                                !active ? "disabled" : ""
                              }`}
                              aria-label={`Edit ${r.roleName}`}
                              onClick={() => handleEditClick(r)}
                              title={
                                active
                                  ? "Edit role"
                                  : "Cannot edit inactive role"
                              }
                              disabled={!active}
                              aria-disabled={!active}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        <Footer />
      </div>

      {/* Modal */}
      {popupOpen && selectedRole && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" role="document">
            <header className="modal-head">
              <div>
                <h3>Edit Role</h3>
                <div className="modal-sub">{selectedRole.roleName}</div>
              </div>
              <button
                className="modal-close"
                aria-label="Close"
                onClick={closeModal}
              >
                <FaTimes />
              </button>
            </header>

            <form className="modal-body" onSubmit={handleUpdate}>
              <label className="field">
                <span className="field-label">Role name</span>
                <input
                  name="roleName"
                  type="text"
                  value={selectedRole.roleName || ""}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </label>

              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  name="roleDesc"
                  rows={3}
                  value={selectedRole.roleDesc || ""}
                  onChange={handleChange}
                  disabled={saving}
                />
              </label>

              <div className="toggle-row">
                <div className="field-label">Active</div>
                <div className="toggle-wrapper">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedRole.activeFlag === 1}
                    className={`toggle ${
                      selectedRole.activeFlag === 1 ? "on" : ""
                    }`}
                    onClick={() =>
                      handleToggleActive(!(selectedRole.activeFlag === 1))
                    }
                    disabled={saving}
                  >
                    <span className="knob" />
                  </button>
                  <span className="toggle-label">
                    {selectedRole.activeFlag === 1 ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRole;
