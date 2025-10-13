import React, { useCallback, useMemo, useRef, useState } from "react";
import ToastContext from "../contexts/ToastContext";

let idSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (opts) => {
      const {
        title,
        message,
        type = "info",
        duration = 3000,
      } = typeof opts === "string"
        ? { message: opts, type: "info", duration: 3000 }
        : opts || {};
      const id = idSeq++;
      const toast = { id, title, message, type };
      setToasts((list) => [toast, ...list].slice(0, 6));
      const tm = setTimeout(() => remove(id), Math.max(1500, duration));
      timers.current.set(id, tm);
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (msg, title) => push({ message: msg, title, type: "success" }),
      error: (msg, title) =>
        push({ message: msg, title, type: "error", duration: 5000 }),
      info: (msg, title) => push({ message: msg, title, type: "info" }),
      remove,
    }),
    [push, remove]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[240px] max-w-[360px] rounded-lg border shadow-lg px-4 py-3 text-sm backdrop-blur transition-transform animate-in fade-in slide-in-from-top-2 ${
              t.type === "success"
                ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
                : t.type === "error"
                ? "bg-red-600/15 border-red-500/30 text-red-200"
                : "bg-white/10 border-white/15 text-white"
            }`}
            role="status"
            aria-live="polite"
          >
            {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
            {t.message && (
              <div className="opacity-90 leading-relaxed">{t.message}</div>
            )}
            <button
              onClick={() => api.remove(t.id)}
              className="absolute top-1.5 right-2 text-white/70 hover:text-white"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
