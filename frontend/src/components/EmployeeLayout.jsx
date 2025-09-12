import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "./useTheme.js";
import { Menu, X, Sun, Moon, LogOut } from "lucide-react";

// Clone of AdminLayout styling (no price metrics handled in EmployeeDashboard) with limited links
const empLinks = [
  { to: "/employee", label: "Dashboard" },
  { to: "/employee/medicines", label: "Medicines" },
  { to: "/employee/branch-medicines", label: "Branch Medicines" },
  { to: "/employee/requests", label: "Requests" },
  { to: "/employee/fulfillment", label: "Fulfillment" },
  { to: "/employee/chat", label: "Chat" },
];

const EmployeeLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const calc = () => {
      try {
        const lastRead = Number(localStorage.getItem("chatLastReadAt") || 0);
        const lastSeen = Number(localStorage.getItem("chatLastFetchTs") || 0);
        const stored = Number(localStorage.getItem("chatUnreadCount") || 0);
        setUnread(lastSeen > lastRead ? stored : 0);
      } catch {
        /* ignore */
      }
    };
    calc();
    const clear = () => setUnread(0);
    window.addEventListener("chat-read", clear);
    window.addEventListener("chat-updated", calc);
    window.addEventListener("storage", calc);
    return () => {
      window.removeEventListener("chat-read", clear);
      window.removeEventListener("chat-updated", calc);
      window.removeEventListener("storage", calc);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/signin");
  }, [navigate]);

  // Title derivation matching admin approach
  const getTitle = (p) => {
    if (!p) return "Employee";
    if (p === "/employee" || p === "/employee/") return "Dashboard";
    if (p.startsWith("/employee/medicines")) return "Medicines";
    if (p.startsWith("/employee/requests")) return "Requests";
    if (p.startsWith("/employee/branch-medicines")) return "Branch Medicines";
    if (p.startsWith("/employee/fulfillment")) return "Fulfillment";
    if (p.startsWith("/employee/chat")) return "Chat";
    const seg = p.split("/").filter(Boolean).pop();
    if (!seg) return "Employee";
    return seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  };
  const pageTitle = getTitle(pathname);

  return (
    <div className="min-h-screen flex app-gradient text-foreground">
      {/* Sidebar */}
      <aside
        className="w-64 hidden md:flex flex-col p-5 gap-4 overflow-y-auto"
        style={{
          background: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        <div className="text-xl font-bold tracking-wide">Team Portal</div>
        <nav className="flex flex-col gap-1 text-sm">
          {empLinks.map((l) => (
            <button
              key={l.to}
              onClick={() => navigate(l.to)}
              className={`text-left px-3 py-2 rounded transition font-medium ${
                pathname === l.to
                  ? "bg-[var(--brand)] text-white"
                  : "hover:bg-[var(--brand)]/60"
              }`}
            >
              {l.label}
              {l.to === "/employee/chat" && unread > 0 && (
                <span className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>
      {/* Top navbar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[var(--bg-start)]/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-foreground truncate">
          {pageTitle}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="p-2 rounded border border-border bg-muted hover:bg-muted/80 text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/signin");
            }}
            aria-label="Logout"
            title="Logout"
            className="p-2 rounded border border-border bg-muted hover:bg-muted/80 text-foreground"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute top-0 right-0 w-64 h-full flex flex-col p-5 gap-4"
            style={{
              background: "var(--sidebar-bg)",
              color: "var(--sidebar-text)",
              boxShadow: "-4px 0 16px -4px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold">Menu</div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 text-sm overflow-y-auto">
              {empLinks.map((l) => (
                <button
                  key={l.to}
                  onClick={() => {
                    navigate(l.to);
                    setMobileOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded transition font-medium ${
                    pathname === l.to
                      ? "bg-[var(--brand)] text-white"
                      : "hover:bg-[var(--brand)]/60"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
      {/* Content */}
      <main className="content-root flex-1 w-full md:pl-0 px-4 md:px-8 pt-20 pb-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default EmployeeLayout;
