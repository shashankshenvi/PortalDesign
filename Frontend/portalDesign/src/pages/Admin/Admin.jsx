import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserPlus,
  FaUserEdit,
  FaUsers,
  FaUserShield,
  FaClipboardCheck,
  FaThumbsUp,
} from "react-icons/fa";
import Sidebar from "../../components/Sidebar/Sidebar";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./Admin.css";

const tiles = [
  {
    group: "User Management",
    items: [
      {
        to: "/admin/register",
        label: "Add User",
        icon: <FaUserPlus aria-hidden="true" />,
        desc: "Create a new user account",
      },
      {
        to: "/admin/editUser",
        label: "Edit User",
        icon: <FaUserEdit aria-hidden="true" />,
        desc: "Modify user details & roles",
      },
      {
        to: "/admin/viewUser",
        label: "View Users",
        icon: <FaUsers aria-hidden="true" />,
        desc: "Browse and search users",
      },
    ],
  },
  {
    group: "Role Management",
    items: [
      {
        to: "/admin/addRole",
        label: "Add Role",
        icon: <FaUserShield aria-hidden="true" />,
        desc: "Create a new role and permissions",
      },
      {
        to: "/admin/editRole",
        label: "Edit Role",
        icon: <FaUserEdit aria-hidden="true" />,
        desc: "Update role definitions",
      },
      {
        to: "/admin/viewRole",
        label: "View Roles",
        icon: <FaUsers aria-hidden="true" />,
        desc: "See existing roles",
      },
    ],
  },
  {
    group: "Approval Management",
    items: [
      {
        to: "/admin/approval/user",
        label: "Approve/Reject Users",
        icon: <FaClipboardCheck aria-hidden="true" />,
        desc: "Review user approvals",
      },
      {
        to: "/admin/approval/role",
        label: "Approve/Reject Roles",
        icon: <FaThumbsUp aria-hidden="true" />,
        desc: "Review role approvals",
      },
    ],
  },
];

const Admin = () => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState(null); // { type: "success"|"error", text: "..." }

  const openRegister = () => {
    setMsg({ type: "success", text: "Opening Add User…" });
    setTimeout(() => {
      setMsg(null);
      navigate("/admin/register", { state: { adminAdd: true } });
    }, 180);
  };

  // keyboard handler for card-button accessibility
  const handleKeyPress = (e, action) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="admin-page-wrapper">
      <Sidebar />
      <div className="admin-content with-sidebar-expanded">
        <Header />
        <main
          className="admin-container"
          role="main"
          aria-labelledby="admin-heading"
        >
          <div className="admin-header">
            <h1 id="admin-heading">Admin Panel</h1>
            <p className="admin-sub">
              Quick actions and management tools for users, roles and approvals.
            </p>
          </div>

          {/* Message banner (shows green for message, red for error) */}
          {msg && (
            <div
              className={`admin-message ${
                msg.type === "error" ? "error" : "success"
              }`}
              role={msg.type === "error" ? "alert" : "status"}
              onClick={() => setMsg(null)}
            >
              {msg.text}
            </div>
          )}

          <div className="admin-grid">
            {tiles.map((group) => (
              <section
                key={group.group}
                className="admin-section"
                aria-labelledby={group.group.replace(/\s+/g, "-")}
              >
                <h2 id={group.group.replace(/\s+/g, "-")}>{group.group}</h2>
                <div className="card-grid">
                  {group.items.map((item) => {
                    if (item.to === "/admin/register") {
                      return (
                        <button
                          key={item.to}
                          type="button"
                          className="admin-card"
                          onClick={openRegister}
                          onKeyDown={(e) => handleKeyPress(e, openRegister)}
                          title={item.desc}
                          aria-label={`${item.label} — ${item.desc}`}
                        >
                          <div className="card-icon" aria-hidden="true">
                            {item.icon}
                          </div>
                          <div className="card-content">
                            <div className="card-title">{item.label}</div>
                            <div className="card-desc">{item.desc}</div>
                          </div>
                        </button>
                      );
                    }

                    // default: Link for other items (keeps keyboard semantics / anchors)
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="admin-card"
                        role="link"
                        tabIndex={0}
                        title={item.desc}
                        aria-label={`${item.label} — ${item.desc}`}
                      >
                        <div className="card-icon" aria-hidden="true">
                          {item.icon}
                        </div>
                        <div className="card-content">
                          <div className="card-title">{item.label}</div>
                          <div className="card-desc">{item.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Admin;
