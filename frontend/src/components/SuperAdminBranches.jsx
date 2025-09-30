import { useEffect, useState, useCallback } from "react";
import { getApiBase } from "../api/base";
import {
  Building2,
  AlertTriangle,
  Package,
  RefreshCcw,
  X,
  Activity,
  ClipboardList,
} from "lucide-react";

const API = getApiBase() + "/backend";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n || 0);

export default function SuperAdminBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // branch detail object
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/superadmin/branches`, {
        credentials: "include",
      });
      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        throw new Error(`Non-JSON (${res.status}) ${txt.slice(0, 120)}`);
      }
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      setBranches(json.branches);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = async (id) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelected(null);
    try {
      const res = await fetch(`${API}/superadmin/branches/${id}`, {
        credentials: "include",
      });
      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        throw new Error(`Non-JSON (${res.status}) ${txt.slice(0, 120)}`);
      }
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      setSelected(json.detail);
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Branches Overview
          </h1>
          <p className="text-white/60 text-sm">
            Grid of branch performance & status. Click a card for detailed
            metrics.
          </p>
        </div>
        <button
          onClick={loadBranches}
          disabled={loading}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-flex items-center gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{" "}
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && (
        <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
          {error}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {branches.map((b) => (
          <BranchCard key={b.id} b={b} onClick={() => loadDetail(b.id)} />
        ))}
        {!loading && branches.length === 0 && (
          <div className="text-white/50 text-sm col-span-full">
            No branches found
          </div>
        )}
      </div>

      {/* Detail Drawer / Modal */}
      {(detailLoading || selected || detailError) && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setSelected(null);
              setDetailError(null);
            }}
          />
          <div className="relative ml-auto w-full max-w-2xl h-full bg-[var(--bg-start)] border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Branch Detail</h2>
              <button
                onClick={() => {
                  setSelected(null);
                  setDetailError(null);
                }}
                className="p-2 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {detailLoading && (
                <div className="text-white/60 text-sm">Loading detail...</div>
              )}
              {detailError && (
                <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
                  {detailError}
                </div>
              )}
              {selected && <BranchDetail detail={selected} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchCard({ b, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-4 shadow hover:shadow-xl hover:-translate-y-0.5 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 shrink-0">
          <Building2 className="w-6 h-6 text-indigo-300" />
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs font-semibold uppercase text-white/50">
            Units
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {fmt(b.totalUnits)}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-lg font-semibold leading-tight truncate">
          {b.name}
        </div>
        <div className="text-[11px] text-white/50 truncate">
          {b.address || "—"}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] pt-2">
          <Badge label="Items" value={b.itemCount} color="slate" />
          <Badge label="Expired" value={b.expired} color="rose" />
          <Badge label="Near" value={b.nearExpiry} color="amber" />
          <Badge label="Pending" value={b.pendingRequests} color="indigo" />
        </div>
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle at 85% 15%, #6366f133, transparent 70%)",
        }}
      />
    </button>
  );
}

function Badge({ label, value, color }) {
  const colorMap = {
    slate: "bg-slate-500/15 border-slate-500/30 text-slate-200",
    rose: "bg-rose-500/15 border-rose-500/30 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    indigo: "bg-indigo-500/15 border-indigo-500/30 text-indigo-200",
  };
  return (
    <div
      className={`px-2 py-1 rounded-lg border text-center font-semibold ${
        colorMap[color] || colorMap.slate
      }`}
    >
      {" "}
      {value}{" "}
      <span className="block text-[8px] font-normal tracking-wide uppercase text-white/50">
        {label}
      </span>
    </div>
  );
}

function BranchDetail({ detail }) {
  const { branch, inventory, requests, recentTransactions } = detail;
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-300" /> {branch.name}
        </h3>
        <p className="text-white/50 text-xs mt-1">{branch.address || "—"}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Units" value={inventory.totalUnits} />
        <Stat label="Items" value={inventory.itemCount} />
        <Stat label="Expired" value={inventory.expired} />
        <Stat label="Near Expiry" value={inventory.nearExpiry} />
      </div>
      <div className="bg-white/10 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" /> Top Items
        </h4>
        {inventory.topItems.length === 0 && (
          <div className="text-white/50 text-xs">No items</div>
        )}
        <ul className="space-y-1 max-h-64 overflow-auto pr-1 text-xs">
          {inventory.topItems.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-2 p-2 rounded bg-white/5"
            >
              <span className="font-medium truncate flex-1">{it.medicine}</span>
              <span className="text-white/50">{it.quantity}</span>
              {it.expiryDate && (
                <span className="text-white/40 text-[10px]">
                  {new Date(it.expiryDate).toLocaleDateString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white/10 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Recent Requests
        </h4>
        {requests.recent.length === 0 && (
          <div className="text-white/50 text-xs">None</div>
        )}
        <ul className="space-y-1 max-h-56 overflow-auto pr-1 text-xs">
          {requests.recent.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 p-2 rounded bg-white/5"
            >
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider font-semibold">
                {r.status}
              </span>
              <span className="font-medium truncate flex-1">{r.medicine}</span>
              <span className="text-white/50">{r.qty}</span>
              <span className="text-white/40 text-[10px]">
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white/10 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Recent Transactions
        </h4>
        {recentTransactions.length === 0 && (
          <div className="text-white/50 text-xs">None</div>
        )}
        <ul className="space-y-1 max-h-56 overflow-auto pr-1 text-xs">
          {recentTransactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 p-2 rounded bg-white/5"
            >
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider font-semibold">
                {t.type}
              </span>
              <span className="font-medium truncate flex-1">
                {t.medicine || "Unknown"}
              </span>
              <span className="text-white/50">{t.qty}</span>
              <span className="text-white/40 text-[10px]">
                {new Date(t.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
      <div className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">
        {label}
      </div>
      <div className="text-xl font-bold text-white/80">{fmt(value)}</div>
    </div>
  );
}
