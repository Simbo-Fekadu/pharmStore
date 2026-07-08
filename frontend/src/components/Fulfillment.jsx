import { useEffect, useState } from "react";

import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
const API = API_BASE;

const Fulfillment = () => {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rRes = await authFetch(`${API}/inventory/request`);
      const rData = await rRes.json();
      if (rData.success) setRequests(rData.requests || []);
    } catch {
      setMessage("Load failed");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Actions removed for employee view; only passive status display.

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Fulfillment</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>
      {message && <div className="text-sm text-yellow-200">{message}</div>}
      {loading ? (
        <div className="text-sm">Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-white/70 bg-white/5">
                <th className="py-2 px-3">Medicine</th>
                <th className="py-2 px-3">Branch</th>
                <th className="py-2 px-3">Qty</th>
                <th className="py-2 px-3">Batch</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 px-3 text-white/60">
                    No requests
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r._id} className="border-t border-white/5">
                  <td className="py-1.5 px-3">
                    {r.medicine?.medicineName}
                    {r.medicine?.brand ? " - " + r.medicine.brand : ""}
                  </td>
                  <td className="py-1.5 px-3">{r.branch?.name}</td>
                  <td className="py-1.5 px-3">{r.quantity}</td>
                  <td className="py-1.5 px-3">{r.batchNumber || "-"}</td>
                  <td className="py-1.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                        r.status === "Pending"
                          ? "bg-amber-500/80 text-gray-900"
                          : r.status === "Shipped"
                          ? "bg-indigo-500/80 text-white"
                          : r.status === "Received"
                          ? "bg-emerald-500/80 text-white"
                          : r.status === "Rejected"
                          ? "bg-rose-500/80 text-white"
                          : r.status === "Reversed"
                          ? "bg-gray-500/80 text-white"
                          : "bg-gray-500/80 text-white"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Fulfillment;
