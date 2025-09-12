import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

const EmployeeRequestChat = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/inventory/request/${id}`);
      const data = await res.json();
      if (res.ok && data.success) setRequest(data.request);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!id) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id, load]);

  const send = async () => {
    if (!msg.trim() || !id) return;
    const token = localStorage.getItem("token");
    const text = msg.trim();
    setMsg("");
    await fetch(`${API}/inventory/request/${id}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ sender: "branch", text }),
    });
    load();
  };

  if (!request) {
    return (
      <div className="p-6 text-sm text-white/60">
        {loading ? "Loading..." : "Request not found"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap gap-4 items-center">
        <h1 className="text-xl font-semibold">Request Chat</h1>
        <div className="text-xs text-white/60">Status: {request.status}</div>
      </div>
      <div className="bg-white/10 border border-white/10 rounded-xl p-4 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
        {request.messages?.length === 0 && (
          <div className="text-xs text-white/50">No messages yet.</div>
        )}
        {request.messages?.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed shadow flex flex-col ${
              m.sender === "admin"
                ? "self-start bg-white/10 text-white/80"
                : "self-end bg-[var(--brand)] text-white ml-auto"
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
        {loading && <div className="text-xs text-white/40">Loading...</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message"
          className="flex-1 px-3 py-2 rounded bg-white/20 text-xs"
        />
        <button
          onClick={send}
          className="px-4 py-2 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-xs font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default EmployeeRequestChat;
