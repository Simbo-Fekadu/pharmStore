import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmContext from "../contexts/ConfirmContext";

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false });

  const confirm = useCallback((options = {}) => {
    const {
      title = "Are you sure?",
      message = "This action cannot be undone.",
      confirmText = "Confirm",
      cancelText = "Cancel",
      tone = "default",
    } = options;
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        message,
        confirmText,
        cancelText,
        tone,
        resolve,
      });
    });
  }, []);

  const onConfirm = useCallback(() => {
    setState((s) => {
      if (s.resolve) s.resolve(true);
      return { ...s, open: false };
    });
  }, []);
  const onCancel = useCallback(() => {
    setState((s) => {
      if (s.resolve) s.resolve(false);
      return { ...s, open: false };
    });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, onCancel, onConfirm]);

  const api = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[1001] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-xl border border-border shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {state.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-sm transition-colors"
                >
                  {state.cancelText || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded text-sm transition-colors ${
                    state.tone === "danger"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {state.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
