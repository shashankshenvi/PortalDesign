// src/pages/Admin/Role/ApproveRejectUsers/ApproveRejectUsers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../../../hooks/useSession";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import Header from "../../../../components/Header/Header";
import Footer from "../../../../components/Footer/Footer";
import "./ApproveRejectUsers.css";

const API_GET = "/api/user/getUserApproval";
const API_APPROVE = "/api/user/approveUser";

const formatRoleList = (arr) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "-";
  return arr.join(", ");
};

const DEFAULT_PAGE_SIZE = 10;

/* raw fetch & parser helpers */
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

/* Module-level in-flight promise to dedupe/insulate the initial network call */
let globalPendingPromise = null;

/* perform the network call for pending users; returns normalized object */
async function fetchPendingNetwork(getAuthHeader) {
  const headers = {
    "Content-Type": "application/json",
    ...(getAuthHeader() || {}),
  };
  try {
    const { res, body } = await rawFetch(API_GET, { method: "GET", headers });
    const ok = res.ok;
    const statusCode = res.status;
    const message = (body && (body.message || body.msg)) || null;
    const error = (body && (body.error || body.status || body.err)) || null;
    return { ok, statusCode, body, message, error };
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

/* returns a promise for pending users; reuses existing in-flight promise unless force===true */
function fetchPendingOnce(getAuthHeader, force = false) {
  if (globalPendingPromise && !force) return globalPendingPromise;

  globalPendingPromise = (async () => {
    try {
      const resp = await fetchPendingNetwork(getAuthHeader);
      return resp;
    } finally {
      // clear so refresh can create a new request
      globalPendingPromise = null;
    }
  })();

  return globalPendingPromise;
}

export default function ApproveRejectUser() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const mountedRef = useRef(true);
  const navigate = useNavigate();
  const { initialized, validate } = useSession();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // helper: parse response body + status to decide success/error and text
  const parseResponseMessage = (res, body) => {
    const text =
      (body &&
        (body.message || body.msg || body.status || body.errorMessage)) ||
      null;

    const lowerStatus = String(body?.status || "").toLowerCase();
    const lowerText = String(text || "").toLowerCase();

    const isError =
      !res.ok ||
      body?.success === false ||
      body?.error === true ||
      lowerStatus.includes("fail") ||
      lowerStatus.includes("error") ||
      lowerText.includes("fail") ||
      lowerText.includes("error");

    return {
      type: isError ? "error" : "success",
      text: text || (res.ok ? "Operation completed." : "Operation failed."),
    };
  };

  // build auth header (update key if you store token under different key)
  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // safeFetch used by approve/reject, handles 401 redirect
  const safeFetch = async (url, opts = {}) => {
    const headers = {
      ...(opts.headers || {}),
      ...getAuthHeader(),
    };
    const options = { ...opts, headers };

    try {
      const { res, body } = await rawFetch(url, options);
      if (res.status === 401) {
        if (mountedRef.current)
          setMsg({
            type: "error",
            text: "Session expired. Redirecting to login.",
          });
        try {
          // optionally clear tokens
        } catch {}
        navigate("/login");
        const err = new Error("Unauthorized");
        err.status = 401;
        throw err;
      }

      return {
        ok: res.ok,
        statusCode: res.status,
        body,
        message: (body && (body.message || body.msg)) || null,
        error: (body && (body.error || body.status || body.err)) || null,
      };
    } catch (err) {
      throw err;
    }
  };

  // loads pending users using the module-level in-flight promise; force=true bypasses and forces new request
  const loadPending = async (opts = { force: false }) => {
    if (mountedRef.current) {
      setLoading(true);
      setMsg(null);
    }

    try {
      const resp = await fetchPendingOnce(getAuthHeader, opts.force);

      if (!resp.ok) {
        const text =
          resp.error || resp.message || `Fetch failed (${resp.statusCode})`;
        if (mountedRef.current) {
          setItems([]);
          setMsg({ type: "error", text });
          setLoading(false);
        }
        return;
      }

      // normalize response shapes (array | { data: [] } | { users: [] } etc.)
      const body = resp.body;
      const list = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.users)
        ? body.users
        : Array.isArray(body?.items)
        ? body.items
        : [];

      if (mountedRef.current) {
        setItems(list);
      }
    } catch (err) {
      console.error("loadPending error:", err);
      if (mountedRef.current) {
        setItems([]);
        setMsg({
          type: "error",
          text: err.message || "Unable to load approvals.",
        });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // automatic initial fetch: wait for session validate (de-duped in useSession), then load pending;
  // this avoids race with session validation and prevents aborted first call
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!initialized) await validate({ force: false });
      } catch (e) {
        // ignore; safeFetch will handle 401
      }
      if (!mounted) return;
      await loadPending({ force: false });
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // manual refresh forces new network call
  const refresh = async () => {
    setPage(1);
    await loadPending({ force: true });
  };

  // approve/reject handler
  const handleAction = async (it, status) => {
    if (
      !window.confirm(
        `Are you sure you want to ${
          status === "APPROVE" ? "approve" : "reject"
        } the user "${it.userName}"?`
      )
    )
      return;

    setWorkingId(it.approvalId);
    setMsg(null);

    const payload = {
      userName: it.userName,
      modifiedBy: localStorage.getItem("userName") || "SYSTEM",
      status: status, // "APPROVE" or "REJECT"
      userId: it.userId,
    };

    try {
      const resp = await safeFetch(API_APPROVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = parseResponseMessage({ ok: resp.ok }, resp.body || {});

      if (mountedRef.current) setMsg(parsed);

      if (parsed.type === "success") {
        if (mountedRef.current) {
          setItems((prev) =>
            prev.filter((p) => p.approvalId !== it.approvalId)
          );
        }
      }
    } catch (err) {
      console.error(err);
      if (mountedRef.current) setMsg({ type: "error", text: "Network error." });
    } finally {
      if (mountedRef.current) setWorkingId(null);
    }
  };

  // CSV export
  const exportCsv = () => {
    if (!items.length) return;
    const headers = [
      "approvalId",
      "userId",
      "userName",
      "createdBy",
      "isApproved",
      "roleName",
    ];
    const rows = items.map((i) => [
      i.approvalId ?? "",
      i.userId ?? "",
      i.userName ?? "",
      i.createdBy ?? "",
      i.isApproved ?? "",
      Array.isArray(i.roleName) ? i.roleName.join(";") : i.roleName ?? "",
    ]);
    const csv =
      [headers.join(",")]
        .concat(
          rows.map((r) =>
            r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
          )
        )
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user_approvals_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (mountedRef.current)
      setMsg({ type: "success", text: "Exported approvals as CSV." });
  };

  // search + pagination
  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        String(i.userName || "")
          .toLowerCase()
          .includes(q) ||
        (Array.isArray(i.roleName) &&
          i.roleName.join(" ").toLowerCase().includes(q)) ||
        String(i.createdBy || "")
          .toLowerCase()
          .includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice(
    (page - 1) * pageSize,
    (page - 1) * pageSize + pageSize
  );

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [pageSize, totalPages, page]);

  return (
    <div className="aru-wrapper">
      <Sidebar />
      <div className="aru-content">
        <Header />

        <main className="aru-main" role="main" aria-labelledby="aru-title">
          <div className="aru-header">
            <div>
              <h2 id="aru-title">User Approvals</h2>
              <p className="aru-sub">
                Approve or reject user account requests quickly.
              </p>
            </div>

            <div className="aru-controls">
              <div className="search-row">
                <input
                  className="search-input"
                  placeholder="Search username, roles, or created-by..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear
                </button>
              </div>

              <div className="right-controls">
                <label className="page-size-label">
                  Show
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={30}>30</option>
                  </select>
                </label>

                <button className="btn-ghost" onClick={refresh}>
                  Refresh
                </button>
                <button
                  className="btn"
                  onClick={exportCsv}
                  disabled={!items.length}
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="aru-panel">
            {msg && (
              <div
                className={`aru-msg ${msg.type}`}
                role={msg.type === "error" ? "alert" : "status"}
                onClick={() => setMsg(null)}
              >
                {msg.text}
              </div>
            )}

            <div className="aru-list-wrap">
              {loading ? (
                <div className="aru-empty">Loading approvals…</div>
              ) : filtered.length === 0 ? (
                <div className="aru-empty">No pending user approvals.</div>
              ) : (
                <>
                  <ul className="aru-list">
                    {pageData.map((it) => (
                      <li key={it.approvalId} className="aru-item">
                        <div className="aru-main-info">
                          <div className="aru-title-block">
                            <div className="aru-role-name">{it.userName}</div>
                            <div className="aru-meta">
                              <span>Request #{it.approvalId}</span>
                              <span className="sep">·</span>
                              <span>Created by: {it.createdBy}</span>
                              <span className="sep">·</span>
                              <span>Roles: {formatRoleList(it.roleName)}</span>
                              <span className="sep">·</span>
                              <span>
                                Status:{" "}
                                {it.isApproved === 1
                                  ? "Approved"
                                  : it.isApproved === 0
                                  ? "Pending"
                                  : "-"}
                              </span>
                            </div>
                          </div>

                          <div className="aru-desc">
                            Review this user’s request, check assigned roles and
                            approve or reject as appropriate.
                          </div>
                        </div>

                        <div className="apr-controls">
                          <button
                            className="btn-approve"
                            onClick={() => handleAction(it, "APPROVE")}
                            disabled={workingId === it.approvalId}
                          >
                            {workingId === it.approvalId
                              ? "Working…"
                              : "Approve"}
                          </button>

                          <button
                            className="btn-reject"
                            onClick={() => handleAction(it, "REJECT")}
                            disabled={workingId === it.approvalId}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="pager">
                    <div className="pager-info">
                      Showing {(page - 1) * pageSize + 1} -{" "}
                      {Math.min(page * pageSize, filtered.length)} of{" "}
                      {filtered.length}
                    </div>
                    <div className="pager-controls">
                      <button
                        className="btn-ghost"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                      >
                        « First
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        ‹ Prev
                      </button>
                      <span className="pager-current">
                        Page {page} / {totalPages}
                      </span>
                      <button
                        className="btn-ghost"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                      >
                        Next ›
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                      >
                        Last »
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
