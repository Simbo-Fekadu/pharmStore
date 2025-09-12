import { useEffect, useState, useRef, useCallback } from "react";

const API = "http://localhost:3000/backend";

const EmployeeChat = () => {
  const [messages, setMessages] = useState([]);
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
      if (res.ok && data.success) setMessages(data.messages || []);
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
        {messages.map((m) => (
          <div
            key={m._id}
            className="bg-white/10 rounded-lg px-3 py-2 text-xs flex flex-col max-w-[80%]"
          >
            <div className="font-semibold mb-0.5 text-[10px] opacity-75">
              {m.senderHandle}
            </div>
            <div>{m.text}</div>
            <div className="text-[9px] mt-1 opacity-50">
              {new Date(m.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
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

export default EmployeeChat;
