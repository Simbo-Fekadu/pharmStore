import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "./useTheme.js";
import {
  ChevronDown,
  ChevronRight,
  Package2,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

// Base links for normal admin users
const adminLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/medicines", label: "Medicines" },
  { to: "/admin/medicines/add", label: "Add Medicine" },
  { to: "/admin/medicines/near-expiry", label: "Near Expiry" },
  { to: "/admin/medicines/trash", label: "Trash" },
  { to: "/admin/sales", label: "Sales" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/suppliers", label: "Suppliers" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/chat", label: "Chat" },
  { to: "/admin/transactions", label: "Transactions" },
];

// Additional / reorganized links for super admin (multi-tenant management first)
const superAdminExtra = [
  { to: "/admin", label: "Super Overview" },
  { to: "/admin", label: "Pharmacies" , superMode: "pharmacies"},
  { to: "/admin", label: "All Branches", superMode: "branches"},
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [invOpen, setInvOpen] = useState(() =>
    pathname.startsWith("/admin/inventory")
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  // chat unread tracking via localStorage timestamps
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
    // simple auth check placeholder
    const token = localStorage.getItem("token");
    if (!token) navigate("/signin");
    const role = localStorage.getItem("role");
    if (role && !["admin", "super_admin"].includes(role)) {
      navigate("/employee");
    }
  }, [navigate]);

  // Derive a simple, human-friendly title for the navbar
  const getNavbarTitle = (p) => {
    if (!p) return "Admin";
    if (p === "/admin" || p === "/admin/") return "Dashboard";
    if (p.startsWith("/admin/medicines/add")) return "Add Medicine";
    if (p.startsWith("/admin/medicines/near-expiry")) return "Near Expiry";
    if (p.startsWith("/admin/medicines/trash")) return "Trash";
    if (p.startsWith("/admin/medicines")) return "Medicines";
    if (p.startsWith("/admin/inventory/store")) return "Store Stock";
    if (p.startsWith("/admin/inventory/branches")) return "Branch Requests";
    if (p.startsWith("/admin/inventory")) return "Inventory";
    if (p.startsWith("/admin/sales")) return "Sales";
    if (p.startsWith("/admin/users")) return "Users";
    if (p.startsWith("/admin/suppliers")) return "Suppliers";
    if (p.startsWith("/admin/branches")) return "Branches";
    if (p.startsWith("/admin/transactions")) return "Transactions";
    if (p.startsWith("/admin/chat")) return "Chat";
    // Fallback: use last path segment capitalized
    const seg = p.split("/").filter(Boolean).pop();
    if (!seg) return "Admin";
    return seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  };
  const pageTitle = getNavbarTitle(pathname);

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
        <div className="text-xl font-bold tracking-wide flex items-center gap-2">
          Admin Panel
          {typeof window !== "undefined" &&
            localStorage.getItem("role") === "super_admin" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
                Super
              </span>
            )}
        </div>
        <nav className="flex flex-col gap-4 text-sm">
          {typeof window !== 'undefined' && localStorage.getItem('role') === 'super_admin' && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-white/40 px-3 mb-1">Multi-Tenant</div>
              <div className="flex flex-col gap-1">
                {superAdminExtra.map(l => (
                  <button
                    key={l.label + l.superMode}
                    onClick={() => {
                      if (l.superMode) {
                        localStorage.setItem('super_admin_mode', l.superMode);
                      }
                      navigate(l.to);
                    }}
                    className={`text-left px-3 py-2 rounded transition font-medium ${
                      pathname === l.to && (!l.superMode || localStorage.getItem('super_admin_mode') === l.superMode)
                        ? 'bg-[var(--brand)] text-white'
                        : 'hover:bg-[var(--brand)]/60'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-white/40 px-3 mb-1">Operations</div>
            <div className="flex flex-col gap-1">
              {adminLinks.map((l) => (
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
                  {l.to === "/admin/chat" && unread > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                      {unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {/* Inventory collapsible group */}
          <div className="mt-2">
            <button
              onClick={() => setInvOpen((o) => !o)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-medium transition ${
                pathname.startsWith("/admin/inventory")
                  ? "bg-[var(--brand)] text-white"
                  : "hover:bg-[var(--brand)]/60"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Package2 className="w-4 h-4" />
                Inventory
              </span>
              {invOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {invOpen && (
              <div className="pl-4 pt-1 flex flex-col gap-1">
                <button
                  onClick={() => navigate("/admin/inventory/store")}
                  className={`text-left px-3 py-1.5 rounded text-xs font-medium transition ${
                    pathname === "/admin/inventory/store"
                      ? "bg-[var(--brand)] text-white"
                      : "hover:bg-[var(--brand)]/50"
                  }`}
                >
                  Store Stock
                </button>
                <button
                  onClick={() => navigate("/admin/inventory/branches")}
                  className={`text-left px-3 py-1.5 rounded text-xs font-medium transition ${
                    pathname === "/admin/inventory/branches"
                      ? "bg-[var(--brand)] text-white"
                      : "hover:bg-[var(--brand)]/50"
                  }`}
                >
                  Branch Requests
                </button>
              </div>
            )}
          </div>
        </nav>
        {/* Sidebar actions removed; moved to top navbar */}
      </aside>
      {/* Top navbar (visible on all sizes) */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-[var(--bg-start)]/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between text-foreground">
        <div className="font-semibold text-foreground truncate">
          {pageTitle}
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile menu toggle */}
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
          {/* Theme toggle */}
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
          {/* Logout */}
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
              {typeof window !== 'undefined' && localStorage.getItem('role') === 'super_admin' && (
                <div className="flex flex-col gap-1 mb-4">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-white/40 px-3">Multi-Tenant</div>
                  {superAdminExtra.map(l => (
                    <button
                      key={l.label + l.superMode}
                      onClick={() => {
                        if (l.superMode) localStorage.setItem('super_admin_mode', l.superMode);
                        navigate(l.to);
                        setMobileOpen(false);
                      }}
                      className={`text-left px-3 py-2 rounded transition font-medium ${
                        pathname === l.to && (!l.superMode || localStorage.getItem('super_admin_mode') === l.superMode)
                          ? 'bg-[var(--brand)] text-white'
                          : 'hover:bg-[var(--brand)]/60'
                      }`}
                    >{l.label}</button>
                  ))}
                </div>
              )}
              {adminLinks.map((l) => (
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
              <div className="mt-2">
                <button
                  onClick={() => setInvOpen((o) => !o)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded font-medium transition ${
                    pathname.startsWith("/admin/inventory")
                      ? "bg-[var(--brand)] text-white"
                      : "hover:bg-[var(--brand)]/60"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Package2 className="w-4 h-4" />
                    Inventory
                  </span>
                  {invOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {invOpen && (
                  <div className="pl-4 pt-1 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        navigate("/admin/inventory/store");
                        setMobileOpen(false);
                      }}
                      className={`text-left px-3 py-1.5 rounded text-xs font-medium transition ${
                        pathname === "/admin/inventory/store"
                          ? "bg-[var(--brand)] text-white"
                          : "hover:bg-[var(--brand)]/50"
                      }`}
                    >
                      Store Stock
                    </button>
                    <button
                      onClick={() => {
                        navigate("/admin/inventory/branches");
                        setMobileOpen(false);
                      }}
                      className={`text-left px-3 py-1.5 rounded text-xs font-medium transition ${
                        pathname === "/admin/inventory/branches"
                          ? "bg-[var(--brand)] text-white"
                          : "hover:bg-[var(--brand)]/50"
                      }`}
                    >
                      Branch Requests
                    </button>
                  </div>
                )}
              </div>
            </nav>
            {/* Drawer actions removed; use top navbar icons */}
          </div>
        </div>
      )}
      {/* Content */}
      <main className="content-root flex-1 w-full md:pl-0 px-4 md:px-8 pt-20 pb-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
