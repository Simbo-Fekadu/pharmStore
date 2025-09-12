import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

const daysThreshold = 90; // medicines expiring within next 90 days

const AdminNearExpiry = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/medicine`);
      const data = await res.json();
      if (res.ok && data.success) {
        const now = Date.now();
        const cutoff = now + daysThreshold * 86400000;
        const filtered = (data.medicines || []).filter(
          (m) =>
            !m.isDeleted &&
            new Date(m.expiryDate).getTime() <= cutoff &&
            new Date(m.expiryDate).getTime() >= now
        );
        setList(filtered);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" /> Near Expiry Medicines
        </h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur overflow-x-auto">
        <h2 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
          Expiring within {daysThreshold} days
        </h2>
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-white/60">No medicines near expiry</div>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-white/70 bg-white/5">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Batch</th>
                <th className="py-2 pr-3">Expiry</th>
                <th className="py-2 pr-3">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const exp = new Date(m.expiryDate).getTime();
                const daysLeft = Math.max(
                  0,
                  Math.ceil((exp - Date.now()) / 86400000)
                );
                return (
                  <tr
                    key={m._id}
                    className="border-t border-white/5 hover:bg-white/5"
                  >
                    <td className="py-1.5 pr-3 font-medium text-white/90">
                      {m.medicineName}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {m.batchNumber}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {new Date(m.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">{daysLeft}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminNearExpiry;
