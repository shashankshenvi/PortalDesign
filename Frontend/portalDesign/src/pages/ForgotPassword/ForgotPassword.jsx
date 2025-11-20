// src/pages/ForgotPassword/ForgotPassword.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const abortRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [msg, setMsg] = useState(null); // { type: "error" | "success", text }

  const [input, setInput] = useState(""); // username or email raw
  const [form, setForm] = useState({
    userName: "",
    emailId: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let t;
    if (resendCooldown > 0) {
      t = setInterval(
        () => setResendCooldown((c) => (c > 0 ? c - 1 : 0)),
        1000
      );
    }
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(id);
  }, [msg]);

  /* Small helper: normalized fetch that returns message/error */
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
        status: res.status,
        body,
        message,
        error,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        body: null,
        message: null,
        error: String(err.message || err),
      };
    }
  }

  const showError = (text) => setMsg({ type: "error", text });
  const showSuccess = (text) => setMsg({ type: "success", text });

  const setMsgFromApi = (apiResp) => {
    if (!apiResp) return false;
    if (apiResp.error) {
      showError(String(apiResp.error));
      return true;
    }
    if (apiResp.message) {
      showSuccess(String(apiResp.message));
      return true;
    }
    return false;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    // do not trim aggressively while typing
  };

  const prepareIdentifiers = (raw) => {
    const v = String(raw || "").trim();
    const isEmail = /^\S+@\S+\.\S+$/.test(v);
    return {
      emailId: isEmail ? v : "",
      userName: !isEmail ? v : "",
    };
  };

  const sendOtp = async () => {
    setMsg(null);
    const { emailId, userName } = prepareIdentifiers(input);
    if (!emailId && !userName) {
      showError("Please enter a valid username or email.");
      return;
    }

    const payload = {
      userName: userName || null,
      emailId: emailId || null,
      status: "RESET",
      activeFlag: true, // login/reset OTPs are runtime (activeFlag true)
    };
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const resp = await apiFetch("/api/user/send-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      // show any returned message/error
      setMsgFromApi(resp);

      if (resp.ok) {
        // also update local form so verify uses the identifiers
        setForm((p) => ({
          ...p,
          userName: userName || "",
          emailId: emailId || "",
        }));
        setStep(2);
        setResendCooldown(60);
      } else {
        // if server returned no message/error, show fallback
        if (!resp.error && !resp.message) {
          showError(resp.body?.message || "Failed to send OTP.");
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("sendOtp error:", err);
        showError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setMsg(null);
    if (!form.otp?.trim()) {
      showError("Please enter the OTP.");
      return;
    }

    const payload = {
      emailId: form.emailId || null,
      userName: form.userName || null,
      otp: form.otp.trim(),
      status: "RESET",
    };
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const resp = await apiFetch("/api/user/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      // If server sent message/error, show it
      setMsgFromApi(resp);

      // consider several success shapes (backward compat)
      const success =
        resp.ok &&
        (resp.message === "true" ||
          resp.body?.message === "true" ||
          resp.body?.success === true ||
          resp.body?.verified === true ||
          resp.body?.isValid === true);

      if (success) {
        setStep(3);
      } else {
        // if server didn't send error message explicitly show fallback
        if (!resp.error && !resp.message) {
          showError(resp.body?.message || "Invalid or expired OTP.");
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("verifyOtp error:", err);
        showError("Server error while verifying OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    setMsg(null);
    if (!form.newPassword || !form.confirmPassword) {
      showError("Please fill both password fields.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showError("Passwords do not match.");
      return;
    }
    if (form.newPassword.length < 6) {
      showError("Password should be at least 6 characters.");
      return;
    }

    const payload = {
      userName: form.userName || null,
      emailId: form.emailId || null,
      newPassword: form.newPassword,
    };

    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const resp = await apiFetch("/api/user/updatePassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      setMsgFromApi(resp);

      if (resp.ok) {
        // success: navigate to login after a short delay
        setTimeout(() => navigate("/login"), 1200);
      } else {
        if (!resp.error && !resp.message) {
          showError(resp.body?.message || "Failed to update password.");
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("updatePassword error:", err);
        showError("Server error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const ident = form.emailId || form.userName || input;
    if (!ident) {
      showError("No email/username available to resend OTP.");
      return;
    }
    setInput(ident);
    await sendOtp();
  };

  return (
    <>
      <Header />

      <div className="auth-container forgot-container">
        <div className="auth-left">
          <h2 className="left-title">Need help signing in?</h2>
          <p className="left-sub">
            Enter your username or email and we'll send a one-time code to reset
            your password.
          </p>

          <div className="left-actions">
            <button
              className="auth-button secondary"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <h2 className="panel-title">Forgot Password</h2>

            {msg && (
              <div
                className={`form-msg ${
                  msg.type === "error" ? "error" : "success"
                }`}
                role="alert"
              >
                {msg.text}
              </div>
            )}

            {step === 1 && (
              <div className="registration-form">
                <div className="form-row-single">
                  <label className="field">
                    <span className="field-label">Username or Email</span>
                    <input
                      type="text"
                      name="input"
                      placeholder="Enter username or email"
                      value={input}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="register-button"
                    onClick={sendOtp}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="registration-form">
                <div className="form-row-single">
                  <label className="field">
                    <span className="field-label">OTP</span>
                    <input
                      type="text"
                      name="otp"
                      placeholder="Enter OTP"
                      value={form.otp}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="register-button"
                    onClick={verifyOtp}
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <button
                    className="link-button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendCooldown > 0
                      ? `Resend (${resendCooldown}s)`
                      : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="registration-form">
                <div className="form-row">
                  <label className="field">
                    <span className="field-label">Account</span>
                    <input
                      type="text"
                      value={form.userName || form.emailId || input}
                      disabled
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span className="field-label">New Password</span>
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New Password"
                      value={form.newPassword}
                      onChange={handleChange}
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">Confirm Password</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="register-button"
                    onClick={updatePassword}
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default ForgotPassword;
