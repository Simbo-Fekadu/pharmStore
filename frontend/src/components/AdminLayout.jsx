import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "./useTheme.js";
import { ChevronDown, ChevronRight, Package2, Menu, X } from "lucide-react";

// Shared admin sidebar layout
const links = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/medicines", label: "Medicines" },
  { to: "/admin/medicines/near-expiry", label: "Near Expiry" },
  { to: "/admin/medicines/trash", label: "Trash" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/suppliers", label: "Suppliers" },
  { to: "/admin/branches", label: "Branches" },
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

  return (
    <div className="min-h-screen flex app-gradient text-white">
      {/* Sidebar */}
      <aside
        className="w-60 hidden md:flex flex-col p-5 gap-4"
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
        <div className="mt-auto pt-4 space-y-2">
          <button
            onClick={toggle}
            className="w-full px-3 py-2 rounded text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10"
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/signin");
            }}
            className="w-full btn-brand hover:bg-[var(--brand-hover)] text-white font-semibold py-2 rounded transition"
          >
            Logout
          </button>
        </div>
      </aside>
      {/* Mobile top bar with toggle button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[var(--bg-start)]/90 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="font-bold">Admin</div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
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
                className="p-2 rounded hover:bg-white/10"
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
            <div className="mt-auto pt-4 space-y-2">
              <button
                onClick={toggle}
                className="w-full px-3 py-2 rounded text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/signin");
                  setMobileOpen(false);
                }}
                className="w-full btn-brand hover:bg-[var(--brand-hover)] text-white font-semibold py-2 rounded transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Content */}
      <main className="flex-1 w-full md:pl-0 px-4 md:px-8 pt-20 md:pt-8 pb-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
