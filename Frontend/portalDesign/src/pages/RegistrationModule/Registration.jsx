// File: src/RegistrationModule/Registratiion.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import Layout from "../../components/Layout/Layout";
import "./Registration.css";

const DEFAULT_ROLE_ID = 2;
const EMAIL_VERIFY_API = "/api/user/verify-email";
const SEND_OTP_API = "/api/user/send-MobileReset-otp";
const VERIFY_OTP_API = "/api/user/verify-otp";
const REGISTER_API = "/api/user/register";
const GET_ROLES_API = "/api/role/getRoles";
const GET_PORTALS_API = "/api/portal/getPortals";

const maskPhone = (phone = "") => {
  const s = String(phone || "");
  if (s.length <= 4) return s;
  const last = s.slice(-4);
  return `•••• ••${last}`;
};

async function apiFetch(url, opts = {}) {
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
    raw: res,
  };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("ErrorBoundary caught", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#800" }}>
            {String(this.state.error && this.state.error.toString())}
          </pre>
          {this.state.info && (
            <details style={{ whiteSpace: "pre-wrap" }}>
              {String(this.state.info.componentStack)}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

let rolesSingleton = { promise: null };

async function fetchRolesNetwork(internalSignal) {
  const res = await fetch(GET_ROLES_API, { signal: internalSignal });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return {
    ok: res.ok,
    statusCode: res.status,
    body,
    message: (body && (body.message || body.msg)) || null,
    error: (body && (body.error || body.err || body.status)) || null,
  };
}

function fetchRolesOnce(callerSignal = null, force = false) {
  if (!rolesSingleton.promise || force) {
    const internalController = new AbortController();
    const p = (async () => {
      try {
        return await fetchRolesNetwork(internalController.signal);
      } finally {
        rolesSingleton.promise = null;
      }
    })();
    rolesSingleton.promise = {
      promise: p,
      cancel: () => internalController.abort(),
    };
  }

  if (callerSignal) {
    return new Promise((resolve, reject) => {
      if (callerSignal.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        return reject(err);
      }
      const onAbort = () => {
        callerSignal.removeEventListener("abort", onAbort);
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      callerSignal.addEventListener("abort", onAbort);

      rolesSingleton.promise.promise
        .then((res) => {
          callerSignal.removeEventListener("abort", onAbort);
          resolve(res);
        })
        .catch((err) => {
          callerSignal.removeEventListener("abort", onAbort);
          reject(err);
        });
    });
  }

  return rolesSingleton.promise.promise;
}

let portalsSingleton = { promise: null };

async function fetchPortalsNetwork(internalSignal) {
  const res = await fetch(GET_PORTALS_API, { signal: internalSignal });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return {
    ok: res.ok,
    statusCode: res.status,
    body,
    message: (body && (body.message || body.msg)) || null,
    error: (body && (body.error || body.err || body.status)) || null,
  };
}

function fetchPortalsOnce(callerSignal = null, force = false) {
  if (!portalsSingleton.promise || force) {
    const internalController = new AbortController();
    const p = (async () => {
      try {
        return await fetchPortalsNetwork(internalController.signal);
      } finally {
        portalsSingleton.promise = null;
      }
    })();
    portalsSingleton.promise = {
      promise: p,
      cancel: () => internalController.abort(),
    };
  }

  if (callerSignal) {
    return new Promise((resolve, reject) => {
      if (callerSignal.aborted) {
        const err = new Error("Aborted");
        err.name = "AbortError";
        return reject(err);
      }
      const onAbort = () => {
        callerSignal.removeEventListener("abort", onAbort);
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      callerSignal.addEventListener("abort", onAbort);

      portalsSingleton.promise.promise
        .then((res) => {
          callerSignal.removeEventListener("abort", onAbort);
          resolve(res);
        })
        .catch((err) => {
          callerSignal.removeEventListener("abort", onAbort);
          reject(err);
        });
    });
  }

  return portalsSingleton.promise.promise;
}

const RegistrationForm = ({
  isAdminRoute,
  roles,
  portals,
  onSubmit,
  formState,
  onChange,
  loading,
  msg,
}) => {
  return (
    <div className="registration-right">
      <h2 className="panel-title">Create Account</h2>

      <form className="registration-form" onSubmit={onSubmit} noValidate>
        <div className="form-row">
          {isAdminRoute && (
            <>
              <label className="field">
                <span className="field-label">Role</span>
                <select
                  name="roleId"
                  value={formState.roleId}
                  onChange={onChange}
                  disabled={loading || !roles || roles.length === 0}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.roleId} value={role.roleId}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Portal</span>
                <select
                  name="portalId"
                  value={formState.portalId || ""}
                  onChange={onChange}
                  disabled={loading || !portals || portals.length === 0}
                >
                  <option value="">Select Portal</option>
                  {portals.map((p) => (
                    <option key={p.portalId} value={p.portalId}>
                      {p.portalName || p.name || p.portalId}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="emailId"
              placeholder="Email"
              value={formState.emailId}
              onChange={onChange}
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span className="field-label">Username</span>
            <input
              type="text"
              name="userName"
              placeholder="Username"
              value={formState.userName}
              onChange={onChange}
              required
              autoComplete="username"
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span className="field-label">First Name</span>
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formState.firstName}
              onChange={onChange}
              required
              autoComplete="given-name"
            />
          </label>

          <label className="field">
            <span className="field-label">Last Name</span>
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formState.lastName}
              onChange={onChange}
              required
              autoComplete="family-name"
            />
          </label>
        </div>

        <div className="form-row single">
          <label className="field">
            <span className="field-label">Phone</span>
            <input
              type="tel"
              name="contactNumber"
              placeholder="Phone Number"
              value={formState.contactNumber}
              onChange={onChange}
              required
              autoComplete="tel"
              inputMode="tel"
              maxLength={15}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formState.password}
              onChange={onChange}
              required
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span className="field-label">Retype Password</span>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Retype Password"
              value={formState.confirmPassword}
              onChange={onChange}
              required
              autoComplete="new-password"
            />
          </label>

          <div className="field spacer" aria-hidden />
        </div>

        <div className="form-row single toggle-row">
          <label className="switch-label">
            <span className="field-label">Enable OTP (for login)</span>

            <label
              className="switch"
              role="switch"
              aria-checked={!!formState.otpEnabled}
              aria-label="Enable OTP for login"
            >
              <input
                type="checkbox"
                name="otpEnabled"
                checked={!!formState.otpEnabled}
                onChange={(e) =>
                  onChange({
                    target: { name: "otpEnabled", value: e.target.checked },
                  })
                }
              />
              <span className="slider" aria-hidden="true" />
            </label>
          </label>
        </div>

        {msg?.text && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}

        <div className="form-actions">
          <button
            className={`register-button ${loading ? "is-loading" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? "Please wait..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Registratiion = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  const propFlag = props?.adminAdd === true;
  const stateFlag = location?.state?.adminAdd === true;
  // robust path check: any path under /admin
  const pathFlag =
    typeof location?.pathname === "string" &&
    location.pathname.replace(/\/+$|\?.*$/g, "").startsWith("/admin");
  const isAdminRoute = propFlag || stateFlag || pathFlag;

  const showSidebar = isAdminRoute;
  const showRoleDropdown = isAdminRoute;
  const showPortalDropdown = isAdminRoute;

  const [roles, setRoles] = useState([]);
  const [portals, setPortals] = useState([]);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [fatalError, setFatalError] = useState(null);

  const [formData, setFormData] = useState({
    roleId: "",
    portalId: "",
    emailId: "",
    userName: "",
    firstName: "",
    lastName: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
    otpEnabled: false,
  });

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailTokenInput, setEmailTokenInput] = useState("");
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpExpiresSeconds, setOtpExpiresSeconds] = useState(0);

  const otpTimerRef = useRef(null);
  const emailTokenRef = useRef(null);
  const otpInputRef = useRef(null);

  const rolesFetchInFlightRef = useRef(false);
  const portalsFetchInFlightRef = useRef(false);
  const registerInFlightRef = useRef(false);
  const sendOtpInFlightRef = useRef(false);
  const verifyOtpInFlightRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        abortRef.current?.abort();
      } catch {}
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
      }
      rolesFetchInFlightRef.current = false;
      portalsFetchInFlightRef.current = false;
      registerInFlightRef.current = false;
      sendOtpInFlightRef.current = false;
      verifyOtpInFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!showRoleDropdown && !showPortalDropdown) return;
      if (roles && roles.length > 0 && portals && portals.length > 0) {
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setMsg(null);

      if (
        showRoleDropdown &&
        (!roles || roles.length === 0) &&
        !rolesFetchInFlightRef.current
      ) {
        rolesFetchInFlightRef.current = true;
        try {
          const resp = await fetchRolesOnce(controller.signal, false);
          if (mountedRef.current && !controller.signal.aborted) {
            if (!resp.ok) {
              console.warn("getRoles non-ok", resp.statusCode);
              setRoles([]);
            } else {
              setRoles(Array.isArray(resp.body) ? resp.body : []);
            }
          }
        } catch (err) {
          if (err && err.name === "AbortError") {
          } else {
            console.error("getRoles error:", err);
            if (mountedRef.current)
              setMsg({ type: "error", text: "Failed to load roles." });
          }
        } finally {
          rolesFetchInFlightRef.current = false;
        }
      }

      if (
        showPortalDropdown &&
        (!portals || portals.length === 0) &&
        !portalsFetchInFlightRef.current
      ) {
        portalsFetchInFlightRef.current = true;
        try {
          const resp = await fetchPortalsOnce(controller.signal, false);
          if (mountedRef.current && !controller.signal.aborted) {
            if (!resp.ok) {
              console.warn("getPortals non-ok", resp.statusCode);
              setPortals([]);
            } else {
              setPortals(Array.isArray(resp.body) ? resp.body : []);
            }
          }
        } catch (err) {
          if (err && err.name === "AbortError") {
          } else {
            console.error("getPortals error:", err);
            if (mountedRef.current)
              setMsg({ type: "error", text: "Failed to load portals." });
          }
        } finally {
          portalsFetchInFlightRef.current = false;
        }
      }

      if (mountedRef.current) setLoading(false);
    })();
  }, [showRoleDropdown, showPortalDropdown]);

  useEffect(() => {
    let id;
    if (otpCooldown > 0) {
      id = setInterval(() => setOtpCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    }
    return () => clearInterval(id);
  }, [otpCooldown]);

  useEffect(() => {
    if (otpExpiresSeconds <= 0) {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
      }
      return;
    }

    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    otpTimerRef.current = setInterval(() => {
      setOtpExpiresSeconds((s) => {
        if (s <= 1) {
          clearInterval(otpTimerRef.current);
          otpTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
        otpTimerRef.current = null;
      }
    };
  }, [otpExpiresSeconds]);

  useEffect(() => {
    if (verifyingEmail && emailTokenRef.current) {
      try {
        emailTokenRef.current.focus();
      } catch {}
    }
  }, [verifyingEmail]);

  useEffect(() => {
    if (verifyingPhone && otpInputRef.current) {
      try {
        otpInputRef.current.focus();
      } catch {}
    }
  }, [verifyingPhone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setMsg(null);
  };

  const startOtpCooldown = (seconds = 60) => setOtpCooldown(seconds);

  const sendOtpForRegistration = async (status = "VERIFICATION") => {
    if (sendOtpInFlightRef.current)
      return { ok: false, message: "Request in progress" };
    if (!formData.contactNumber) {
      setMsg({ type: "error", text: "No phone number available to send OTP." });
      return { ok: false };
    }

    sendOtpInFlightRef.current = true;
    setLoading(true);
    setMsg(null);

    try {
      const payload = {
        userName: formData.userName || "",
        contactNumber: formData.contactNumber,
        status,
        activeFlag: false,
      };
      const resp = await apiFetch(SEND_OTP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = resp.body || {};
      const rawMessage = (
        resp.message ||
        body.message ||
        body.msg ||
        ""
      )?.toString();
      const errorKey = body.error ?? body.err ?? null;

      if (resp.statusCode === 401) {
        setMsg({
          type: "error",
          text: "Session expired. Redirecting to login.",
        });
        navigate("/login");
        return { ok: false };
      }

      if (errorKey) {
        setMsg({
          type: "error",
          text: String(errorKey) || "Failed to send OTP.",
        });
        return { ok: false, data: body };
      }

      if (resp.ok && (body.message || resp.message)) {
        setMsg({ type: "success", text: rawMessage || "OTP sent." });
        setOtpExpiresSeconds(300);
        startOtpCooldown(60);
        setVerifyingPhone(true);
        return { ok: true, data: body };
      }

      setMsg({
        type: "error",
        text:
          resp.message ||
          body.message ||
          `Failed to send OTP (${resp.statusCode || "unknown"})`,
      });
      return { ok: false, data: body };
    } catch (err) {
      console.error("Send OTP error:", err);
      setMsg({ type: "error", text: "Could not send OTP." });
      return { ok: false };
    } finally {
      sendOtpInFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const submitOtp = async () => {
    if (verifyOtpInFlightRef.current) return;
    if (!otpInput.trim()) {
      setMsg({ type: "error", text: "Please enter the OTP." });
      return;
    }
    verifyOtpInFlightRef.current = true;
    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        contactNumber: formData.contactNumber,
        otp: otpInput.trim(),
        status: "VERIFICATION",
        userName: formData.userName || "",
      };
      const resp = await apiFetch(VERIFY_OTP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = resp.body || {};
      const rawMessage = (
        resp.message ||
        body.message ||
        body.msg ||
        ""
      )?.toString();
      const errorKey = body.error ?? body.err ?? null;

      if (resp.statusCode === 401) {
        setMsg({
          type: "error",
          text: "Session expired. Redirecting to login.",
        });
        navigate("/login");
        return;
      }

      if (errorKey) {
        setMsg({
          type: "error",
          text: String(errorKey) || "OTP verification failed.",
        });
        return;
      }

      if (resp.ok && (body.message || resp.message)) {
        setMsg({ type: "success", text: rawMessage || "OTP verified." });
        setVerifyingPhone(false);
        if (!showSidebar) {
          setTimeout(() => navigate("/login"), 700);
        }
        return;
      }

      setMsg({
        type: "error",
        text:
          resp.message ||
          body.message ||
          `Invalid or expired OTP (${resp.statusCode || "unknown"})`,
      });
      setVerifyingPhone(false);
    } catch (err) {
      console.error("Verify OTP error:", err);
      setMsg({ type: "error", text: "OTP verification failed." });
      setVerifyingPhone(false);
    } finally {
      verifyOtpInFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    await sendOtpForRegistration("VERIFICATION");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (registerInFlightRef.current) return;
    setMsg(null);

    if (formData.password !== formData.confirmPassword) {
      setMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (showRoleDropdown && !formData.roleId) {
      setMsg({ type: "error", text: "Please select a role." });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(String(formData.emailId || ""))) {
      setMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    registerInFlightRef.current = true;
    setLoading(true);

    const chosenRoleId = showRoleDropdown
      ? parseInt(formData.roleId, 10)
      : DEFAULT_ROLE_ID;

    const payload = {
      userName: String((formData.userName || "").trim()),
      firstName: String((formData.firstName || "").trim()),
      lastName: String((formData.lastName || "").trim()),
      emailId: String((formData.emailId || "").trim()),
      contactNumber: String((formData.contactNumber || "").trim()),
      password: String(formData.password || ""),
      createdBy: showSidebar
        ? localStorage.getItem("userName") || "ADMIN"
        : "SELF",
      roleIdFk: [
        Number.isFinite(chosenRoleId) ? chosenRoleId : DEFAULT_ROLE_ID,
      ],
      portalIdFk: formData.portalId ? [Number(formData.portalId)] : undefined,
      isOtpEnabled: !!formData.otpEnabled,
    };

    try {
      const resp = await apiFetch(REGISTER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = resp.body || {};
      const rawMessage = (
        resp.message ||
        body.message ||
        body.msg ||
        ""
      )?.toString();
      const errorKey = body.error ?? body.err ?? null;

      if (resp.statusCode === 401) {
        setMsg({
          type: "error",
          text: "Session expired. Redirecting to login.",
        });
        navigate("/login");
        return;
      }

      if (errorKey) {
        setMsg({
          type: "error",
          text: String(errorKey) || "Registration failed.",
        });
        return;
      }

      if (resp.ok && (body.message || resp.message)) {
        setMsg({ type: "success", text: rawMessage || "Registered!" });

        if (body && (body.emailVerificationRequired || body.emailToken)) {
          setVerifyingEmail(true);
          setEmailTokenInput("");
          return;
        }

        setVerifyingPhone(true);
        setOtpInput("");

        if (showSidebar) {
          setFormData({
            roleId: "",
            portalId: "",
            emailId: "",
            userName: "",
            firstName: "",
            lastName: "",
            contactNumber: "",
            password: "",
            confirmPassword: "",
            otpEnabled: false,
          });
        }

        return;
      }

      setMsg({
        type: "error",
        text:
          resp.message ||
          body.message ||
          `Registration failed (${resp.statusCode})`,
      });
    } catch (err) {
      console.error("Registration error:", err);
      setMsg({ type: "error", text: "Something went wrong." });
      if (err && err.stack) {
        setFatalError(err);
      }
    } finally {
      registerInFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const submitEmailToken = async () => {
    if (!emailTokenInput.trim()) {
      setMsg({ type: "error", text: "Please enter verification token." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const resp = await apiFetch(EMAIL_VERIFY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: emailTokenInput.trim() }),
      });

      const body = resp.body || {};
      const rawMessage = (
        resp.message ||
        body.message ||
        body.msg ||
        ""
      )?.toString();
      const errorKey = body.error ?? body.err ?? null;

      if (resp.statusCode === 401) {
        setMsg({
          type: "error",
          text: "Session expired. Redirecting to login.",
        });
        navigate("/login");
        return;
      }

      if (errorKey) {
        setMsg({
          type: "error",
          text: String(errorKey) || "Verification failed.",
        });
        return;
      }

      if (resp.ok && (body.message || resp.message)) {
        setMsg({ type: "success", text: rawMessage || "Email verified!" });
        setVerifyingEmail(false);
        if (!showSidebar) setTimeout(() => navigate("/login"), 700);
        return;
      }

      setMsg({ type: "error", text: resp.message || "Verification failed." });
    } catch (err) {
      console.error("Email verify error:", err);
      setMsg({ type: "error", text: "Verification request failed." });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const RegistrationCard = (
    <>
      {!showSidebar && <Header />}

      <div className="auth-container with-header">
        {!showSidebar && (
          <div className="auth-left">
            <h2 className="left-title">Welcome Back!</h2>
            <p className="left-sub">
              To keep connected with us please login with your personal info
            </p>
            <button
              className="auth-button secondary"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </div>
        )}

        <div className="auth-right">
          <div className="auth-card">
            <RegistrationForm
              isAdminRoute={showRoleDropdown}
              roles={roles}
              portals={portals}
              onSubmit={handleSubmit}
              formState={formData}
              onChange={handleChange}
              loading={loading}
              msg={msg}
            />
          </div>
        </div>
      </div>

      {!showSidebar && <Footer />}
    </>
  );

  const formatMMSS = (sec) => {
    const s = Math.max(0, Number(sec) || 0);
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(1, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  if (fatalError) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Unexpected error</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "#800" }}>
          {String(fatalError && fatalError.toString())}
        </pre>
        <details style={{ whiteSpace: "pre-wrap" }}>{fatalError.stack}</details>
      </div>
    );
  }

  try {
    if (showSidebar) {
      try {
        if (typeof Layout === "function" || typeof Layout === "object") {
          return (
            <ErrorBoundary>
              <Layout>{RegistrationCard}</Layout>

              {verifyingEmail && (
                <div
                  className="modal-backdrop small"
                  role="dialog"
                  aria-modal="true"
                >
                  <div
                    className="verify-modal"
                    role="document"
                    aria-labelledby="verify-email-title"
                  >
                    <header className="verify-head">
                      <h3 id="verify-email-title">Verify your email</h3>
                    </header>
                    <div className="verify-body">
                      <p className="verify-help">
                        Enter the verification token sent to your email address.
                      </p>
                      <label className="field">
                        <input
                          ref={emailTokenRef}
                          type="text"
                          value={emailTokenInput}
                          onChange={(e) => setEmailTokenInput(e.target.value)}
                          placeholder="Verification token"
                        />
                      </label>
                      <div className="verify-actions">
                        <button
                          className="btn btn-ghost"
                          onClick={() => setVerifyingEmail(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn"
                          onClick={submitEmailToken}
                          disabled={loading}
                        >
                          {loading ? "Verifying..." : "Verify email"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {verifyingPhone && (
                <div
                  className="modal-backdrop small"
                  role="dialog"
                  aria-modal="true"
                >
                  <div
                    className="verify-modal"
                    role="document"
                    aria-labelledby="verify-phone-title"
                  >
                    <header className="verify-head">
                      <h3 id="verify-phone-title">Verify phone</h3>
                    </header>
                    <div className="verify-body">
                      <p className="verify-help">
                        We will send an OTP to{" "}
                        <span className="masked-phone">
                          {maskPhone(formData.contactNumber)}
                        </span>
                        . Click <b>Send OTP</b> to receive it.
                      </p>
                      <label className="field">
                        <input
                          ref={otpInputRef}
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Enter OTP"
                        />
                      </label>
                      <div
                        className="verify-meta"
                        style={{ alignItems: "center" }}
                      >
                        {otpExpiresSeconds === 0 ? (
                          <button
                            className="link-button"
                            onClick={() =>
                              sendOtpForRegistration("VERIFICATION")
                            }
                            disabled={loading}
                          >
                            {loading ? "Sending..." : "Send OTP"}
                          </button>
                        ) : (
                          <button
                            className="link-button"
                            onClick={handleResendOtp}
                            disabled={otpCooldown > 0 || loading}
                          >
                            {otpCooldown > 0
                              ? `Resend OTP (${otpCooldown}s)`
                              : "Resend OTP"}
                          </button>
                        )}
                        <div
                          style={{
                            marginLeft: "auto",
                            color: "#6b7f85",
                            fontWeight: 700,
                          }}
                        >
                          Expires in: {formatMMSS(otpExpiresSeconds)}
                        </div>
                      </div>
                      <div className="verify-actions">
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setVerifyingPhone(false);
                            setOtpInput("");
                            setOtpExpiresSeconds(0);
                            setOtpCooldown(0);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn"
                          onClick={submitOtp}
                          disabled={loading}
                        >
                          {loading ? "Checking..." : "Verify OTP"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          );
        } else {
          console.warn(
            "Layout is not a React component — falling back to simple wrapper."
          );
        }
      } catch (layoutErr) {
        console.error("Layout render threw:", layoutErr);
      }

      return (
        <ErrorBoundary>
          <div
            className="admin-layout-fallback"
            style={{ display: "flex", minHeight: "100vh" }}
          >
            <div style={{ width: 260 }} />
            <div style={{ flex: 1 }}>
              <Header />
              <main style={{ padding: 16 }}>{RegistrationCard}</main>
              <Footer />
            </div>
          </div>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary>
        {RegistrationCard}

        {verifyingEmail && (
          <div className="modal-backdrop small" role="dialog" aria-modal="true">
            <div
              className="verify-modal"
              role="document"
              aria-labelledby="verify-email-title"
            >
              <header className="verify-head">
                <h3 id="verify-email-title">Verify your email</h3>
              </header>
              <div className="verify-body">
                <p className="verify-help">
                  Enter the verification token sent to your email address.
                </p>
                <label className="field">
                  <input
                    ref={emailTokenRef}
                    type="text"
                    value={emailTokenInput}
                    onChange={(e) => setEmailTokenInput(e.target.value)}
                    placeholder="Verification token"
                  />
                </label>
                <div className="verify-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setVerifyingEmail(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={submitEmailToken}
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify email"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {verifyingPhone && (
          <div className="modal-backdrop small" role="dialog" aria-modal="true">
            <div
              className="verify-modal"
              role="document"
              aria-labelledby="verify-phone-title"
            >
              <header className="verify-head">
                <h3 id="verify-phone-title">Verify phone</h3>
              </header>
              <div className="verify-body">
                <p className="verify-help">
                  We will send an OTP to{" "}
                  <span className="masked-phone">
                    {maskPhone(formData.contactNumber)}
                  </span>
                  . Click <b>Send OTP</b> to receive it.
                </p>
                <label className="field">
                  <input
                    ref={otpInputRef}
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter OTP"
                  />
                </label>
                <div className="verify-meta" style={{ alignItems: "center" }}>
                  {otpExpiresSeconds === 0 ? (
                    <button
                      className="link-button"
                      onClick={() => sendOtpForRegistration("VERIFICATION")}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                  ) : (
                    <button
                      className="link-button"
                      onClick={handleResendOtp}
                      disabled={otpCooldown > 0 || loading}
                    >
                      {otpCooldown > 0
                        ? `Resend OTP (${otpCooldown}s)`
                        : "Resend OTP"}
                    </button>
                  )}
                  <div
                    style={{
                      marginLeft: "auto",
                      color: "#6b7f85",
                      fontWeight: 700,
                    }}
                  >
                    Expires in: {formatMMSS(otpExpiresSeconds)}
                  </div>
                </div>
                <div className="verify-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setVerifyingPhone(false);
                      setOtpInput("");
                      setOtpExpiresSeconds(0);
                      setOtpCooldown(0);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={submitOtp}
                    disabled={loading}
                  >
                    {loading ? "Checking..." : "Verify OTP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
    );
  } catch (err) {
    console.error("Render error in Registration:", err);
    return (
      <div style={{ padding: 20 }}>
        <h2>Render failed</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "#800" }}>
          {String(err && err.toString())}
        </pre>
        <details style={{ whiteSpace: "pre-wrap" }}>{err && err.stack}</details>
      </div>
    );
  }
};

export default Registratiion;
