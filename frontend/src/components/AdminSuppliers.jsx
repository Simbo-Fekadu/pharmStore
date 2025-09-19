import { useEffect, useState } from "react";
import { Edit3, Save, X, Trash2 } from "lucide-react";
import { getApiBase } from "../api/base";
import useToast from "../hooks/useToast";
import useConfirm from "../hooks/useConfirm";
const API = getApiBase() + "/backend";

const empty = { supplierName: "", phoneNumber: "", address: "" };

const AdminSuppliers = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(empty);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/supplier`);
      const data = await res.json();
      if (res.ok && data.success) setList(data.suppliers || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch(`${API}/supplier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Supplier added");
        setForm(empty);
        load();
        toast.success("Supplier added");
      } else {
        setMessage(data.message || "Failed");
        setIsError(true);
        toast.error(data.message || "Failed to add supplier");
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setEditForm({
      supplierName: s.supplierName,
      phoneNumber: s.phoneNumber,
      address: s.address || "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(empty);
  };
  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API}/supplier/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setList((ls) =>
          ls.map((x) => (x._id === editingId ? data.supplier : x))
        );
        cancelEdit();
        toast.success("Supplier updated");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingEdit(false);
    }
  };
  const removeSupplier = async (id) => {
    const ok = await confirm({
      title: "Delete supplier?",
      message: "This will remove the supplier.",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/supplier/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setList((ls) => ls.filter((x) => x._id !== id));
        toast.success("Supplier deleted");
      } else toast.error(data.message || "Delete failed");
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur"
        >
          <h2 className="font-semibold tracking-wide text-sm uppercase text-white/70">
            Add Supplier
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              name="supplierName"
              value={form.supplierName}
              onChange={handleChange}
              required
              placeholder="Supplier Name"
              className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
            />
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              required
              placeholder="Phone Number"
              className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
            />
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Address"
              className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm col-span-full"
            />
          </div>
          <button
            disabled={submitting}
            className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded text-sm font-semibold text-white shadow disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Add Supplier"}
          </button>
          {message && (
            <div
              className={`text-sm ${
                isError ? "text-red-300" : "text-green-300"
              }`}
            >
              {message}
            </div>
          )}
        </form>
        <div className="bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur overflow-x-auto">
          <h2 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
            All Suppliers
          </h2>
          {loading ? (
            <div className="text-sm text-white/70">Loading...</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-white/60">No suppliers</div>
          ) : (
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left text-white/70 bg-white/5">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr
                    key={s._id}
                    className="border-t border-white/5 hover:bg-white/5"
                  >
                    <td className="py-1.5 pr-3 font-medium text-white/90">
                      {editingId === s._id ? (
                        <input
                          value={editForm.supplierName}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              supplierName: e.target.value,
                            }))
                          }
                          className="px-2 py-1 rounded bg-white/80 text-gray-800 w-32"
                        />
                      ) : (
                        s.supplierName
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {editingId === s._id ? (
                        <input
                          value={editForm.phoneNumber}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              phoneNumber: e.target.value,
                            }))
                          }
                          className="px-2 py-1 rounded bg-white/80 text-gray-800 w-32"
                        />
                      ) : (
                        s.phoneNumber
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {editingId === s._id ? (
                        <input
                          value={editForm.address}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              address: e.target.value,
                            }))
                          }
                          className="px-2 py-1 rounded bg-white/80 text-gray-800 w-40"
                        />
                      ) : (
                        s.address || "-"
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-white/70">
                      {editingId === s._id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={savingEdit}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-green-500/20 border border-green-400/30 hover:bg-green-500/30"
                            title="Save"
                            type="button"
                          >
                            <Save className="w-4 h-4 text-green-300" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
                            title="Cancel"
                            type="button"
                          >
                            <X className="w-4 h-4 text-white/70" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(s)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
                            title="Edit"
                            type="button"
                          >
                            <Edit3 className="w-4 h-4 text-white/70" />
                          </button>
                          <button
                            onClick={() => removeSupplier(s._id)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
                            title="Delete"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4 text-white/60" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSuppliers;
