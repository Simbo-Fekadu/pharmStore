import { useEffect, useState, useCallback } from "react";
import { getApiBase } from "../api/base";
import { Building2, RefreshCcw, X, Users, Activity, Factory } from "lucide-react";

const API = getApiBase() + "/backend";

export default function SuperAdminPharmacies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [detail, setDetail] = useState(null); // summary data
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/superadmin/pharmacies`, { credentials: 'include' });
      const txt = await res.text();
      let json; try { json = JSON.parse(txt); } catch { throw new Error(`Non-JSON (${res.status}) ${txt.slice(0,120)}`); }
      if(!res.ok || !json.success) throw new Error(json.message || 'Failed');
      setItems(json.pharmacies || []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const openDetail = async (id) => {
    setDetailError(null); setDetailLoading(true); setDetail(null);
    try {
      const res = await fetch(`${API}/superadmin/pharmacies/${id}`, { credentials:'include' });
      const txt = await res.text();
      let json; try { json = JSON.parse(txt); } catch { throw new Error(`Non-JSON (${res.status}) ${txt.slice(0,120)}`); }
      if(!res.ok || !json.success) throw new Error(json.message || 'Failed');
      setDetail(json);
    } catch(e) { setDetailError(e.message); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => { fetchList(); }, [fetchList]);

  const onCreate = async (evt) => {
    evt.preventDefault();
    const form = evt.target;
    const name = form.name.value.trim();
    const code = form.code.value.trim();
    const address = form.address.value.trim();
    const primaryAdminEmail = form.primaryAdminEmail.value.trim();
    if(!name || !code) { setCreateError('Name & Code required'); return; }
    setCreateError(null);
    try {
      const res = await fetch(`${API}/superadmin/pharmacies`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ name, code, address, primaryAdminEmail })
      });
      const txt = await res.text();
      let json; try { json = JSON.parse(txt); } catch { throw new Error(`Non-JSON (${res.status}) ${txt.slice(0,120)}`); }
      if(!res.ok || !json.success) throw new Error(json.message || 'Create failed');
      setCreating(false); form.reset();
      fetchList();
    } catch(e) { setCreateError(e.message); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacies</h1>
          <p className="text-white/60 text-sm">Multi-tenant list. Click to view summary.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchList} disabled={loading} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-flex items-center gap-2">
            <RefreshCcw className={`w-4 h-4 ${loading? 'animate-spin':''}`} /> {loading? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={()=>{setCreating(true); setCreateError(null);}} className="px-3 py-2 rounded bg-[var(--brand)] text-white text-sm font-medium">New Pharmacy</button>
        </div>
      </div>
      {error && <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">{error}</div>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map(p => <PharmacyCard key={p._id || p.id} p={p} onClick={()=>openDetail(p._id || p.id)} />)}
        {!loading && items.length===0 && <div className="col-span-full text-white/50 text-sm">No pharmacies yet.</div>}
      </div>

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setCreating(false)} />
          <div className="relative w-full max-w-md m-auto rounded-xl border border-white/10 bg-[var(--bg-start)] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Pharmacy</h2>
              <button onClick={()=>setCreating(false)} className="p-2 rounded hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="grid gap-3">
                <Field label="Name" name="name" placeholder="Zelalem Pharmacy" />
                <Field label="Code" name="code" placeholder="ZELALEM" />
                <Field label="Address" name="address" placeholder="Main Road" />
                <Field label="Primary Admin Email (optional)" name="primaryAdminEmail" placeholder="admin@example.com" />
              </div>
              {createError && <div className="text-rose-400 text-xs">{createError}</div>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={()=>setCreating(false)} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm">Cancel</button>
                <button type="submit" className="px-3 py-2 rounded bg-[var(--brand)] text-white text-sm font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {(detailLoading || detail || detailError) && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>{ setDetail(null); setDetailError(null); }} />
          <div className="relative ml-auto w-full max-w-xl h-full bg-[var(--bg-start)] border-l border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pharmacy Summary</h2>
              <button onClick={()=>{ setDetail(null); setDetailError(null); }} className="p-2 rounded hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {detailLoading && <div className="text-white/60 text-sm">Loading summary...</div>}
              {detailError && <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">{detailError}</div>}
              {detail && <PharmacySummary data={detail} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PharmacyCard({ p, onClick }) {
  return (
    <button onClick={onClick} className="group relative text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-4 shadow hover:shadow-xl hover:-translate-y-0.5 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 shrink-0">
          <Building2 className="w-6 h-6 text-indigo-300" />
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs font-semibold uppercase text-white/50">Code</div>
          <div className="text-2xl font-bold tracking-tight">{p.code}</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-lg font-semibold leading-tight truncate">{p.name}</div>
        <div className="text-[11px] text-white/50 truncate">{p.address || '—'}</div>
        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 border border-white/10 uppercase tracking-wide">
          {p.status || 'ACTIVE'}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{background:'radial-gradient(circle at 85% 15%, #6366f133, transparent 70%)'}} />
    </button>
  );
}

function Field({ label, name, placeholder }) {
  return (
    <label className="text-xs font-medium space-y-1">
      <span className="block text-white/60 uppercase tracking-wide">{label}</span>
      <input name={name} placeholder={placeholder} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-sm" />
    </label>
  );
}

function PharmacySummary({ data }) {
  const { pharmacy, summary } = data;
  if(!pharmacy) return null;
  const roleCounts = summary?.users || {};
  const reqCounts = summary?.requests || {};
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-300" /> {pharmacy.name}</h3>
        <p className="text-white/50 text-xs mt-1">{pharmacy.address || '—'} • Code: {pharmacy.code}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Admins" value={roleCounts.admin || 0} />
        <Stat label="Employees" value={(roleCounts.employee||0)+(roleCounts.inventory_manager||0)} />
        <Stat label="Branches" value={summary?.branches || 0} />
        <Stat label="Medicines" value={summary?.medicines?.total || 0} />
        <Stat label="Expired" value={summary?.medicines?.expired || 0} />
        <Stat label="Requests Pending" value={reqCounts.Pending || 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
      <div className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">{label}</div>
      <div className="text-xl font-bold text-white/80">{value}</div>
    </div>
  );
}
