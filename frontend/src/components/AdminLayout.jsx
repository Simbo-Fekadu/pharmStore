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

// Shared admin sidebar layout
const links = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/medicines", label: "Medicines" },
  { to: "/admin/medicines/add", label: "Add Medicine" },
  { to: "/admin/medicines/near-expiry", label: "Near Expiry" },
  { to: "/admin/medicines/trash", label: "Trash" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/suppliers", label: "Suppliers" },
  { to: "/admin/branches", label: "Branches" },
  { to: "/admin/transactions", label: "Transactions" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [invOpen, setInvOpen] = useState(() =>
    pathname.startsWith("/admin/inventory")
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    // simple auth check placeholder
    const token = localStorage.getItem("token");
    if (!token) navigate("/signin");
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
    if (p.startsWith("/admin/users")) return "Users";
    if (p.startsWith("/admin/suppliers")) return "Suppliers";
    if (p.startsWith("/admin/branches")) return "Branches";
    if (p.startsWith("/admin/transactions")) return "Transactions";
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
        <div className="text-xl font-bold tracking-wide">Admin Panel</div>
        <nav className="flex flex-col gap-1 text-sm">
          {links.map((l) => (
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
            </button>
          ))}
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
      <div className="fixed top-0 left-0 right-0 z-30 bg-[var(--bg-start)]/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
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
              {links.map((l) => (
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
