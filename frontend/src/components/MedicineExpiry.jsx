import { useEffect, useState } from "react";
import { authFetch } from "../api/authFetch";
import { Clock, Skull } from "lucide-react";
import { API_BASE } from "../api/base";

const daysThreshold = 90;

const MedicineExpiry = ({ type }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const isExpired = type === "expired";

  const load = async () => {
    setLoading(true);
    try {
      const ep = isExpired ? `${API_BASE}/medicine/expired` : `${API_BASE}/medicine/near-expiry?days=${daysThreshold}`;
      const res = await authFetch(ep);
      const data = await res.json();
      if (res.ok && data.success) {
        setList(data.medicines || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [type]);

  const Icon = isExpired ? Skull : Clock;
  const title = isExpired ? "Expired Medicines" : "Near Expiry Medicines";
  const subtitle = isExpired ? "Expired" : `Expiring within ${daysThreshold} days`;
  const emptyMsg = isExpired ? "No expired medicines" : "No medicines near expiry";
  const dateLabel = isExpired ? "Expired On" : "Expiry";
  const daysLabel = isExpired ? "Days Ago" : "Days Left";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon className="w-6 h-6" /> {title}
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
          {subtitle}
        </h2>
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-white/60">{emptyMsg}</div>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-white/70 bg-white/5">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Batch</th>
                <th className="py-2 pr-3">{dateLabel}</th>
                <th className="py-2 pr-3">{daysLabel}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const exp = new Date(m.expiryDate).getTime();
                const diff = isExpired
                  ? Math.ceil((Date.now() - exp) / 86400000)
                  : Math.max(0, Math.ceil((exp - Date.now()) / 86400000));
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
                    <td className="py-1.5 pr-3 text-white/70">{diff}</td>
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

export default MedicineExpiry;
