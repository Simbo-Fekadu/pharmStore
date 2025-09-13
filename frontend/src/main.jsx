import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ThemeProvider from "./components/ThemeProvider.jsx";

function DebugOverlay() {
  const [info, setInfo] = useState({});
  useEffect(() => {
    const apiBase =
      import.meta.env.VITE_API_BASE || window.desktop?.config?.apiBase;
    const isElec = !!window.desktop?.isElectron;
    const hash = window.location.hash;
    setInfo({ apiBase, isElec, hash });
    console.log(
      "[Debug] Mounted root. apiBase=",
      apiBase,
      "isElectron=",
      isElec,
      "hash=",
      hash
    );
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 4,
        right: 6,
        padding: "4px 8px",
        background: "rgba(0,0,0,0.55)",
        color: "#0ff",
        fontSize: 11,
        fontFamily: "monospace",
        zIndex: 9999,
        border: "1px solid #0ff",
        borderRadius: 4,
      }}
    >
      <div>electron: {String(info.isElec)}</div>
      <div>hash: {info.hash}</div>
      <div>api: {info.apiBase || "∅"}</div>
    </div>
  );
}

function MissingPreload() {
  if (window.desktop) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        background: "#b00020",
        color: "#fff",
        padding: "8px 12px",
        fontFamily: "sans-serif",
        fontSize: 13,
        zIndex: 10000,
        borderRadius: 6,
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      Preload not loaded (window.desktop missing). Routes forced to HashRouter
      fallback.
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <App />
        <DebugOverlay />
        <MissingPreload />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>
);
