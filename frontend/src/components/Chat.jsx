import { useEffect, useState, useRef, useCallback } from "react";

import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

// Shared chat component for both admin and employee
const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [selfHandle, setSelfHandle] = useState("");
  const [selfId, setSelfId] = useState("");
  // derive current user's chat handle (mirror backend logic) + id for reliable alignment
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?._id) setSelfId(u._id);
        const role = u.role || localStorage.getItem("role");
        let h = u.username || localStorage.getItem("username") || "user";
        if (role === "admin") h = `${h}.admin`;
        else if (u.branch?.name) {
          const norm = u.branch.name.replace(/\s+/g, "").toLowerCase();
          h = `${h}.${norm}`;
        }
        setSelfHandle(h);
        return; // done
      }
      // fallback if no stored user object yet
      const role = localStorage.getItem("role");
      const uname = localStorage.getItem("username") || "user";
      setSelfHandle(role === "admin" ? `${uname}.admin` : uname);
    } catch {
      const role = localStorage.getItem("role");
      const uname = localStorage.getItem("username") || "user";
      setSelfHandle(role === "admin" ? `${uname}.admin` : uname);
    }
  }, []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/chat?room=global&limit=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const msgs = data.messages || [];
        const lastRead = Number(localStorage.getItem("chatLastReadAt") || 0);
        const lastTs = msgs.length
          ? new Date(msgs[msgs.length - 1].createdAt).getTime()
          : 0;
        localStorage.setItem("chatLastFetchTs", String(lastTs));
        let unreadCount = 0;
        if (lastTs > lastRead) {
          unreadCount = msgs.filter(
            (m) => new Date(m.createdAt).getTime() > lastRead
          ).length;
        }
        localStorage.setItem("chatUnreadCount", String(unreadCount));
        setMessages(msgs);
        window.dispatchEvent(new CustomEvent("chat-updated"));
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (messages.length) {
      // mark last read timestamp
      const last = messages[messages.length - 1];
      const ts = new Date(last.createdAt).getTime();
      localStorage.setItem("chatLastReadAt", String(ts));
      // notify layouts to reset badge
      window.dispatchEvent(new CustomEvent("chat-read"));
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    const token = localStorage.getItem("token");
    const body = { text: text.trim(), room: "global" };
    setText("");
    await fetch(`${API}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body),
    }).catch(() => {});
    load();
  };

  return (
    <div className="flex flex-col h-[70vh] max-w-3xl mx-auto bg-white/10 border border-white/10 rounded-xl">
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <h2 className="text-sm font-semibold">Team Chat</h2>
        <button
          onClick={load}
          className="ml-auto px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20"
        >
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !loading && (
          <div className="text-xs text-white/60">No messages yet.</div>
        )}
        {messages.map((m) => {
          // Unified ownership detection (same for admin & employee):
          // 1. Match senderId
          // 2. Exact handle match
          // 3. Base username (before first dot) matches for suffix variations
          const baseSelf = (selfHandle || "").split(".")[0];
          const baseMsg = (m.senderHandle || "").split(".")[0];
          const mine =
            (selfId && m.senderId === selfId) ||
            m.senderHandle === selfHandle ||
            (baseSelf && baseSelf === baseMsg);
          return (
            <div
              key={m._id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-xl px-3 py-2 text-xs flex flex-col max-w-[70%] shadow ${
                  mine
                    ? "bg-[var(--brand)] text-white ml-auto"
                    : "bg-white/10 text-white/80"
                }`}
              >
                <div className="font-semibold mb-0.5 text-[10px] opacity-75">
                  {m.senderHandle}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className="text-[9px] mt-1 opacity-50">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
        {loading && <div className="text-xs text-white/40">Loading...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message"
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

export default Chat;
