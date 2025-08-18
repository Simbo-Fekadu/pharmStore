import { useEffect, useState } from "react";
const API = "http://localhost:3000/backend";

const AdminBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/location/branch`);
      const data = await res.json();
      if (Array.isArray(data)) setBranches(data);
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Branches</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur overflow-x-auto">
        <h2 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
          All Branches
        </h2>
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : branches.length === 0 ? (
          <div className="text-sm text-white/60">No branches</div>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-white/70 bg-white/5">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Address</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b._id}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="py-1.5 pr-3 font-medium text-white/90">
                    {b.name}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {b.address || "-"}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-white/60">
        Default branches are seeded automatically (Ayat, Tafo, Kazanchis).
      </p>
    </div>
  );
};

export default AdminBranches;
