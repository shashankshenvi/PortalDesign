// src/pages/ProfilePage/ProfilePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { useSession } from "../../hooks/useSession";
import "./ProfilePage.css";

/**
 * ProfilePage (robust)
 * - supports overrideUserName (when embedded in admin modal)
 * - accepts onClose callback (modal close)
 * - dedupes initial requests per userName using module-level promises
 * - waits for session validate() to avoid races
 * - redirects to /login on 401
 */

/* Module-level map so concurrent mounts for same user reuse the same request */
const profilePromisesByUser = new Map();
const rolesPromiseSingleton = { promise: null };

/* rawFetch helper (returns { res, body }) */
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

/* network: get user details (POST) */
async function fetchUserNetwork(userName, getAuthHeader, signal) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...(getAuthHeader() || {}),
    };
    const { res, body } = await rawFetch("/api/user/getUserDetails", {
      method: "POST",
      headers,
      body: JSON.stringify({ userName }),
      signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      body,
      message: (body && (body.message || body.msg)) || null,
      error: (body && (body.error || body.err || body.status)) || null,
    };
  } catch (err) {
    // pass through aborts and network errors
    throw err;
  }
}

/* network: get all roles (GET) -- singleton promise */
async function fetchRolesNetwork(getAuthHeader, signal) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...(getAuthHeader() || {}),
    };
    const { res, body } = await rawFetch("/api/role/getRoles", {
      method: "GET",
      headers,
      signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      body,
      message: (body && (body.message || body.msg)) || null,
      error: (body && (body.error || body.err || body.status)) || null,
    };
  } catch (err) {
    throw err;
  }
}

/* fetchOnce per userName: reuses in-flight promise to avoid duplicates (keyed by userName) */
function fetchUserOnce(userName, getAuthHeader, signal) {
  // if there's already a promise for this user, return it (it will still attach to same signal)
  if (profilePromisesByUser.has(userName))
    return profilePromisesByUser.get(userName);

  const p = (async () => {
    try {
      const resp = await fetchUserNetwork(userName, getAuthHeader, signal);
      return resp;
    } finally {
      // clear so future forced refreshes will create a new request
      profilePromisesByUser.delete(userName);
    }
  })();

  profilePromisesByUser.set(userName, p);
  return p;
}

/* singleton fetchOnce for roles */
function fetchRolesOnce(getAuthHeader, signal, force = false) {
  if (rolesPromiseSingleton.promise && !force)
    return rolesPromiseSingleton.promise;

  rolesPromiseSingleton.promise = (async () => {
    try {
      const resp = await fetchRolesNetwork(getAuthHeader, signal);
      return resp;
    } finally {
      rolesPromiseSingleton.promise = null;
    }
  })();

  return rolesPromiseSingleton.promise;
}

const ProfilePage = ({ overrideUserName, onClose }) => {
  const [userData, setUserData] = useState({
    userId: null,
    userName: "",
    firstName: "",
    lastName: "",
    emailId: "",
    contactNumber: "",
    password: "",
  });

  const [originalData, setOriginalData] = useState(null);
  const [editable, setEditable] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [assignedRoles, setAssignedRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const navigate = useNavigate();
  const { initialized, validate } = useSession();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        abortRef.current?.abort();
      } catch {}
    };
  }, []);

  // auth header helper
  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // unified message setter from API normalized response
  const setMessageFromApi = (apiResp) => {
    if (!apiResp) return false;
    if (apiResp.error) {
      if (mountedRef.current)
        setMessage({ type: "error", text: String(apiResp.error) });
      return true;
    }
    if (apiResp.message) {
      if (mountedRef.current)
        setMessage({ type: "success", text: String(apiResp.message) });
      return true;
    }
    return false;
  };

  const handleUnauthorized = () => {
    if (mountedRef.current)
      setMessage({
        type: "error",
        text: "Session expired. Redirecting to login.",
      });
    try {
      // optionally clear tokens
    } catch {}
    navigate("/login");
  };

  // Main fetcher: gets user details and roles. Uses fetchOnce helpers to dedupe.
  const fetchUserDetailsAndRoles = async (opts = { forceRoles: false }) => {
    // abort previous requests
    try {
      abortRef.current?.abort();
    } catch {}
    abortRef.current = new AbortController();

    if (mountedRef.current) {
      setLoading(true);
      setMessage(null);
    }

    try {
      // determine userName
      const fromStorage = localStorage.getItem("userName");
      const userName = overrideUserName || fromStorage;
      if (!userName) {
        if (mountedRef.current)
          setMessage({ type: "error", text: "No user found." });
        return;
      }

      // Ensure session validated (de-duped in useSession)
      try {
        if (!initialized) await validate({ force: false });
      } catch (e) {
        // ignore; we'll handle 401s later
      }

      // get user details (deduped per userName)
      let userResp;
      try {
        userResp = await fetchUserOnce(
          userName,
          getAuthHeader,
          abortRef.current.signal
        );
      } catch (err) {
        if (err.name === "AbortError") {
          // aborted; just exit silently
          return;
        }
        throw err;
      }

      // if backend returned message or error in body, show and stop
      if (setMessageFromApi(userResp)) {
        // reset UI data to empty to avoid stale render
        if (mountedRef.current) {
          setUserData({
            userId: null,
            userName: "",
            firstName: "",
            lastName: "",
            emailId: "",
            contactNumber: "",
            password: "",
          });
          setOriginalData(null);
          setAssignedRoles([]);
          setAvailableRoles([]);
          setLoading(false);
        }
        return;
      }

      if (!userResp.ok || !userResp.body) {
        if (mountedRef.current) {
          setMessage({ type: "error", text: "Failed to fetch user details." });
          setUserData({
            userId: null,
            userName: "",
            firstName: "",
            lastName: "",
            emailId: "",
            contactNumber: "",
            password: "",
          });
          setOriginalData(null);
          setAssignedRoles([]);
          setAvailableRoles([]);
        }
        if (userResp.status === 401) handleUnauthorized();
        return;
      }

      const user = userResp.body;

      // fetch roles in parallel — use singleton promise to dedupe if many components request roles
      let rolesResp;
      try {
        rolesResp = await fetchRolesOnce(
          getAuthHeader,
          abortRef.current.signal,
          opts.forceRoles
        );
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        throw err;
      }

      // If roles call returned an API-level error/message, show error but continue to set user fields
      if (rolesResp && rolesResp.error) {
        if (mountedRef.current) {
          setMessage({ type: "error", text: String(rolesResp.error) });
          // set user fields but empty role lists
          setUserData({
            userId: user.userId ?? null,
            userName: user.userName ?? "",
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            emailId: user.emailId ?? "",
            contactNumber: user.contactNumber ?? "",
            password: user.password ?? "",
          });
          setOriginalData({
            userId: user.userId ?? null,
            userName: user.userName ?? "",
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            emailId: user.emailId ?? "",
            contactNumber: user.contactNumber ?? "",
            password: user.password ?? "",
            roleIdFk: Array.isArray(user.roleIdFk) ? user.roleIdFk : [],
          });
          setAssignedRoles([]);
          setAvailableRoles([]);
        }
        if (rolesResp.status === 401) handleUnauthorized();
        return;
      }

      if (!rolesResp || !rolesResp.ok || !rolesResp.body) {
        // roles fetch failed non-fatally
        if (mountedRef.current) {
          setMessage({ type: "error", text: "Failed to fetch roles." });
          setUserData({
            userId: user.userId ?? null,
            userName: user.userName ?? "",
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            emailId: user.emailId ?? "",
            contactNumber: user.contactNumber ?? "",
            password: user.password ?? "",
          });
          setOriginalData({
            userId: user.userId ?? null,
            userName: user.userName ?? "",
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            emailId: user.emailId ?? "",
            contactNumber: user.contactNumber ?? "",
            password: user.password ?? "",
            roleIdFk: Array.isArray(user.roleIdFk) ? user.roleIdFk : [],
          });
          setAssignedRoles([]);
          setAvailableRoles([]);
        }
        return;
      }

      const allRoles = rolesResp.body;
      const userRoleIds = Array.isArray(user.roleIdFk) ? user.roleIdFk : [];
      const assigned = allRoles.filter((r) => userRoleIds.includes(r.roleId));
      const available = allRoles.filter((r) => !userRoleIds.includes(r.roleId));

      if (mountedRef.current) {
        setUserData({
          userId: user.userId ?? null,
          userName: user.userName ?? "",
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          emailId: user.emailId ?? "",
          contactNumber: user.contactNumber ?? "",
          password: user.password ?? "",
        });

        setOriginalData({
          userId: user.userId ?? null,
          userName: user.userName ?? "",
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          emailId: user.emailId ?? "",
          contactNumber: user.contactNumber ?? "",
          password: user.password ?? "",
          roleIdFk: userRoleIds,
        });

        setAssignedRoles(assigned);
        setAvailableRoles(available);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // aborted intentionally
        return;
      }
      console.error("fetchUserDetailsAndRoles error:", err);
      if (mountedRef.current) {
        setMessage({
          type: "error",
          text: "Failed to load profile. Try again.",
        });
        setUserData({
          userId: null,
          userName: "",
          firstName: "",
          lastName: "",
          emailId: "",
          contactNumber: "",
          password: "",
        });
        setOriginalData(null);
        setAssignedRoles([]);
        setAvailableRoles([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // call fetch when overrideUserName changes or on mount.
    fetchUserDetailsAndRoles({ forceRoles: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideUserName]);

  const toggleEdit = (field) => {
    setEditable((prev) => ({ ...prev, [field]: !prev[field] }));
    setMessage(null);
  };

  const handleFieldChange = (field, value) => {
    setUserData((p) => ({ ...p, [field]: value }));
  };

  const addRole = (role) => {
    setAssignedRoles((prev) => [...prev, role]);
    setAvailableRoles((prev) => prev.filter((r) => r.roleId !== role.roleId));
  };

  const removeRole = (role) => {
    setAvailableRoles((prev) => [...prev, role]);
    setAssignedRoles((prev) => prev.filter((r) => r.roleId !== role.roleId));
  };

  const isModified = () => {
    if (!originalData) return false;
    const basicChanged =
      userData.firstName !== originalData.firstName ||
      userData.lastName !== originalData.lastName ||
      userData.emailId !== originalData.emailId ||
      userData.contactNumber !== originalData.contactNumber;
    const rolesChanged =
      JSON.stringify(assignedRoles.map((r) => r.roleId).sort()) !==
      JSON.stringify((originalData.roleIdFk || []).slice().sort());
    const passwordChanged = newPassword.length > 0 || retypePassword.length > 0;
    return basicChanged || rolesChanged || passwordChanged;
  };

  const validateBeforeSubmit = () => {
    if ((newPassword || retypePassword) && newPassword !== retypePassword) {
      setMessage({
        type: "error",
        text: "New password and retype do not match.",
      });
      return false;
    }
    if (userData.emailId && !/^\S+@\S+\.\S+$/.test(userData.emailId)) {
      setMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return false;
    }
    if (newPassword && newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters.",
      });
      return false;
    }
    return true;
  };

  // POST update profile (safe) - uses the same api shape as before but with 401 handling
  const handleSubmit = async () => {
    setMessage(null);
    if (!isModified()) {
      setMessage({ type: "error", text: "No changes to save." });
      return;
    }
    if (!validateBeforeSubmit()) return;

    setSaving(true);
    try {
      const payload = {
        userId: userData.userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailId: userData.emailId,
        contactNumber: userData.contactNumber,
        roleIdFk: assignedRoles.map((r) => r.roleId),
        newPassword: newPassword || undefined,
      };

      // build headers with auth
      const headers = {
        "Content-Type": "application/json",
        ...(getAuthHeader() || {}),
      };

      const { res, body } = await rawFetch("/api/user/updateProfile", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        setSaving(false);
        return;
      }

      const apiResp = {
        ok: res.ok,
        status: res.status,
        body,
        message: (body && (body.message || body.msg)) || null,
        error: (body && (body.error || body.err || body.status)) || null,
      };

      if (setMessageFromApi(apiResp)) {
        // if successful message present, refresh
        if (apiResp.message) {
          setNewPassword("");
          setRetypePassword("");
          setEditable({});
          // force refresh roles & user details so admin changes reflect immediately
          await fetchUserDetailsAndRoles({ forceRoles: true });
        }
        setSaving(false);
        return;
      }

      if (!apiResp.ok) {
        setMessage({
          type: "error",
          text:
            apiResp.body?.status || apiResp.body?.message || "Update failed.",
        });
        setSaving(false);
        return;
      }

      // fallback: success
      setMessage({ type: "success", text: "Profile updated." });
      setNewPassword("");
      setRetypePassword("");
      setEditable({});
      await fetchUserDetailsAndRoles({ forceRoles: true });
    } catch (err) {
      if (err.name === "AbortError") {
        // aborted
      } else {
        console.error("Update failed:", err);
        setMessage({ type: "error", text: "Update failed. Try again." });
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleCancel = () => {
    // reset fields
    if (originalData) {
      setUserData({
        userId: originalData.userId,
        userName: originalData.userName,
        firstName: originalData.firstName,
        lastName: originalData.lastName,
        emailId: originalData.emailId,
        contactNumber: originalData.contactNumber,
        password: originalData.password ?? "",
      });
      setNewPassword("");
      setRetypePassword("");
      setEditable({});
      setMessage(null);
    }

    // if onClose provided, call it to close modal context
    if (typeof onClose === "function") {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container" role="main">
        <h2 className="profile-title">User Profile</h2>

        {message && (
          <div className={`profile-msg ${message.type}`}>
            <span>{message.text}</span>
            <button
              className="msg-close"
              onClick={() => setMessage(null)}
              aria-label="Close message"
            >
              <FaTimes />
            </button>
          </div>
        )}

        <div className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={userData.userName} disabled />
            </div>

            <div className="form-group">
              <label>First name</label>
              <div className="edit-field">
                <input
                  type="text"
                  value={userData.firstName}
                  disabled={!editable.firstName}
                  onChange={(e) =>
                    handleFieldChange("firstName", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={!!editable.firstName}
                  onClick={() => toggleEdit("firstName")}
                  title="Edit first name"
                >
                  <FaEdit />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Last name</label>
              <div className="edit-field">
                <input
                  type="text"
                  value={userData.lastName}
                  disabled={!editable.lastName}
                  onChange={(e) =>
                    handleFieldChange("lastName", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={!!editable.lastName}
                  onClick={() => toggleEdit("lastName")}
                  title="Edit last name"
                >
                  <FaEdit />
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <div className="edit-field">
                <input
                  type="email"
                  value={userData.emailId}
                  disabled={!editable.emailId}
                  onChange={(e) => handleFieldChange("emailId", e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={!!editable.emailId}
                  onClick={() => toggleEdit("emailId")}
                  title="Edit email"
                >
                  <FaEdit />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Mobile</label>
              <div className="edit-field">
                <input
                  type="tel"
                  value={userData.contactNumber}
                  disabled={!editable.contactNumber}
                  onChange={(e) =>
                    handleFieldChange("contactNumber", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={!!editable.contactNumber}
                  onClick={() => toggleEdit("contactNumber")}
                  title="Edit mobile"
                >
                  <FaEdit />
                </button>
              </div>
            </div>
          </div>

          <div className="form-row password-row">
            <div className="form-group password-group">
              <label>Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={userData.password || ""}
                  disabled
                  readOnly
                />
                <button
                  className="icon-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={!!editable.password}
                  onClick={() => toggleEdit("password")}
                  title="Change password"
                >
                  <FaEdit />
                </button>
              </div>

              {editable.password && (
                <div className="password-edit">
                  <input
                    type="password"
                    placeholder="New password (min 6 chars)"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Retype new password"
                    minLength={6}
                    value={retypePassword}
                    onChange={(e) => setRetypePassword(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="roles-title">Roles</h3>
        <div className="roles-section">
          <div className="role-box">
            <h4>Available Roles</h4>
            {availableRoles.length === 0 ? (
              <p className="muted">No available roles</p>
            ) : (
              <ul className="role-list">
                {availableRoles.map((r) => (
                  <li key={r.roleId}>
                    <div className="role-row">
                      <div className="role-info">
                        <strong>{r.roleName}</strong>
                        <div className="role-sub">{r.roleDesc}</div>
                      </div>
                      <button
                        className="btn tiny"
                        onClick={() => addRole(r)}
                        aria-label={`Add ${r.roleName}`}
                      >
                        Add
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="role-box">
            <h4>Assigned Roles</h4>
            {assignedRoles.length === 0 ? (
              <p className="muted">No assigned roles</p>
            ) : (
              <ul className="role-list">
                {assignedRoles.map((r) => (
                  <li key={r.roleId}>
                    <div className="role-row">
                      <div className="role-info">
                        <strong>{r.roleName}</strong>
                        <div className="role-sub">{r.roleDesc}</div>
                      </div>
                      <button
                        className="btn tiny btn-outline"
                        onClick={() => removeRole(r)}
                        aria-label={`Remove ${r.roleName}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn btn-outline" onClick={handleCancel}>
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!isModified() || saving}
            aria-busy={saving}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <FaSave style={{ marginRight: 8 }} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
