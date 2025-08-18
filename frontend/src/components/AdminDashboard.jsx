import { useEffect, useState } from "react";
import { Package, Clock, Skull, Trash2 } from "lucide-react";
const API = "http://localhost:3000/backend";

// Dashboard with summary metrics
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    nearExpiry: 0,
    expired: 0,
    deleted: 0,
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/medicine?includeDeleted=true`);
      const data = await res.json();
      if (res.ok && data.success) {
        const meds = data.medicines || [];
        const now = Date.now();
        const nearCut = now + 90 * 86400000; // 90 day near-expiry window
        const active = meds.filter((m) => !m.isDeleted);
        const expired = active.filter(
          (m) => new Date(m.expiryDate).getTime() < now
        );
        const near = active.filter((m) => {
          const t = new Date(m.expiryDate).getTime();
          return t >= now && t <= nearCut;
        });
        const deleted = meds.filter((m) => m.isDeleted);
        setStats({
          total: active.length,
          nearExpiry: near.length,
          expired: expired.length,
          deleted: deleted.length,
        });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const cardBase =
    "flex items-center gap-4 p-5 rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm shadow";
  const numberCls = "text-3xl font-bold";
  const labelCls = "text-xs uppercase tracking-wide text-white/60";

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-white/60 text-sm mt-1">
            High level overview of medicine lifecycle status
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={cardBase}>
          <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <Package className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className={numberCls}>{stats.total}</div>
            <div className={labelCls}>Active Medicines</div>
          </div>
        </div>
        <div className={cardBase}>
          <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <Clock className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className={numberCls}>{stats.nearExpiry}</div>
            <div className={labelCls}>Near Expiry (90d)</div>
          </div>
        </div>
        <div className={cardBase}>
          <div className="p-3 rounded-lg bg-rose-600/20 border border-rose-600/30">
            <Skull className="w-6 h-6 text-rose-300" />
          </div>
          <div>
            <div className={numberCls}>{stats.expired}</div>
            <div className={labelCls}>Expired</div>
          </div>
        </div>
        <div className={cardBase}>
          <div className="p-3 rounded-lg bg-slate-500/20 border border-slate-500/30">
            <Trash2 className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <div className={numberCls}>{stats.deleted}</div>
            <div className={labelCls}>In Trash</div>
          </div>
        </div>
      </div>
      <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-3">Next Steps</h2>
        <ul className="list-disc pl-5 text-sm text-white/70 space-y-1">
          <li>Review near expiry medicines and plan clearance or return.</li>
          <li>Remove or quarantine expired medicines immediately.</li>
          <li>Keep trash clean by purging obsolete batches.</li>
        </ul>
      </div>
      {/* Simple bar chart */}
      <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4">Lifecycle Distribution</h2>
        <Chart stats={stats} />
      </div>
    </div>
  );
};

const Chart = ({ stats }) => {
  const data = [
    { label: "Active", value: stats.total, color: "#34d399" },
    { label: "Near Expiry", value: stats.nearExpiry, color: "#fbbf24" },
    { label: "Expired", value: stats.expired, color: "#fb7185" },
    { label: "Trash", value: stats.deleted, color: "#94a3b8" },
  ];
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-4 h-48">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-2 flex-1">
          <div
            className="w-full rounded-t shadow-inner flex items-end justify-center text-[10px] font-semibold"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: `${d.color}33`,
              border: `1px solid ${d.color}55`,
              color: d.color,
            }}
            title={`${d.label}: ${d.value}`}
          >
            {d.value}
          </div>
          <div className="text-[11px] tracking-wide text-white/70 text-center">
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
