// src/pages/LoginModule/LoginPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./LoginPage.css";

/**
 * LoginPage
 * - remembers pendingUserName when sending OTP so verify call includes userName
 * - OTP input is white/rounded with black text
 * - verify OTP treats `error` key as failure, `message` key as success (green), supports older shapes
 *
 * Fixes:
 * - After OTP verification we now call getUserDetails to obtain userId and roles,
 *   so the session payload contains real userId and roleName values (not null/empty).
 */

/* helpers */
const maskPhone = (phone = "") => {
  const s = String(phone || "");
  if (!s) return "";
  const keep = 3;
  const masked = s.slice(0, Math.max(0, s.length - keep)).replace(/\d/g, "•");
  return masked + s.slice(Math.max(0, s.length - keep));
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
  return {
    ok: res.ok,
    statusCode: res.status,
    body,
    message,
  };
}

/* UI: content panel */
const LoginContent = (props) => {
  return (
    <div className="auth-right">
      <div className="auth-card">
        <h2 className="panel-title">Login</h2>

        {props.msg && (
          <div
            className={`login-message ${
              props.msg.type === "error" ? "error" : "success"
            }`}
            role="alert"
            onClick={() => props.setMsg(null)}
          >
            {props.msg.text}
          </div>
        )}

        {props.step === 1 && (
          <form
            className="login-form"
            onSubmit={props.handlePrimarySubmit}
            noValidate
          >
            <label className="field">
              <span className="field-label sr-only">Username or Email</span>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Username or Email"
                value={props.identifier}
                onChange={(e) => props.setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="field">
              <span className="field-label sr-only">Password</span>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={props.password}
                onChange={(e) => props.setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="form-actions">
              <button
                className="login-button"
                type="submit"
                disabled={props.loading}
              >
                {props.loading ? "Please wait..." : "Continue"}
              </button>
            </div>

            <div className="login-links">
              <Link to="/ForgotPassword">Forgot Password?</Link>
            </div>
          </form>
        )}

        {props.step === 2 && (
          <div className="otp-section">
            <div className="otp-info">
              <div className="otp-subtitle">OTP sent to</div>
              <div className="masked-phone">{props.maskedPhone}</div>
              <div className="otp-ttl">
                OTP valid for:{" "}
                {Math.floor(props.otpTtl / 60)
                  .toString()
                  .padStart(1, "0")}
                :{(props.otpTtl % 60).toString().padStart(2, "0")}
              </div>
            </div>

            <label className="field">
              <span className="field-label sr-only">Enter OTP</span>
              <input
                id="otp"
                name="otp"
                type="text"
                placeholder="Enter OTP"
                value={props.otp}
                onChange={(e) => props.setOtp(e.target.value)}
                autoFocus
                required
                onKeyDown={(e) => {
                  if (e.key === "Enter") props.handleOtpSubmit();
                }}
              />
            </label>

            <div className="otp-actions">
              <button
                className="login-button"
                onClick={props.handleOtpSubmit}
                disabled={props.loading}
              >
                {props.loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                className="link-button"
                onClick={props.handleResendOtp}
                disabled={props.loading || props.resendCooldown > 0}
              >
                {props.resendCooldown > 0
                  ? `Resend OTP (${props.resendCooldown}s)`
                  : "Resend OTP"}
              </button>
            </div>

            <div className="otp-help">
              If you didn't receive the OTP, use <b>Resend OTP</b>. Each OTP is
              valid for 5 minutes.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DEFAULT_TTL_MINUTES = 60 * 24; // 24 hours

/* Main component */
const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [realPhone, setRealPhone] = useState("");
  const [pendingUserName, setPendingUserName] = useState(""); // remembers username used for OTP
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTtl, setOtpTtl] = useState(0);

  const abortRef = useRef(null);
  const navigate = useNavigate();

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
    let t;
    if (otpTtl > 0) {
      t = setInterval(() => setOtpTtl((s) => (s > 0 ? s - 1 : 0)), 1000);
    }
    return () => clearInterval(t);
  }, [otpTtl]);

  useEffect(() => {
    // useful debug: show token if present on mount
    console.info(
      "LoginPage mounted; sessionToken:",
      localStorage.getItem("sessionToken")
    );
    return () => abortRef.current?.abort();
  }, []);

  /**
   * createSessionOnServer
   * - builds payload for /api/session/create-session
   * - IMPORTANT: do not inject default roleName if roles missing. Only include roleName when caller provides roles array.
   */
  const createSessionOnServer = async ({
    userId,
    userName,
    roles,
    ttlMinutes,
    metaData,
  }) => {
    try {
      const payload = {
        // include fields only when provided (do not coerce defaults)
        ...(typeof userId !== "undefined" && userId !== null ? { userId } : {}),
        ...(userName ? { userName } : {}),
        ...(Array.isArray(roles) && roles.length ? { roleName: roles } : {}),
        ttlMinutes: ttlMinutes ?? DEFAULT_TTL_MINUTES,
        ipAddress: window?.location?.hostname || "unknown",
        userAgent: navigator.userAgent,
        metaData: metaData ?? {},
      };

      const resp = await apiFetch("/api/session/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error(resp.message || "Failed to create session");
      }

      const token =
        resp.body?.sessionToken || resp.body?.session?.sessionToken || null;
      if (!token) {
        throw new Error("No session token returned from server");
      }

      // persist session token & username BEFORE navigation
      localStorage.setItem("sessionToken", token);
      if (userName) localStorage.setItem("userName", userName);
      return { token, session: resp.body };
    } catch (err) {
      console.error("createSessionOnServer error:", err);
      throw err;
    }
  };

  const clearMessage = () => setMsg(null);
  const isEmail = (val) => /\S+@\S+\.\S+/.test(val);

  /* send OTP for login -> activeFlag: true (uses apiFetch and message) */
  const doSendOtp = async ({ userName, contactNumber }) => {
    try {
      // remember username if provided
      if (userName) setPendingUserName(userName);

      const payload = {
        userName: userName ?? pendingUserName ?? "",
        contactNumber,
        status: "LOGIN",
        activeFlag: true,
      };
      const resp = await apiFetch("/api/user/send-MobileReset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        setMsg({
          type: "error",
          text: resp.message || `Failed to send OTP (${resp.statusCode})`,
        });
        throw new Error(resp.message || "Failed to send OTP");
      }

      return resp.body;
    } catch (err) {
      console.error("Send OTP error:", err);
      if (!msg)
        setMsg({ type: "error", text: err.message || "Failed to send OTP." });
      throw err;
    }
  };

  /* Login primary submit */
  const handlePrimarySubmit = async (e) => {
    e?.preventDefault();
    clearMessage();

    const id = identifier.trim();
    if (!id || !password) {
      setMsg({
        type: "error",
        text: "Please enter username/email and password.",
      });
      return;
    }

    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const payloadGet = {
        userName: isEmail(id) ? "" : id,
        emailId: isEmail(id) ? id : "",
      };

      const getRes = await apiFetch("/api/user/getUserDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadGet),
      });

      const user = getRes.body || {};

      if (user.isOtpEnabled === true || user.isOtpEnabled === "true") {
        const contactNumber = user.contactNumber || user.phone || "";
        setRealPhone(contactNumber);
        setMaskedPhone(maskPhone(contactNumber));
        try {
          // pass resolved userName so we remember it
          await doSendOtp({ userName: user.userName || id, contactNumber });
          setOtpTtl(300); // 5 minutes
          setResendCooldown(60);
          setStep(2);
          setMsg({ type: "success", text: "OTP sent. Check your phone." });
        } catch (err) {
          // doSendOtp sets msg already on error
        }
        return;
      }

      // No OTP required: call regular login
      const payloadLogin = {
        password,
        emailId: isEmail(id) ? id : "",
        userName: !isEmail(id) ? id : "",
      };

      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadLogin),
        signal: abortRef.current.signal,
      });

      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        const userIdFromResp = result.userId ?? result.id ?? null;

        // derive roles: prefer `roles` array, else `roleName` array, else undefined
        let rolesFromResp;
        if (Array.isArray(result.roles) && result.roles.length) {
          // if roles array contains objects, map to strings
          rolesFromResp = result.roles
            .map((r) =>
              typeof r === "string" ? r : r?.roleName || r?.name || null
            )
            .filter(Boolean);
        } else if (Array.isArray(result.roleName) && result.roleName.length) {
          rolesFromResp = result.roleName.slice();
        } else if (result.roleName && typeof result.roleName === "string") {
          rolesFromResp = [result.roleName];
        } else {
          rolesFromResp = undefined; // do not default to ROLE_USER
        }

        try {
          await createSessionOnServer({
            userId: userIdFromResp,
            userName: result.userName || payloadLogin.userName || id,
            roles: rolesFromResp,
            ttlMinutes: DEFAULT_TTL_MINUTES,
            metaData: { loginMethod: "password" },
          });
        } catch (err) {
          setMsg({
            type: "error",
            text: "Login succeeded but failed to create session.",
          });
          setLoading(false);
          return;
        }

        setMsg({
          type: "success",
          text: result.message || "Login successful.",
        });
        localStorage.setItem(
          "userName",
          result.userName || payloadLogin.userName || id
        );
        localStorage.setItem("loginTime", new Date().toLocaleString());

        // debug log
        console.info("Login successful — navigating to /MainPage");
        console.info(
          "sessionToken (localStorage):",
          localStorage.getItem("sessionToken")
        );

        // navigate immediately, replace history so back doesn't go to login
        navigate("/MainPage", { replace: true });

        // as a robust fallback (if navigate didn't work for some reason), force a reload/location change
        setTimeout(() => {
          if (window.location.pathname !== "/MainPage") {
            console.warn(
              "navigate did not change pathname — forcing location change"
            );
            window.location.href = "/MainPage";
          }
        }, 300);
      } else {
        setMsg({ type: "error", text: result.message || "Login failed." });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Primary submit error:", err);
        setMsg({
          type: "error",
          text: err.message || "Something went wrong. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearMessage();
    if (resendCooldown > 0) return;
    if (!realPhone) {
      setMsg({
        type: "error",
        text: "No phone number available to resend OTP.",
      });
      return;
    }
    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const userNameToUse = pendingUserName || identifier;
      await doSendOtp({ userName: userNameToUse, contactNumber: realPhone });
      setResendCooldown(60);
      setOtpTtl(300);
      setMsg({ type: "success", text: "OTP resent to your phone." });
    } catch (err) {
      // handled inside doSendOtp
    } finally {
      setLoading(false);
    }
  };

  /* verify OTP -> uses `error` or `message` key from backend; fallback checks supported */
  const handleOtpSubmit = async () => {
    clearMessage();
    if (!otp.trim()) {
      setMsg({ type: "error", text: "Please enter the OTP." });
      return;
    }
    if (!realPhone) {
      setMsg({ type: "error", text: "No phone to verify." });
      return;
    }

    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const payload = {
        contactNumber: realPhone,
        otp: otp.trim(),
        status: "LOGIN",
        userName: pendingUserName || identifier || "",
      };

      const resp = await apiFetch("/api/user/verify-otp", {
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

      // 1) If server explicitly returned an 'error' key -> show error (red)
      if (errorKey) {
        setMsg({
          type: "error",
          text: String(errorKey) || "OTP verification failed.",
        });
        return;
      }

      // Helper: extract roles from user-details-like object
      const extractRolesFromDetails = (details) => {
        if (!details) return undefined;
        if (Array.isArray(details.roles) && details.roles.length) {
          return details.roles
            .map((r) => (typeof r === "string" ? r : r?.roleName || r?.name))
            .filter(Boolean);
        }
        if (Array.isArray(details.roleName) && details.roleName.length) {
          return details.roleName.slice();
        }
        if (details.roleName && typeof details.roleName === "string") {
          return [details.roleName];
        }
        return undefined;
      };

      const extractUserIdFromDetails = (details) => {
        if (!details) return null;
        return details.userId ?? details.id ?? null;
      };

      // 2) If server returned a 'message' key -> treat as success (green) and proceed
      if (body.message || body.msg) {
        const userNameFromResp =
          body?.userName || pendingUserName || identifier;

        // 🔥 important: fetch full user details so we have userId & roles
        const userDetailsRes = await apiFetch("/api/user/getUserDetails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: isEmail(userNameFromResp) ? "" : userNameFromResp,
            emailId: isEmail(userNameFromResp) ? userNameFromResp : "",
          }),
        });

        const userDetails = userDetailsRes.body || {};

        const userIdFromResp = extractUserIdFromDetails(userDetails);
        const rolesFromResp = extractRolesFromDetails(userDetails);

        console.debug("User details fetched after OTP:", userDetails);

        try {
          await createSessionOnServer({
            userId: userIdFromResp,
            userName: userNameFromResp,
            roles: rolesFromResp,
            ttlMinutes: DEFAULT_TTL_MINUTES,
            metaData: { loginMethod: "otp" },
          });
        } catch (err) {
          setMsg({
            type: "error",
            text: "OTP verified but failed to create session.",
          });
          return;
        }

        setMsg({
          type: "success",
          text: rawMessage || "OTP verified! Login successful.",
        });
        if (userNameFromResp)
          localStorage.setItem("userName", userNameFromResp);
        localStorage.setItem("loginTime", new Date().toLocaleString());

        // navigate immediately and replace history
        console.info("OTP verified — navigating to /MainPage");
        console.info(
          "sessionToken (localStorage):",
          localStorage.getItem("sessionToken")
        );
        navigate("/MainPage", { replace: true });

        // fallback if navigate fails
        setTimeout(() => {
          if (window.location.pathname !== "/MainPage") {
            console.warn(
              "navigate did not change pathname — forcing location change"
            );
            window.location.href = "/MainPage";
          }
        }, 300);

        return;
      }

      // 3) Backwards-compatible success checks (loginAllowed, success, isValid, message text)
      const successRegex = /(verified|success|ok|true)/i;
      const fallbackSuccess =
        resp.ok &&
        (body.loginAllowed === true ||
          body.success === true ||
          body.isValid === true ||
          (rawMessage && successRegex.test(rawMessage)));

      if (fallbackSuccess) {
        const userNameFromResp =
          body?.userName || pendingUserName || identifier;

        // fetch details as above
        const userDetailsRes = await apiFetch("/api/user/getUserDetails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: isEmail(userNameFromResp) ? "" : userNameFromResp,
            emailId: isEmail(userNameFromResp) ? userNameFromResp : "",
          }),
        });

        const userDetails = userDetailsRes.body || {};
        const userIdFromResp = extractUserIdFromDetails(userDetails);
        const rolesFromResp = extractRolesFromDetails(userDetails);

        try {
          await createSessionOnServer({
            userId: userIdFromResp,
            userName: userNameFromResp,
            roles: rolesFromResp,
            ttlMinutes: DEFAULT_TTL_MINUTES,
            metaData: { loginMethod: "otp" },
          });
        } catch (err) {
          setMsg({
            type: "error",
            text: "OTP verified but failed to create session.",
          });
          return;
        }

        setMsg({
          type: "success",
          text: rawMessage || "OTP verified! Login successful.",
        });
        if (userNameFromResp)
          localStorage.setItem("userName", userNameFromResp);
        localStorage.setItem("loginTime", new Date().toLocaleString());

        console.info("OTP fallback success — navigating to /MainPage");
        console.info(
          "sessionToken (localStorage):",
          localStorage.getItem("sessionToken")
        );
        navigate("/MainPage", { replace: true });

        setTimeout(() => {
          if (window.location.pathname !== "/MainPage") {
            console.warn(
              "navigate did not change pathname — forcing location change"
            );
            window.location.href = "/MainPage";
          }
        }, 300);

        return;
      }

      // 4) Otherwise show error using message or generic text
      setMsg({
        type: "error",
        text: rawMessage || "Invalid or expired OTP.",
      });
    } catch (err) {
      if (err && err.name === "AbortError") {
        // abort - ignore
      } else {
        console.error("OTP verify error:", err);
        setMsg({
          type: "error",
          text: err.message || "Something went wrong while verifying OTP.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="auth-container login-container">
        <div className="auth-left">
          <h2 className="left-title">Welcome</h2>
          <p className="left-sub">Sign in to continue to your account</p>
          <div className="left-actions">
            <button
              className="auth-button secondary"
              onClick={() => navigate("/register")}
            >
              Create Account
            </button>
          </div>
        </div>

        <LoginContent
          step={step}
          identifier={identifier}
          setIdentifier={setIdentifier}
          password={password}
          setPassword={setPassword}
          otp={otp}
          setOtp={setOtp}
          loading={loading}
          msg={msg}
          setMsg={setMsg}
          resendCooldown={resendCooldown}
          otpTtl={otpTtl}
          maskedPhone={maskedPhone}
          handlePrimarySubmit={handlePrimarySubmit}
          handleOtpSubmit={handleOtpSubmit}
          handleResendOtp={handleResendOtp}
        />
      </div>

      <Footer />
    </>
  );
};

export default LoginPage;
