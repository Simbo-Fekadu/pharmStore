import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

const API = "http://localhost:3000/backend";

const Fulfillment = () => {
  const [requests, setRequests] = useState([]);
  const [stores, setStores] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API}/inventory/request`),
        fetch(`${API}/location/store`),
      ]);
      const rData = await rRes.json();
      const sData = await sRes.json();
      if (rData.success) setRequests(rData.requests || []);
      setStores(Array.isArray(sData) ? sData : []);
    } catch {
      setMessage("Load failed");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (id, action, storeId, note) => {
    setMessage("");
    try {
      const res = await fetch(`${API}/inventory/request/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, note }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(action === "approve" ? "Fulfilled" : "Rejected");
        load();
      } else setMessage(data.message || "Action failed");
    } catch {
      setMessage("Network error");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#183D3D] to-[#5C8374]/40 text-white">
      <Sidebar />
      <main className="flex-1 p-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Fulfillment</h1>
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Reload
          </button>
        </div>
        {message && <div className="text-sm text-yellow-200">{message}</div>}
        {loading ? (
          <div className="text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto bg-white/10 rounded-xl border border-white/10 backdrop-blur">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-white/70 bg-white/5">
                  <th className="py-2 px-3">Medicine</th>
                  <th className="py-2 px-3">Branch</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Actions</th>
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
                    <td className="py-1.5 px-3">{r.status}</td>
                    <td className="py-1.5 px-3 space-x-2">
                      {r.status === "Pending" && (
                        <>
                          <select
                            onChange={(e) =>
                              act(r._id, "approve", e.target.value)
                            }
                            defaultValue=""
                            className="bg-white/80 text-gray-800 rounded px-2 py-1 text-xs"
                          >
                            <option value="" disabled>
                              Approve via store...
                            </option>
                            {stores.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => act(r._id, "reject")}
                            className="px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded text-xs"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Fulfillment;
