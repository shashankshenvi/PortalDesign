// src/components/VerifyMail/VerifyMail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSession } from "../../hooks/useSession";
import "./VerifyMail.css";

const VERIFY_API = "/api/user/verify-email";
const REDIRECT_DELAY_MS = 3000;

async function parseResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const message = (body && (body.message || body.msg || body.status)) || null;
  const error = (body && (body.error || body.err)) || null;
  return { ok: res.ok, statusCode: res.status, body, message, error };
}

export default function VerifyMail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenParam = searchParams.get("token");

  const { token: sessionToken, refresh } = useSession();

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(null); // null | true | false
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(REDIRECT_DELAY_MS / 1000);

  // wrapper that attaches Authorization if available
  const authFetch = useCallback(
    async (url, opts = {}, attemptRefresh = true) => {
      const headers = { ...(opts.headers || {}) };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      if (!headers["Content-Type"])
        headers["Content-Type"] = "application/json";

      const resp = await fetch(url, { ...opts, headers });
      if (resp.status === 401 && attemptRefresh) {
        try {
          await refresh();
          return authFetch(url, opts, false);
        } catch {
          return parseResponse(resp);
        }
      }
      return parseResponse(resp);
    },
    [sessionToken, refresh]
  );

  const handleVerify = async (tkn) => {
    if (!tkn) {
      setLoading(false);
      setOk(false);
      setMessage("Invalid verification link (missing token).");
      return;
    }

    setLoading(true);
    setOk(null);
    setMessage("Verifying...");

    try {
      const resp = await authFetch(VERIFY_API, {
        method: "POST",
        body: JSON.stringify({ token: tkn }),
      });

      if (resp.ok) {
        // Success flow
        const text = resp.message || "Email Verified Successfully.";
        if (/sent for approval|approval/i.test(text)) {
          setMessage("Email Verified Successfully. Sent for Approval.");
        } else {
          setMessage(text);
        }
        setOk(true);
        setLoading(false);

        // start countdown
        let sec = REDIRECT_DELAY_MS / 1000;
        setTimer(sec);
        const int = setInterval(() => {
          sec -= 1;
          setTimer(Math.max(0, sec));
          if (sec <= 0) clearInterval(int);
        }, 1000);

        setTimeout(() => navigate("/login"), REDIRECT_DELAY_MS);
      } else {
        // Error flow
        const text =
          resp.error ||
          resp.message ||
          `Verification failed${
            resp.statusCode ? ` (code ${resp.statusCode})` : ""
          }.`;
        setMessage(text);
        setOk(false);
        setLoading(false);
      }
    } catch (err) {
      console.error("Verify error:", err);
      setOk(false);
      setLoading(false);
      setMessage("Network error, please try again.");
    }
  };

  useEffect(() => {
    handleVerify(tokenParam);
  }, [tokenParam]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="vm-page">
      <div className="vm-container">
        <header className="vm-header">
          <div className="vm-badge">
            <svg viewBox="0 0 24 24" className="vm-badge-icon" aria-hidden>
              <path d="M2 12a10 10 0 1 0 20 0A10 10 0 0 0 2 12z" fill="none" />
            </svg>
          </div>
          <div>
            <h1 className="vm-title">Email Verification</h1>
            <p className="vm-sub">Confirming your email address for access</p>
          </div>
        </header>

        <div className="vm-card">
          <div
            className={`vm-status ${ok === true ? "success" : ""} ${
              ok === false ? "error" : ""
            }`}
          >
            {loading ? (
              <div className="vm-spinner" aria-hidden />
            ) : ok === true ? (
              <svg className="vm-check" viewBox="0 0 24 24" aria-hidden>
                <path d="M20.3 7.0l-11 11-5.6-5.6 1.4-1.4 4.2 4.2 9.6-9.6z" />
              </svg>
            ) : (
              <svg className="vm-x" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3z" />
              </svg>
            )}

            <div className="vm-status-text">
              <div className="vm-message" role="status">
                {message}
              </div>

              {!loading && ok === true && (
                <div className="vm-subtext">
                  Redirecting to login in {timer}s…
                </div>
              )}
            </div>
          </div>

          <div className="vm-actions">
            <button
              className="btn vm-ghost"
              onClick={() => navigate("/login")}
              aria-label="Go to login"
            >
              Go to login
            </button>

            {/* Retry button only when failed */}
            {ok === false && (
              <button
                className="btn"
                onClick={() => handleVerify(tokenParam)}
                disabled={loading}
                aria-label="Retry verification"
              >
                {loading ? "Verifying..." : "Retry"}
              </button>
            )}
          </div>

          <div className="vm-info">
            <small>
              If you didn't request this or the link is expired, contact support
              or request a new email from your profile.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
