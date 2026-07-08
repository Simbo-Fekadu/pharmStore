import { useEffect, useState, useCallback } from "react";
import { authFetch } from "../api/authFetch";

import { API_BASE } from "../api/base";
const API = API_BASE;

const AdminRequestCenter = () => {
  const [requests, setRequests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  // loading state removed (chat thread polling removed)
  // Chat removed: no longer using per-request embedded chat UI
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("Pending");
  const [centralStock, setCentralStock] = useState(null);
  const [approveError, setApproveError] = useState("");
  const [userRole, setUserRole] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/inventory/request`);
      const data = await res.json();
      if (res.ok && data.success) setRequests(data.requests || []);
    } catch {
      /* ignore load error */
    }
  }, []);

  const loadOne = useCallback(async (id) => {
    try {
      const res = await authFetch(`${API}/inventory/request/${id}`);
      const data = await res.json();
      if (res.ok && data.success) setActiveRequest(data.request);
      // After loading the request, fetch central stock for its medicine
      const medId = data?.request?.medicine?._id || data?.request?.medicine;
      if (medId) {
        try {
          const sRes = await authFetch(
            `${API}/inventory/stock?locationId=main&medicineId=${medId}`
          );
          const sData = await sRes.json();
          if (sRes.ok && sData.success) {
            const bal = sData.balances?.[0];
            setCentralStock(bal ? bal.onHandQty : 0);
          } else {
            setCentralStock(null);
          }
        } catch {
          setCentralStock(null);
        }
      } else {
        setCentralStock(null);
      }
    } catch {
      /* ignore single request load error */
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, [loadRequests]);
  useEffect(() => {
    if (activeId) loadOne(activeId);
  }, [activeId, loadOne]);
  // Remove periodic polling; refresh active request on focus
  useEffect(() => {
    const onFocus = () => {
      if (activeId) loadOne(activeId);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeId, loadOne]);

  const authHeaders = () => ({ "Content-Type": "application/json" });

  // sendMessage removed

  const approve = async () => {
    if (!activeId) return;
    setApproveError("");
    await authFetch(`${API}/inventory/request/${activeId}/approve`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setApproveError(j.message || `Approve failed (${r.status})`);
        } else {
          setApproveError("");
        }
      })
      .catch(() => setApproveError("Network error attempting approve"));
    await loadRequests();
    loadOne(activeId);
  };

  const reject = async () => {
    if (!activeId) return;
    await authFetch(`${API}/inventory/request/${activeId}/reject`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ note }),
    });
    setNote("");
    await loadRequests();
    loadOne(activeId);
  };

  const reverseShipment = async () => {
    if (!activeId) return;
    const reason = window.prompt("Reason for reversing this shipment:");
    if (!reason) return;
    await authFetch(`${API}/inventory/request/${activeId}/reverse`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ note: reason }),
    });
    await loadRequests();
    loadOne(activeId);
  };

  const filtered = requests.filter((r) =>
    tab === "All" ? true : r.status === tab
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-1/2 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {["Pending", "Shipped", "Received", "Rejected", "Reversed", "All"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded font-medium border ${
                tab === t
                  ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={loadRequests}
            className="ml-auto px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/10"
          >
            Refresh
          </button>
        </div>
        <div className="bg-white/10 rounded-xl border border-white/10 backdrop-blur divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-white/60">No requests.</div>
          )}
          {filtered.map((r) => (
            <button
              key={r._id}
              onClick={() => setActiveId(r._id)}
              className={`w-full text-left p-4 flex flex-col gap-1 hover:bg-white/5 transition ${
                activeId === r._id ? "bg-white/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">
                  {r.medicine?.medicineName || "Medicine"}{" "}
                  <span className="text-white/50 font-normal">
                    x{r.quantity}
                  </span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-semibold ${
                    r.status === "Pending"
                      ? "bg-amber-500/20 text-amber-300"
                      : r.status === "Shipped"
                      ? "bg-indigo-500/20 text-indigo-300"
                      : r.status === "Received"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : r.status === "Rejected"
                      ? "bg-rose-500/20 text-rose-300"
                      : r.status === "Reversed"
                      ? "bg-gray-500/20 text-gray-300"
                      : "bg-gray-500/20 text-gray-300"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-[11px] text-white/60 flex justify-between">
                <span>{r.branch?.name || "Branch"}</span>
                <span>{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              {r.reason && (
                <div className="text-[11px] text-white/50 line-clamp-2">
                  {r.reason}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="lg:flex-1 flex flex-col bg-white/10 border border-white/10 rounded-xl backdrop-blur min-h-[60vh]">
        {!activeRequest && (
          <div className="m-auto text-white/60 text-sm p-8 text-center">
            Select a request to review.
          </div>
        )}
        {activeRequest && (
          <>
            <div className="p-4 border-b border-white/10 flex flex-wrap gap-4 items-center">
              <div>
                <div className="font-semibold text-sm">
                  {activeRequest.medicine?.medicineName} • Qty{" "}
                  {activeRequest.quantity}
                </div>
                <div className="text-[11px] text-white/60">
                  Branch: {activeRequest.branch?.name} • Status:{" "}
                  {activeRequest.status}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {activeRequest.status === "Pending" && (
                  <>
                    <button
                      onClick={approve}
                      className="px-3 py-1.5 text-xs rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={reject}
                      className="px-3 py-1.5 text-xs rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold"
                    >
                      Reject
                    </button>
                  </>
                )}
                {activeRequest.status === "Shipped" &&
                  userRole &&
                  ["admin", "inventory_manager"].includes(userRole) && (
                    <button
                      onClick={reverseShipment}
                      className="px-3 py-1.5 text-xs rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 font-semibold"
                    >
                      Reverse Shipment
                    </button>
                  )}
              </div>
            </div>
            <div className="flex flex-col gap-6 flex-1 overflow-auto p-4">
              <div className="w-full lg:w-1/3 border border-white/10 p-4 space-y-3 rounded-lg bg-white/5 overflow-y-auto">
                <h3 className="text-sm font-semibold">Request Details</h3>
                <div className="text-xs space-y-1 text-white/70">
                  <div>
                    <span className="text-white/40">Medicine: </span>
                    {activeRequest.medicine?.medicineName}
                  </div>
                  {centralStock !== null && (
                    <div>
                      <span className="text-white/40">Central Stock: </span>
                      {centralStock}
                      {activeRequest.status === "Pending" && (
                        <span
                          className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                            centralStock >= activeRequest.quantity
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {centralStock >= activeRequest.quantity
                            ? "OK"
                            : "LOW"}
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="text-white/40">Brand: </span>
                    {activeRequest.medicine?.brand || "—"}
                  </div>
                  <div>
                    <span className="text-white/40">Category: </span>
                    {activeRequest.medicine?.category || "—"}
                  </div>
                  <div>
                    <span className="text-white/40">Quantity: </span>
                    {activeRequest.quantity}
                  </div>
                  <div>
                    <span className="text-white/40">Batch: </span>
                    {activeRequest.batchNumber ||
                      activeRequest.medicine?.batchNumber ||
                      "—"}
                  </div>
                  <div>
                    <span className="text-white/40">Reason: </span>
                    {activeRequest.reason || "—"}
                  </div>
                  <div>
                    <span className="text-white/40">Created: </span>
                    {new Date(activeRequest.createdAt).toLocaleString()}
                  </div>
                  {activeRequest.fulfilledAt && (
                    <div>
                      <span className="text-white/40">Fulfilled: </span>
                      {new Date(activeRequest.fulfilledAt).toLocaleString()}
                    </div>
                  )}
                  {activeRequest.approvedByUserId && (
                    <div>
                      <span className="text-white/40">Approved By: </span>
                      {activeRequest.approvedByUserId.username ||
                        activeRequest.approvedByUserId}
                    </div>
                  )}
                  {activeRequest.rejectionNote && (
                    <div className="text-rose-300">
                      <span className="text-white/40">Note: </span>
                      {activeRequest.rejectionNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {activeRequest.status === "Rejected" &&
              activeRequest.rejectionNote && (
                <div className="px-4 pb-2 text-[11px] text-rose-300">
                  Rejection Note: {activeRequest.rejectionNote}
                </div>
              )}
            {approveError && (
              <div className="px-4 pb-2 text-[11px] text-rose-300">
                {approveError}
              </div>
            )}
            {/* Chat input removed */}
            {activeRequest.status === "Pending" && (
              <div className="px-4 pb-3 flex items-center gap-2">
                <input
                  placeholder="Rejection note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 px-2 py-1 rounded bg-white/20 text-[11px]"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRequestCenter;
