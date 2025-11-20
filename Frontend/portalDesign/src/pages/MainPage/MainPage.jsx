import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MainPage.css";

/*
  MainPage does NOT render Header/Sidebar/Footer because Layout already provides them.
*/

const InfoCard = ({ title, children }) => (
  <div className="mp-card" role="region" aria-label={title}>
    <h3 className="mp-card-title">{title}</h3>
    <div className="mp-card-body">{children}</div>
  </div>
);

const fmt = (d) => {
  if (!d) return "-";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleString();
  } catch {
    return d;
  }
};

const MainPage = () => {
  const userName = localStorage.getItem("userName") || "Guest";
  const navigate = useNavigate();

  const [userApprovals, setUserApprovals] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  // small fetch wrapper like other pages (normalize message/error)
  async function apiFetch(url, opts = {}) {
    try {
      const res = await fetch(url, opts);
      let body = null;
      try {
        body = await res.json();
      } catch (e) {
        body = null;
      }
      const message = (body && (body.message || body.msg)) || null;
      const error = (body && (body.error || body.err || body.status)) || null;
      return {
        ok: res.ok,
        statusCode: res.status,
        body,
        message,
        error,
      };
    } catch (err) {
      return {
        ok: false,
        statusCode: 0,
        body: null,
        message: null,
        error: String(err.message || err),
      };
    }
  }

  // helper to set message state from apiFetch result
  // suppress generic "no pending" messages from becoming the global banner.
  const setMessageFromApi = (resp) => {
    if (!resp) return false;
    const rawMsg = (resp.message || "").toString();
    // Filter out generic "no pending" messages — keep them inside cards instead
    const isNoPendingMsg =
      /no pending|no pending approvals|no pending role|no pending user/i.test(
        rawMsg
      );
    if (resp.error) {
      setMessage({ type: "error", text: String(resp.error) });
      return true;
    }
    if (resp.message && !isNoPendingMsg) {
      setMessage({ type: "success", text: String(resp.message) });
      return true;
    }
    return false;
  };

  useEffect(() => {
    // fetch user approvals
    (async () => {
      setLoadingUsers(true);
      setMessage(null);
      const resp = await apiFetch("/api/user/getUserApproval");
      if (setMessageFromApi(resp)) {
        // show message but still attempt to populate if body is array
      }
      if (resp.ok && Array.isArray(resp.body)) {
        setUserApprovals(resp.body);
      } else {
        setUserApprovals([]);
        if (!resp.ok && !resp.error) {
          setMessage({
            type: "error",
            text: resp.body?.message || "Failed to load user approvals.",
          });
        }
      }
      setLoadingUsers(false);
    })();

    // fetch pending roles
    (async () => {
      setLoadingRoles(true);
      setMessage(null);
      const resp = await apiFetch("/api/role/getPendingRoles");
      if (setMessageFromApi(resp)) {
        // message displayed (unless filtered out)
      }
      if (resp.ok && Array.isArray(resp.body)) {
        setRoles(resp.body);
      } else {
        setRoles([]);
        if (!resp.ok && !resp.error) {
          setMessage({
            type: "error",
            text: resp.body?.message || "Failed to load pending roles.",
          });
        }
      }
      setLoadingRoles(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hide any global/top-level "No pending..." banners that some pages/components may show
  useEffect(() => {
    const NO_PENDING_REGEX =
      /no pending|no pending approvals|no pending role|no pending user/i;

    // Conservative selector for likely global banner elements
    const selector =
      '[role="status"], .app-banner, .global-banner, .top-banner, .mp-msg, .login-message, .alert, .toast, .banner';

    const hideElement = (el) => {
      try {
        const text = (el.innerText || el.textContent || "").trim();
        if (NO_PENDING_REGEX.test(text)) {
          el.style.transition =
            "opacity 180ms ease, max-height 180ms ease, margin 180ms ease, padding 180ms ease";
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          el.style.padding = "0";
          el.style.margin = "0";
          el.style.maxHeight = "0";
          el.setAttribute("data-hidden-by-mainpage", "true");
        }
      } catch (e) {
        // ignore DOM-read errors
      }
    };

    const candidates = Array.from(document.querySelectorAll(selector));
    candidates.forEach(hideElement);

    // observe mutations so dynamically injected banners get hidden too
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes || [])) {
          if (!(node instanceof HTMLElement)) continue;
          hideElement(node);
          // also check children of the added node
          const children = Array.from(
            node.querySelectorAll && node.querySelectorAll(selector)
          );
          if (Array.isArray(children)) {
            children.forEach(hideElement);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="main-page">
      <div className="main-page-inner">
        {/* optional app-level message (only for important messages, errors, or non-trivial success feedback) */}
        {message && (
          <div
            className={`mp-msg ${message.type}`}
            role="status"
            aria-live="polite"
          >
            <span>{message.text}</span>
            <button
              className="mp-msg-close"
              onClick={() => setMessage(null)}
              aria-label="Close message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Welcome Section */}
        <header className="mp-welcome" role="banner" aria-live="polite">
          <div className="mp-welcome-left">
            <h1 className="mp-title">Welcome, {userName}</h1>
            {/* removed duplicate loginTime display here — header already shows it */}
          </div>

          {/* Removed New Report / Settings buttons as requested */}
          <div
            className="mp-actions"
            role="toolbar"
            aria-label="Quick actions"
            aria-hidden="true"
          />
        </header>

        {/* Grid */}
        <section className="mp-grid" aria-label="Overview cards">
          {/* User Approvals */}
          <InfoCard title="Pending User Approvals">
            {loadingUsers ? (
              <p className="muted">Loading...</p>
            ) : userApprovals.length === 0 ? (
              <p className="muted">No pending user approvals</p>
            ) : (
              <ul className="approval-list">
                {userApprovals.map((item) => (
                  <li key={item.approvalId} className="approval-item">
                    <div>
                      <strong>{item.userName}</strong>{" "}
                      {Array.isArray(item.roleName) &&
                        item.roleName.length > 0 && (
                          <span>({item.roleName.join(", ")})</span>
                        )}
                      <br />
                      Created by: {item.createdBy || "-"}
                    </div>
                    <div className="approval-actions">
                      <button className="btn tiny">Approve</button>
                      <button className="btn tiny btn-outline">Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>

          {/* Role Approvals */}
          <InfoCard title="Pending Role Approvals">
            {loadingRoles ? (
              <p className="muted">Loading...</p>
            ) : roles.length === 0 ? (
              <p className="muted">No Pending Role Approvals</p>
            ) : (
              <ul className="approval-list">
                {roles.map((role) => (
                  <li key={role.roleId} className="approval-item">
                    <div>
                      <strong>{role.roleName}</strong>
                      <div
                        style={{ fontSize: 13, color: "#6b7f85", marginTop: 6 }}
                      >
                        {role.roleDesc && <div>{role.roleDesc}</div>}
                        <div>
                          Created by: {role.createdBy || "-"} •{" "}
                          {fmt(role.createdDate)}
                        </div>
                        <div>
                          Modified by: {role.modifiedBy || "-"} •{" "}
                          {fmt(role.modifiedDate)}
                        </div>
                        <div>
                          Status: {role.activeFlag === 1 ? "Active" : "Pending"}
                        </div>
                      </div>
                    </div>

                    <div className="approval-actions">
                      <button className="btn tiny">Approve</button>
                      <button className="btn tiny btn-outline">Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>

          {/* Quick Links */}
          <InfoCard title="Quick Links">
            <ul className="quick-links" aria-label="Quick links">
              <li>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => navigate("/admin/register")}
                >
                  Create User
                </button>
              </li>
              <li>
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => navigate("/admin/addRole")}
                >
                  Create Role
                </button>
              </li>
            </ul>
          </InfoCard>
        </section>

        {/* Workspace */}
        <section className="mp-full" aria-label="Workspace">
          <div className="mp-panel">
            <h3 className="mp-panel-title">Workspace</h3>
            <p className="help-text">
              This area is your workspace — add charts, tables or widgets here.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MainPage;
