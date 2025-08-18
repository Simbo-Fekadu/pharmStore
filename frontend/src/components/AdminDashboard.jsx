import { useEffect, useState, useCallback } from "react";
import { Package, Clock, Skull, Trash2, BarChart3 } from "lucide-react";
const API = "http://localhost:3000/backend";

// Dashboard with summary metrics
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    nearExpiry: 0,
    expired: 0,
    deleted: 0,
  });
  // timeline reserved for future sales/prescription trend integration (removed for now)
  const [range, setRange] = useState("30"); // days window (kept for future trend integration)
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/medicine?includeDeleted=true`);
      const data = await res.json();
      if (res.ok && data.success) {
        const meds = data.medicines || [];
        setMedicines(meds);
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
        // Placeholder synthetic timeline (flat) until sales/prescriptions exist
        // range retained for future trend calculations
        // synthetic timeline omitted until sales data model exists
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // metric card helper constants removed after refactor
  const baseTotal = stats.total + stats.deleted;
  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-white/60 text-sm mt-1">
            Real-time overview & trends of medicine status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-2 rounded bg-white/10 border border-white/10 text-sm"
          >
            <option value="7">Last 7d</option>
            <option value="14">Last 14d</option>
            <option value="30">Last 30d</option>
            <option value="60">Last 60d</option>
          </select>
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <MetricCard
          icon={<Package className="w-6 h-6" />}
          iconColor="emerald"
          value={stats.total}
          label="Active Medicines"
          percent={pct(stats.total, baseTotal)}
          subtitle={`${pct(stats.expired, stats.total)}% expired, ${pct(
            stats.nearExpiry,
            stats.total
          )}% near`}
        />
        <MetricCard
          icon={<Clock className="w-6 h-6" />}
          iconColor="amber"
          value={stats.nearExpiry}
          label="Near Expiry (90d)"
          percent={pct(stats.nearExpiry, stats.total)}
          subtitle={`${pct(stats.nearExpiry, stats.total)}% of active`}
        />
        <MetricCard
          icon={<Skull className="w-6 h-6" />}
          iconColor="rose"
          value={stats.expired}
          label="Expired"
          percent={pct(stats.expired, stats.total)}
          subtitle={`${pct(stats.expired, stats.total)}% of active`}
        />
        <MetricCard
          icon={<Trash2 className="w-6 h-6" />}
          iconColor="slate"
          value={stats.deleted}
          label="In Trash"
          percent={pct(stats.deleted, baseTotal)}
          subtitle={`${pct(stats.deleted, baseTotal)}% of total incl. trash`}
        />
      </div>
      {/* Charts (side by side on desktop) */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Category Distribution (A–Z)
            </h2>
            <span className="text-[11px] text-white/60">
              Alphabetical, sum of quantities
            </span>
          </div>
          <CategoryBars medicines={medicines} />
        </div>
        <div className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur-sm flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Category Breakdown</h2>
          <CategoryDonut medicines={medicines} />
        </div>
      </div>
    </div>
  );
};

const LineChart = ({ data }) => {
  if (!data || data.length === 0)
    return (
      <div className="text-white/60 text-sm py-10 text-center">No data</div>
    );
  const pad = 24;
  const h = 220;
  const w = 760;
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.active, d.near, d.expired))
  );
  const toX = (i) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
  const toY = (v) => h - pad - (v / max) * (h - pad * 2);
  const buildPath = (key) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d[key])}`)
      .join(" ");
  const pathActive = buildPath("active");
  const pathNear = buildPath("near");
  const pathExpired = buildPath("expired");
  const area = (key, color) => {
    const path =
      data
        .map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d[key])}`)
        .join(" ") +
      ` L${toX(data.length - 1)},${h - pad} L${toX(0)},${h - pad} Z`;
    return <path d={path} fill={color} opacity="0.08" />;
  };
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="max-w-full">
        {/* grid lines */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad + ((h - pad * 2) / 4) * i;
          return (
            <line
              key={i}
              x1={pad}
              x2={w - pad}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}
        {area("active", "#34d399")}
        {area("near", "#fbbf24")}
        {area("expired", "#fb7185")}
        <path d={pathActive} fill="none" stroke="#34d399" strokeWidth={2} />
        <path d={pathNear} fill="none" stroke="#fbbf24" strokeWidth={2} />
        <path d={pathExpired} fill="none" stroke="#fb7185" strokeWidth={2} />
        {/* points */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.active)} r={3} fill="#34d399" />
            <circle cx={toX(i)} cy={toY(d.near)} r={3} fill="#fbbf24" />
            <circle cx={toX(i)} cy={toY(d.expired)} r={3} fill="#fb7185" />
          </g>
        ))}
        {/* x axis labels (sparse) */}
        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 ? (
            <text
              key={"t" + i}
              x={toX(i)}
              y={h - 6}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(255,255,255,0.6)"
            >
              {new Date(d.t).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </text>
          ) : null
        )}
        {/* y axis labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const val = Math.round((max / 4) * i);
          return (
            <text
              key={"y" + i}
              x={8}
              y={pad + ((h - pad * 2) / 4) * (4 - i) + 4}
              fontSize={10}
              fill="rgba(255,255,255,0.5)"
            >
              {val}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const Legend = ({ color, label }) => (
  <div className="flex items-center gap-1">
    <span className="w-3 h-3 rounded" style={{ background: color }} />
    <span className="text-white/70 text-xs">{label}</span>
  </div>
);

// Reusable metric card with radial percent
const MetricCard = ({ icon, iconColor, value, label, percent, subtitle }) => {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent || 0));
  const dash = (clamped / 100) * circ;
  const colorMap = {
    emerald: {
      base: "#34d399",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
    },
    amber: {
      base: "#fbbf24",
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
    },
    rose: {
      base: "#fb7185",
      bg: "bg-rose-500/15",
      border: "border-rose-500/30",
    },
    slate: {
      base: "#94a3b8",
      bg: "bg-slate-500/15",
      border: "border-slate-500/30",
    },
  };
  const col = colorMap[iconColor] || colorMap.slate;
  return (
    <div
      className={
        "" +
        "relative overflow-hidden group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-4 shadow transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={`p-3 rounded-xl ${col.bg} ${col.border} border shrink-0`}
          style={{ boxShadow: `0 4px 12px -2px ${col.base}55` }}
        >
          <div className="text-white/90" style={{ color: col.base }}>
            {icon}
          </div>
        </div>
        <div className="relative w-16 h-16">
          <svg width={64} height={64} className="rotate-[-90deg]">
            <circle
              cx={32}
              cy={32}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={6}
              fill="none"
            />
            <circle
              cx={32}
              cy={32}
              r={radius}
              stroke={col.base}
              strokeWidth={6}
              fill="none"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white/80">
            {clamped}%
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-bold tracking-tight leading-none">
          {value}
        </div>
        <div className="text-[12px] uppercase tracking-wide font-semibold text-white/60">
          {label}
        </div>
        {subtitle && (
          <div className="text-[11px] text-white/50 truncate">{subtitle}</div>
        )}
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 85% 15%, ${col.base}33, transparent 70%)`,
        }}
      />
    </div>
  );
};

// Category aggregated horizontal bars (alphabetical)
const CategoryBars = ({ medicines }) => {
  const counts = {};
  (medicines || [])
    .filter((m) => !m.isDeleted)
    .forEach((m) => {
      const cat = m.category?.trim() || "Other";
      counts[cat] = (counts[cat] || 0) + (m.quantity || 0);
    });
  const entries = Object.entries(counts).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  if (entries.length === 0)
    return <div className="text-white/60 text-sm py-6">No data</div>;
  const max = Math.max(1, ...entries.map((e) => e[1]));
  const grandTotal = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
      {entries.map(([cat, val]) => {
        const pctWidth = (val / max) * 100;
        const pctShare = Math.round((val / grandTotal) * 100);
        return (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-xs text-white/70">
              <span className="truncate pr-2 max-w-[60%]" title={cat}>
                {cat}
              </span>
              <span className="font-semibold text-white/80">
                {val}{" "}
                <span className="text-white/40 font-normal">({pctShare}%)</span>
              </span>
            </div>
            <div className="h-3 w-full bg-white/5 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--brand)] to-[var(--accent)] relative"
                style={{ width: pctWidth + "%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Category donut (simple ring composed of arcs)
const CategoryDonut = ({ medicines }) => {
  const counts = {};
  (medicines || [])
    .filter((m) => !m.isDeleted)
    .forEach((m) => {
      const c = m.category?.trim() || "Other";
      counts[c] = (counts[c] || 0) + (m.quantity || 0);
    });
  const entries = Object.entries(counts).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  if (entries.length === 0)
    return <div className="text-white/60 text-sm py-6">No data</div>;
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const radius = 70;
  const stroke = 22;
  const cx = 90;
  const cy = 90;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const palette = [
    "#1d5fa7",
    "#0597d9",
    "#34d399",
    "#fbbf24",
    "#fb7185",
    "#6366f1",
    "#a855f7",
    "#ec4899",
    "#10b981",
  ];
  return (
    <div className="flex items-center gap-6">
      <svg width={180} height={180} className="shrink-0">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {entries.map(([cat, val], i) => {
          const frac = val / total;
          const len = frac * circ;
          const dash = `${len} ${circ - len}`;
          const col = palette[i % palette.length];
          const circleEl = (
            <circle
              key={cat}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={col}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return circleEl;
        })}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          fontSize={14}
          className="font-semibold"
        >
          {total}
        </text>
      </svg>
      <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
        {entries.slice(0, 8).map(([cat, val], i) => {
          const col = palette[i % palette.length];
          return (
            <div key={cat} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: col }}
              />
              <span className="truncate" title={cat}>
                {cat}
              </span>
              <span className="ml-auto text-white/60 font-medium">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
