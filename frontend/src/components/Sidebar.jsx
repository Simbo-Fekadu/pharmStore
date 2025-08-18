import { useNavigate, useLocation } from "react-router-dom";

// General (non-admin) navigation only. Admin links live exclusively inside AdminLayout.
const navLinks = [
  { to: "/home", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/requests", label: "Requests" },
  { to: "/fulfillment", label: "Fulfillment" },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <aside className="hidden md:flex md:w-64 flex-col bg-[var(--bg-start)]/90 backdrop-blur-sm border-r border-white/10 p-6 gap-4">
      <div className="text-2xl font-bold tracking-wide">PharmStore</div>
      <nav className="flex flex-col gap-1">
        {navLinks.map((l) => {
          const active = pathname === l.to;
          return (
            <button
              key={l.to}
              onClick={() => navigate(l.to)}
              className={`text-left px-3 py-2 rounded text-sm font-medium transition ${
                active
                  ? "bg-[var(--brand)] text-white"
                  : "hover:bg-[var(--brand)]/60 text-white/90"
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/signin");
          }}
          className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold py-2 rounded transition"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
