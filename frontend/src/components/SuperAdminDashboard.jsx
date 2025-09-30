import { useEffect, useState } from "react";
import { getApiBase } from "../api/base";
import {
  Users,
  PackageSearch,
  Factory,
  Building2,
  AlertTriangle,
  Activity,
  ClipboardList,
  Layers3,
  RefreshCcw,
} from "lucide-react";

const API = getApiBase() + "/backend";

const num = (v) => (typeof v === "number" ? v : 0);

const Card = ({ icon, label, value, accent }) => (
  <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-3">
    <div
      className={`p-2 rounded-lg bg-${accent}-500/15 border border-${accent}-500/30`}
    >
      {icon}
    </div>
    <div className="flex flex-col">
      <div className="text-xs font-semibold uppercase text-white/60">
        {label}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  </div>
);

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/superadmin/overview`, {
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) setData(json.overview);
      else throw new Error(json.message || "Failed to load overview");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const role = typeof window !== "undefined" && localStorage.getItem("role");

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Super Admin Overview
            {role === "super_admin" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
                Super
              </span>
            )}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            System-wide consolidated metrics & recent activity
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-flex items-center gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && (
        <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
          {error}
        </div>
      )}
      {!data && !error && (
        <div className="text-white/50 text-sm">Loading overview...</div>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card
              icon={<Users className="w-5 h-5 text-emerald-400" />}
              label="Total Users"
              value={num(data.users.total)}
              accent="emerald"
            />
            <Card
              icon={<Factory className="w-5 h-5 text-indigo-400" />}
              label="Branches"
              value={num(data.branches.total)}
              accent="indigo"
            />
            <Card
              icon={<Building2 className="w-5 h-5 text-sky-400" />}
              label="Suppliers"
              value={num(data.suppliers.total)}
              accent="sky"
            />
            <Card
              icon={<PackageSearch className="w-5 h-5 text-emerald-400" />}
              label="Active Medicines"
              value={num(data.medicines.totalActive)}
              accent="emerald"
            />
            <Card
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              label="Near Expiry"
              value={num(data.medicines.nearExpiry)}
              accent="amber"
            />
            <Card
              icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
              label="Expired"
              value={num(data.medicines.expired)}
              accent="rose"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Recent Stock Transactions
                </h2>
                {data.recentTransactions.length === 0 && (
                  <div className="text-white/60 text-sm">None</div>
                )}
                <ul className="space-y-2 text-sm max-h-72 overflow-auto pr-1">
                  {data.recentTransactions.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 p-2 rounded bg-white/5"
                    >
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider font-semibold">
                        {t.type}
                      </span>
                      <span className="font-medium truncate">
                        {t.medicine || "Unknown"}
                      </span>
                      <span className="text-white/50 text-xs">{t.qty}</span>
                      <span className="ml-auto text-white/40 text-[11px]">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> Recent Requests
                </h2>
                {data.requests.recent.length === 0 && (
                  <div className="text-white/60 text-sm">None</div>
                )}
                <ul className="space-y-2 text-sm max-h-72 overflow-auto pr-1">
                  {data.requests.recent.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 p-2 rounded bg-white/5"
                    >
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider font-semibold">
                        {r.status}
                      </span>
                      <span className="font-medium truncate">
                        {r.medicine || "Unknown"}
                      </span>
                      <span className="text-white/50 text-xs">{r.qty}</span>
                      <span className="text-white/50 text-xs truncate">
                        {r.branch || "-"}
                      </span>
                      <span className="ml-auto text-white/40 text-[11px]">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Layers3 className="w-5 h-5" /> Inventory Summary
                </h2>
                <div className="space-y-2 text-sm">
                  <Row
                    label="Total On Hand Units"
                    value={num(data.inventory.totalOnHand)}
                  />
                  <Row
                    label="Distinct Medicines in Stock"
                    value={num(data.inventory.distinctMedicines)}
                  />
                  <Row
                    label="Pending Requests"
                    value={num(data.requests.pending)}
                  />
                  <Row
                    label="Deleted Medicines"
                    value={num(data.medicines.deleted)}
                  />
                </div>
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  Top Categories
                </h2>
                {data.topCategories.length === 0 && (
                  <div className="text-white/60 text-sm">No category data</div>
                )}
                <ul className="space-y-2 text-sm">
                  {data.topCategories.map((c) => (
                    <li
                      key={c.category}
                      className="flex items-center gap-3 p-2 rounded bg-white/5"
                    >
                      <span className="font-medium truncate flex-1">
                        {c.category || "Unknown"}
                      </span>
                      <span className="text-white/50 text-xs">
                        {c.totalQty}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-white/40 pt-4">
            Generated at: {new Date(data.generatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
    <span className="text-white/60 text-xs">{label}</span>
    <span className="font-semibold text-white/80 text-sm">{value}</span>
  </div>
);
