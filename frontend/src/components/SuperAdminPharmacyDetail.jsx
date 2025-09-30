import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiBase } from '../api/base';
import { Building2, Users, Store, Package, ArrowLeft } from 'lucide-react';

const API = getApiBase() + '/backend';

export default function SuperAdminPharmacyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${API}/superadmin/pharmacies/${id}`, { credentials: 'include' });
        const txt = await res.text();
        let json; try { json = JSON.parse(txt);} catch { throw new Error('Non-JSON response'); }
        if(!res.ok || !json.success) throw new Error(json.message || 'Load failed');
        setData(json);
      } catch(e){ setError(e.message);} finally { setLoading(false); }
    };
    load();
  }, [id]);

  const summary = data?.summary || {}; const pharmacy = data?.pharmacy;
  const roleCounts = summary.users || {}; const reqCounts = summary.requests || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate(-1)} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4"/> Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-300"/>{pharmacy?.name || '...'}</h1>
        {pharmacy && <span className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[11px] font-semibold uppercase">{pharmacy.status}</span>}
      </div>
      {error && <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">{error}</div>}
      {loading && <div className="text-white/60 text-sm">Loading...</div>}
      {pharmacy && !loading && (
        <>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <TabButton active={activeTab==='overview'} onClick={()=>setActiveTab('overview')}>Overview</TabButton>
            <TabButton active={activeTab==='users'} onClick={()=>setActiveTab('users')}>Users</TabButton>
            <TabButton active={activeTab==='branches'} onClick={()=>setActiveTab('branches')}>Branches</TabButton>
            <TabButton active={activeTab==='medicines'} onClick={()=>setActiveTab('medicines')}>Medicines</TabButton>
            <TabButton active={activeTab==='requests'} onClick={()=>setActiveTab('requests')}>Requests</TabButton>
          </div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
              <BigStat label="Admins" value={roleCounts.admin || 0} icon={<Users className='w-5 h-5'/>} />
              <BigStat label="Employees" value={(roleCounts.employee||0)+(roleCounts.inventory_manager||0)} icon={<Users className='w-5 h-5'/>} />
              <BigStat label="Branches" value={summary.branches || 0} icon={<Store className='w-5 h-5'/>} />
              <BigStat label="Medicines" value={summary.medicines?.total || 0} icon={<Package className='w-5 h-5'/>} />
              <BigStat label="Expired" value={summary.medicines?.expired || 0} icon={<Package className='w-5 h-5'/>} />
              <BigStat label="Pending Requests" value={reqCounts.Pending || 0} icon={<Package className='w-5 h-5'/>} />
            </div>
          )}
          {activeTab !== 'overview' && (
            <div className="mt-6 p-6 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm">
              <p>Selecting <code>{activeTab}</code> will later drill into scoped data (not yet implemented).</p>
              <p className="mt-2 opacity-70">We can fetch and display lists filtered by pharmacy id here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({active, onClick, children}){
  return <button onClick={onClick} className={`px-3 py-1.5 rounded border text-xs font-medium tracking-wide transition ${active? 'bg-[var(--brand)] text-white border-[var(--brand)]':'bg-white/10 border-white/10 hover:bg-white/20'}`}>{children}</button>;
}

function BigStat({label, value, icon}){
  return (
    <div className="p-4 rounded-xl bg-white/10 border border-white/10 flex flex-col gap-3">
      <div className="flex items-center justify-between text-white/60 text-[11px] uppercase font-semibold tracking-wide">{label}<span className="text-white/30">{icon}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
