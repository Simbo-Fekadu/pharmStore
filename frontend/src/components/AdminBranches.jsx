import { useEffect, useState } from "react";
import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

const AdminBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // prefer new branch route; fallback to legacy if needed
      let res = await fetch(`${API}/branch`);
      if (!res.ok) {
        // fallback old endpoint
        res = await fetch(`${API}/location/branch`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.branches))
        setBranches(data.branches);
      else if (Array.isArray(data)) setBranches(data); // legacy shape
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (b) => {
    setEditingId(b._id);
    setForm({ name: b.name || "", address: b.address || "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = `${API}/branch${editingId ? "/" + editingId : ""}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(editingId ? "Branch updated" : "Branch created");
        setForm({ name: "", address: "" });
        setEditingId(null);
        load();
      } else {
        setMessage(data.message || "Failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const removeBranch = async (id) => {
    if (!confirm("Delete this branch?")) return;
    try {
      const res = await fetch(`${API}/branch/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setBranches((bs) => bs.filter((b) => b._id !== id));
      } else {
        alert(data.message || "Delete failed");
      }
    } catch {
      alert("Network error");
    }
  };

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
      <form
        onSubmit={submit}
        className="space-y-4 bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur"
      >
        <h2 className="font-semibold tracking-wide text-sm uppercase text-white/70">
          {editingId ? "Edit Branch" : "Add Branch"}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Branch Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
          />
          <input
            placeholder="Address (optional)"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
          />
        </div>
        <div className="flex gap-3">
          <button
            disabled={submitting}
            className="px-5 py-2.5 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting
              ? editingId
                ? "Updating..."
                : "Saving..."
              : editingId
              ? "Update Branch"
              : "Add Branch"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", address: "" });
              }}
              className="px-4 py-2.5 rounded bg-white/20 hover:bg-white/30 text-sm text-white"
            >
              Cancel
            </button>
          )}
        </div>
        {message && (
          <div
            className={`text-sm ${isError ? "text-red-300" : "text-green-300"}`}
          >
            {message}
          </div>
        )}
      </form>
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
                <th className="py-2 pr-3">Actions</th>
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
                  <td className="py-1.5 pr-3 text-white/70">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(b)}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeBranch(b._id)}
                        className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-xs"
                      >
                        Delete
                      </button>
                    </div>
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
