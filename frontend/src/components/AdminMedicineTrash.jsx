import { useEffect, useState } from "react";
import { RotateCcw, Flame, FileX2, Skull, Trash2 } from "lucide-react";

const API = "http://localhost:3000/backend";

const AdminMedicineTrash = () => {
  const [deletedList, setDeletedList] = useState([]);
  const [expiredList, setExpiredList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [tab, setTab] = useState("expired"); // expired | deleted

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/medicine?includeDeleted=true`);
      const data = await res.json();
      if (res.ok && data.success) {
        const all = data.medicines || [];
        const now = Date.now();
        const expired = all.filter(
          (m) => !m.isDeleted && new Date(m.expiryDate).getTime() < now
        );
        const deleted = all.filter((m) => m.isDeleted);
        setExpiredList(expired);
        setDeletedList(deleted);
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

  const restore = async (id) => {
    try {
      const res = await fetch(`${API}/medicine/${id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Restored");
        load();
      } else {
        setMessage(data.message || "Restore failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    }
  };

  const purge = async (id) => {
    if (!confirm("Permanently delete?")) return;
    try {
      const res = await fetch(`${API}/medicine/${id}/purge`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Permanently removed");
        load();
      } else {
        setMessage(data.message || "Purge failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="w-6 h-6" /> Trash
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={load}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="bg-white/10 rounded-xl border border-white/10 backdrop-blur overflow-hidden">
        <div className="flex items-center border-b border-white/10">
          <button
            className={`px-5 py-3 text-sm font-medium transition ${
              tab === "expired"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white"
            }`}
            onClick={() => setTab("expired")}
          >
            Expired ({expiredList.length})
          </button>
          <button
            className={`px-5 py-3 text-sm font-medium transition ${
              tab === "deleted"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white"
            }`}
            onClick={() => setTab("deleted")}
          >
            Deleted ({deletedList.length})
          </button>
        </div>
        <div className="p-6 overflow-x-auto">
          {loading ? (
            <div className="text-sm text-white/70">Loading...</div>
          ) : tab === "expired" ? (
            expiredList.length === 0 ? (
              <div className="text-sm text-white/60 flex items-center gap-2">
                <Skull className="w-4 h-4" /> No expired medicines
              </div>
            ) : (
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-left text-white/70 bg-white/5">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Brand</th>
                    <th className="py-2 pr-3">Batch</th>
                    <th className="py-2 pr-3">Expired On</th>
                    <th className="py-2 pr-3">Days Ago</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredList.map((m) => {
                    const exp = new Date(m.expiryDate).getTime();
                    const daysAgo = Math.ceil((Date.now() - exp) / 86400000);
                    return (
                      <tr
                        key={m._id}
                        className="border-t border-white/5 hover:bg-white/5"
                      >
                        <td className="py-1.5 pr-3 font-medium text-white/90">
                          {m.medicineName}
                        </td>
                        <td className="py-1.5 pr-3 text-white/70">
                          {m.brand || "-"}
                        </td>
                        <td className="py-1.5 pr-3 text-white/70">
                          {m.batchNumber}
                        </td>
                        <td className="py-1.5 pr-3 text-white/70">
                          {new Date(m.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="py-1.5 pr-3 text-white/70">{daysAgo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : deletedList.length === 0 ? (
            <div className="text-sm text-white/60 flex items-center gap-2">
              <FileX2 className="w-4 h-4" /> Empty Deleted
            </div>
          ) : (
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-white/70 bg-white/5">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Brand</th>
                  <th className="py-2 pr-3">Batch</th>
                  <th className="py-2 pr-3">Deleted At</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedList.map((m) => (
                  <tr
                    key={m._id}
                    className="border-t border-white/5 hover:bg-white/5"
                  >
                    <td className="py-1.5 pr-3 font-medium text-white/90">
                      {m.medicineName}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {m.brand || "-"}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {m.batchNumber}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {m.deletedAt
                        ? new Date(m.deletedAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => restore(m._id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded bg-emerald-600/70 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => purge(m._id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded bg-red-800/70 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400/60"
                          title="Permanently Delete"
                        >
                          <Flame className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {message && (
            <div
              className={`mt-6 text-sm ${
                isError ? "text-red-300" : "text-green-300"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMedicineTrash;
