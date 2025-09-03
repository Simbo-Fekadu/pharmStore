import { useEffect, useState } from "react";

const API = "http://localhost:3000/backend";

const AdminTransactions = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/inventory/ledger?limit=500`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) setEntries(data.entries || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const name = e.medicineId?.medicineName || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by medicine name"
            className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm text-white placeholder-white/60"
          />
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white/10 border border-white/20 text-sm"
          >
            Reload
          </button>
        </div>
      </div>
      <div className="bg-white/10 rounded-xl border border-white/10 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-white/70 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-white/70 bg-white/5">
                <th className="py-2 pr-3 pl-5">Date</th>
                <th className="py-2 pr-3">Medicine</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const dt = new Date(h.createdAt);
                const datePart = dt.toLocaleDateString();
                const timePart = dt.toLocaleTimeString();
                return (
                  <tr key={h._id} className="border-t border-white/5 align-top">
                    <td className="py-1.5 pr-3 pl-5 whitespace-pre-line leading-tight">
                      {datePart}\n{timePart}
                    </td>
                    <td className="py-1.5 pr-3">
                      {h.medicineName || h.medicineId?.medicineName || "-"}
                    </td>
                    <td className="py-1.5 pr-3">{h.transactionType}</td>
                    <td className="py-1.5 pr-3">{h.quantity}</td>
                    <td className="py-1.5 pr-3">
                      {h.locationName || h.locationId?.name || "-"}
                    </td>
                    <td className="py-1.5 pr-3 leading-tight text-xs md:text-[13px]">
                      {h.sourceDocType}
                      {h.sourceDocId ? `: ${h.sourceDocId}` : ""}{" "}
                      {h.createdByUserId
                        ? `• ${
                            h.createdByUserId.role === "admin"
                              ? "admin"
                              : h.createdByUserId.username || "user"
                          }`
                        : ""}
                    </td>
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

export default AdminTransactions;
