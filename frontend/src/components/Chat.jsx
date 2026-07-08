import { useEffect, useState, useRef, useCallback } from "react";
import { authFetch } from "../api/authFetch";
import { useParams } from "react-router-dom";
import { API_BASE } from "../api/base.js";

const Chat = ({ room: propRoom, requestId: propRequestId, role: propRole }) => {
  const { id: urlId } = useParams();
  const room = propRoom || "global";
  const requestId = propRequestId || urlId || null;

  const [messages, setMessages] = useState([]);
  const [requestData, setRequestData] = useState(null);
  const [selfHandle, setSelfHandle] = useState("");
  const [selfId, setSelfId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?._id) setSelfId(u._id);
        const role = propRole || u.role || localStorage.getItem("role");
        let h = u.username || localStorage.getItem("username") || "user";
        if (role === "admin") h = `${h}.admin`;
        else if (u.branch?.name) {
          const norm = u.branch.name.replace(/\s+/g, "").toLowerCase();
          h = `${h}.${norm}`;
        }
        setSelfHandle(h);
        return;
      }
      const role = propRole || localStorage.getItem("role");
      const uname = localStorage.getItem("username") || "user";
      setSelfHandle(role === "admin" ? `${uname}.admin` : uname);
    } catch {
      const role = propRole || localStorage.getItem("role");
      const uname = localStorage.getItem("username") || "user";
      setSelfHandle(role === "admin" ? `${uname}.admin` : uname);
    }
  }, [propRole]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (requestId) {
        const res = await authFetch(`${API_BASE}/inventory/request/${requestId}`);
        const data = await res.json();
        if (res.ok && data.success) setRequestData(data.request);
      } else {
        const res = await authFetch(`${API_BASE}/chat?room=${room}&limit=200`);
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
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [requestId, room]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (requestId) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (messages.length) {
      const last = messages[messages.length - 1];
      const ts = new Date(last.createdAt).getTime();
      localStorage.setItem("chatLastReadAt", String(ts));
      window.dispatchEvent(new CustomEvent("chat-read"));
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, requestData, requestId]);

  const send = async () => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    setText("");
    try {
      if (requestId) {
        const role = propRole || localStorage.getItem("role");
        const sender = role === "admin" ? "admin" : "branch";
        await authFetch(`${API_BASE}/inventory/request/${requestId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender, text: trimmed }),
        });
      } else {
        await authFetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, room }),
        });
      }
    } catch {
      /* ignore */
    }
    load();
  };

  const displayMessages = requestId ? (requestData?.messages || []) : messages;
  const isEmpty = displayMessages.length === 0;

  if (requestId && !requestData && !loading) {
    return <div className="p-6 text-sm text-white/60">Request not found</div>;
  }

  return (
    <div
      className={
        requestId
          ? "flex flex-col gap-4 p-4 max-w-4xl mx-auto"
          : "flex flex-col h-[70vh] max-w-3xl mx-auto bg-white/10 border border-white/10 rounded-xl"
      }
    >
      {/* Header */}
      {requestId ? (
        <div className="flex flex-wrap gap-4 items-center">
          <h1 className="text-xl font-semibold">Request Chat</h1>
          <div className="text-xs text-white/60">
            Status: {requestData?.status}
          </div>
          <button
            onClick={load}
            className="ml-auto px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <h2 className="text-sm font-semibold">Team Chat</h2>
          <button
            onClick={load}
            className="ml-auto px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        className={
          requestId
            ? "bg-white/10 border border-white/10 rounded-xl p-4 flex flex-col gap-4 max-h-[65vh] overflow-y-auto"
            : "flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        }
      >
        {isEmpty && !loading && (
          <div className="text-xs text-white/60">No messages yet.</div>
        )}

        {requestId
          ? displayMessages.map((m, i) => (
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
            ))
          : displayMessages.map((m) => {
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
                    <div className="whitespace-pre-wrap break-words">
                      {m.text}
                    </div>
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

      {/* Input */}
      <div
        className={
          requestId ? "flex items-center gap-2" : "p-3 border-t border-white/10 flex items-center gap-2"
        }
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder={requestId ? "Type a message" : "Message"}
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
