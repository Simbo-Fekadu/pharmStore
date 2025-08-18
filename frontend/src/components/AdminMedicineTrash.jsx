import { useEffect, useState } from "react";
import { RotateCcw, Flame, FileX2 } from "lucide-react";

const API = "http://localhost:3000/backend";

const AdminMedicineTrash = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/medicine?includeDeleted=true`);
      const data = await res.json();
      if (res.ok && data.success) {
        setList((data.medicines || []).filter((m) => m.isDeleted));
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Medicine Trash</h1>
      </div>
      <div className="bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur overflow-x-auto">
        <h2 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
          Deleted Medicines
        </h2>
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-white/60 flex items-center gap-2">
            <FileX2 className="w-4 h-4" /> Empty Trash
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
              {list.map((m) => (
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
                  <td className="py-1.5 pr-3 text-white/70">{m.batchNumber}</td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {m.deletedAt ? new Date(m.deletedAt).toLocaleString() : "-"}
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
            className={`mt-4 text-sm ${
              isError ? "text-red-300" : "text-green-300"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMedicineTrash;
