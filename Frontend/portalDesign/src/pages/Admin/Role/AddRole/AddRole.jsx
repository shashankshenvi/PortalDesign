import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import Layout from "../../../../components/Layout/Layout";
import "./AddRole.css";

const API_CREATE = "/api/role/roleCreation";

/**
 * AddRole
 * - If adminAdd prop is true and user is logged in, this component
 *   assumes it's rendered inside the app Layout (so it renders only
 *   the inner card and relies on the Layout to provide header/sidebar)
 * - Otherwise it renders a standalone page with header+footer
 */
const AddRole = ({ adminAdd = false }) => {
  const isLoggedIn = !!localStorage.getItem("userName");
  const showSidebar = adminAdd && isLoggedIn;

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    roleName: "",
    roleDesc: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setMsg(null);
  };

  const validate = () => {
    if (!formData.roleName.trim()) {
      setMsg({ type: "error", text: "Role name is required." });
      return false;
    }
    if (formData.roleName.trim().length < 2) {
      setMsg({
        type: "error",
        text: "Role name should be at least 2 characters.",
      });
      return false;
    }
    if (!formData.roleDesc.trim()) {
      setMsg({ type: "error", text: "Role description is required." });
      return false;
    }
    return true;
  };

  // Helper to extract message + determine success/error from backend body + status
  const parseResponseMessage = (res, body) => {
    const text =
      (body &&
        (body.message || body.msg || body.status || body.errorMessage)) ||
      null;

    // heuristics to decide whether it's success or error:
    // error if HTTP status NOT ok OR body.success === false OR body.error === true
    // OR status/message contains fail/error keywords
    const lowerStatus = String(body?.status || "").toLowerCase();
    const lowerMsg = String(text || "").toLowerCase();
    const isError =
      !res.ok ||
      body?.success === false ||
      body?.error === true ||
      lowerStatus.includes("fail") ||
      lowerStatus.includes("error") ||
      lowerMsg.includes("fail") ||
      lowerMsg.includes("error");

    return {
      text: text || (res.ok ? "Operation completed." : "Operation failed."),
      type: isError ? "error" : "success",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!validate()) return;

    const payload = {
      roleName: formData.roleName.trim(),
      roleDesc: formData.roleDesc.trim(),
      createdBy: localStorage.getItem("userName") || "SYSTEM",
      activeFlag: 1,
    };

    setLoading(true);
    try {
      const res = await fetch(API_CREATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      const parsed = parseResponseMessage(res, data);

      setMsg({ type: parsed.type, text: parsed.text });

      if (parsed.type === "success") {
        setFormData({ roleName: "", roleDesc: "" });
        // optional redirect to ViewRoles after a short delay for UX
        setTimeout(() => navigate("/admin/viewRole"), 900);
      }
    } catch (err) {
      console.error("Role creation error:", err);
      setMsg({ type: "error", text: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const Card = (
    <main className="addrole-main" role="main" aria-labelledby="addrole-title">
      <div className="addrole-card">
        <div className="addrole-head">
          <h1 id="addrole-title">Create Role</h1>
          <p className="addrole-sub">
            Add a role and short description. Roles are active by default.
          </p>
        </div>

        <form className="addrole-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Role name</span>
            <input
              name="roleName"
              type="text"
              placeholder="e.g. Manager"
              value={formData.roleName}
              onChange={handleChange}
              aria-required="true"
              autoComplete="off"
              disabled={loading}
            />
          </label>

          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              name="roleDesc"
              placeholder="Short description about role responsibilities"
              value={formData.roleDesc}
              onChange={handleChange}
              rows={4}
              disabled={loading}
            />
          </label>

          {msg && <div className={`form-message ${msg.type}`}>{msg.text}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFormData({ roleName: "", roleDesc: "" });
                setMsg(null);
              }}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="submit"
              className={`btn ${loading ? "is-loading" : ""}`}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );

  return showSidebar ? (
    Card
  ) : (
    <div className="addrole-standalone">
      <Header />
      <div className="standalone-wrapper">{Card}</div>
      <Footer />
    </div>
  );
};

export default AddRole;
