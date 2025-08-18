import { useEffect, useState, useCallback } from "react";

const API = "http://localhost:3000/backend";

// Admin request center: list branch requests and chat / approve / reject
const AdminRequestCenter = () => {
  const [requests, setRequests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [storeId, setStoreId] = useState(""); // admin selects store to fulfill
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("Pending");

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API}/inventory/request`);
      const data = await res.json();
      if (res.ok && data.success) setRequests(data.requests || []);
    } catch {
      // ignore load error
    }
  }, []);

  const loadOne = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/inventory/request/${id}`);
      const data = await res.json();
      if (res.ok && data.success) setActiveRequest(data.request);
    } catch {
      // ignore single load error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);
  useEffect(() => {
    if (activeId) loadOne(activeId);
  }, [activeId, loadOne]);

  // simple polling for chat freshness
  useEffect(() => {
    const t = setInterval(() => {
      if (activeId) loadOne(activeId);
    }, 5000);
    return () => clearInterval(t);
  }, [activeId, loadOne]);

  const sendMessage = async () => {
    if (!msgText.trim() || !activeId) return;
    const text = msgText.trim();
    setMsgText("");
    await fetch(`${API}/inventory/request/${activeId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "admin", text }),
    });
    loadOne(activeId);
  };

  const approve = async () => {
    if (!activeId || !storeId) return;
    await fetch(`${API}/inventory/request/${activeId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    });
    await loadRequests();
    loadOne(activeId);
  };

  const reject = async () => {
    if (!activeId) return;
    await fetch(`${API}/inventory/request/${activeId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setNote("");
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
          {["Pending", "Fulfilled", "Rejected", "All"].map((t) => (
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
                      : r.status === "Fulfilled"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
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
            Select a request to review & chat.
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
                    <input
                      placeholder="Store ID"
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                      className="px-2 py-1 rounded bg-white/20 text-xs"
                    />
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
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeRequest.messages?.length === 0 && (
                <div className="text-xs text-white/50">No messages yet.</div>
              )}
              {activeRequest.messages?.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow ${
                    m.sender === "admin"
                      ? "ml-auto bg-[var(--brand)] text-white"
                      : "bg-white/10 text-white/80"
                  }`}
                >
                  <div className="font-semibold mb-0.5 text-[10px] opacity-75">
                    {m.sender}
                  </div>
                  <div>{m.text}</div>
                  <div className="text-[9px] mt-1 opacity-50">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-xs text-white/40">Loading...</div>
              )}
            </div>
            {activeRequest.status === "Rejected" &&
              activeRequest.rejectionNote && (
                <div className="px-4 pb-2 text-[11px] text-rose-300">
                  Rejection Note: {activeRequest.rejectionNote}
                </div>
              )}
            <div className="p-3 border-t border-white/10 flex items-center gap-2">
              <input
                placeholder="Type a message"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 px-3 py-2 rounded bg-white/20 text-xs"
              />
              <button
                onClick={sendMessage}
                className="px-3 py-2 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold"
              >
                Send
              </button>
            </div>
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
