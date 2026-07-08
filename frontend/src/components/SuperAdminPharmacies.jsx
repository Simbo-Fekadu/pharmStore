import { useEffect, useState, useCallback } from "react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
import {
  Building2,
  RefreshCcw,
  X,
  Users,
  Activity,
  Factory,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = API_BASE;

export default function SuperAdminPharmacies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    name: "",
    code: "",
    address: "",
    status: "ACTIVE",
    saving: false,
    error: null,
  });
  const navigate = useNavigate();

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API}/superadmin/pharmacies`, {
        // credentials handled by authFetch; includes Bearer token if present
      });
      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        throw new Error(`Non-JSON (${res.status}) ${txt.slice(0, 120)}`);
      }
      if (!res.ok || !json.success) throw new Error(json.message || "Failed");
      setItems(json.pharmacies || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onCreate = async (evt) => {
    evt.preventDefault();
    const form = evt.target;
    const name = form.name.value.trim();
    const code = form.code.value.trim();
    const address = form.address.value.trim();
    const primaryAdminEmail = form.primaryAdminEmail.value.trim();
    if (!name || !code) {
      setCreateError("Name & Code required");
      return;
    }
    setCreateError(null);
    try {
      const res = await authFetch(`${API}/superadmin/pharmacies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, address, primaryAdminEmail }),
      });
      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        throw new Error(`Non-JSON (${res.status}) ${txt.slice(0, 120)}`);
      }
      if (!res.ok || !json.success)
        throw new Error(json.message || "Create failed");
      setCreating(false);
      form.reset();
      fetchList();
    } catch (e) {
      setCreateError(e.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacies</h1>
          <p className="text-white/60 text-sm">
            Multi-tenant list. Click to view summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchList}
            disabled={loading}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm inline-flex items-center gap-2"
          >
            <RefreshCcw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />{" "}
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => {
              setCreating(true);
              setCreateError(null);
            }}
            className="px-3 py-2 rounded bg-[var(--brand)] text-white text-sm font-medium"
          >
            New Pharmacy
          </button>
        </div>
      </div>
      {error && (
        <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
          {error}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((p) => {
          const isEditing = editingId === (p._id || p.id);
          return (
            <div
              key={p._id || p.id}
              className="relative text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-4 shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 shrink-0">
                  <Building2 className="w-6 h-6 text-indigo-300" />
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs font-semibold uppercase text-white/50">
                    Code
                  </div>
                  {isEditing ? (
                    <input
                      className="text-2xl font-bold tracking-tight bg-white/80 text-gray-900 px-2 py-1 rounded"
                      value={editValues.code}
                      onChange={(e) =>
                        setEditValues((v) => ({ ...v, code: e.target.value }))
                      }
                    />
                  ) : (
                    <div className="text-2xl font-bold tracking-tight">
                      {p.code}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {isEditing ? (
                  <input
                    className="text-lg font-semibold leading-tight truncate bg-white/80 text-gray-900 px-2 py-1 rounded w-full"
                    value={editValues.name}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, name: e.target.value }))
                    }
                  />
                ) : (
                  <button
                    onClick={() =>
                      navigate(`/admin/pharmacies/${p._id || p.id}`)
                    }
                    className="text-lg font-semibold leading-tight truncate text-left hover:underline"
                  >
                    {p.name}
                  </button>
                )}
                {isEditing ? (
                  <input
                    className="text-[11px] px-2 py-1 rounded bg-white/80 text-gray-900 w-full"
                    value={editValues.address}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, address: e.target.value }))
                    }
                    placeholder="Address"
                  />
                ) : (
                  <div className="text-[11px] text-white/50 truncate">
                    {p.address || "—"}
                  </div>
                )}
                {isEditing ? (
                  <select
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/80 text-gray-900"
                    value={editValues.status}
                    onChange={(e) =>
                      setEditValues((v) => ({ ...v, status: e.target.value }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                ) : (
                  <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 border border-white/10 uppercase tracking-wide">
                    {p.status || "ACTIVE"}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                {isEditing ? (
                  <>
                    <button
                      className="px-3 py-1.5 rounded bg-[var(--brand)] text-white text-xs"
                      disabled={editValues.saving}
                      onClick={async () => {
                        setEditValues((v) => ({
                          ...v,
                          saving: true,
                          error: null,
                        }));
                        try {
                          const res = await authFetch(
                            `${API}/superadmin/pharmacies/${p._id || p.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: editValues.name,
                                code: editValues.code,
                                address: editValues.address,
                                status: editValues.status,
                              }),
                            }
                          );
                          const j = await res.json().catch(() => ({}));
                          if (!res.ok || !j.success)
                            throw new Error(j.message || `HTTP ${res.status}`);
                          setItems((arr) =>
                            arr.map((it) =>
                              it._id === (p._id || p.id) ||
                              it.id === (p._id || p.id)
                                ? j.pharmacy
                                : it
                            )
                          );
                          setEditingId(null);
                        } catch (e) {
                          setEditValues((v) => ({ ...v, error: e.message }));
                        } finally {
                          setEditValues((v) => ({ ...v, saving: false }));
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                    {editValues.error && (
                      <div className="text-rose-400 text-[10px]">
                        {editValues.error}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs"
                      onClick={() => {
                        setEditingId(p._id || p.id);
                        setEditValues({
                          name: p.name || "",
                          code: p.code || "",
                          address: p.address || "",
                          status: p.status || "ACTIVE",
                          saving: false,
                          error: null,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-xs"
                      onClick={async () => {
                        if (!confirm("Delete this pharmacy?")) return;
                        try {
                          const res = await authFetch(
                            `${API}/superadmin/pharmacies/${p._id || p.id}`,
                            {
                              method: "DELETE",
                            }
                          );
                          const j = await res.json().catch(() => ({}));
                          if (!res.ok || !j.success)
                            throw new Error(j.message || `HTTP ${res.status}`);
                          setItems((arr) =>
                            arr.filter(
                              (it) => (it._id || it.id) !== (p._id || p.id)
                            )
                          );
                        } catch (e) {
                          alert(e.message);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 && (
          <div className="col-span-full text-white/50 text-sm">
            No pharmacies yet.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCreating(false)}
          />
          <div className="relative w-full max-w-md m-auto rounded-xl border border-white/10 bg-[var(--bg-start)] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Pharmacy</h2>
              <button
                onClick={() => setCreating(false)}
                className="p-2 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="grid gap-3">
                <Field
                  label="Name"
                  name="name"
                  placeholder="Zelalem Pharmacy"
                />
                <Field label="Code" name="code" placeholder="ZELALEM" />
                <Field label="Address" name="address" placeholder="Main Road" />
                <Field
                  label="Primary Admin Email (optional)"
                  name="primaryAdminEmail"
                  placeholder="admin@example.com"
                />
              </div>
              {createError && (
                <div className="text-rose-400 text-xs">{createError}</div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-[var(--brand)] text-white text-sm font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PharmacyCard({ p, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex flex-col gap-4 shadow hover:shadow-xl hover:-translate-y-0.5 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 shrink-0">
          <Building2 className="w-6 h-6 text-indigo-300" />
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs font-semibold uppercase text-white/50">
            Code
          </div>
          <div className="text-2xl font-bold tracking-tight">{p.code}</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-lg font-semibold leading-tight truncate">
          {p.name}
        </div>
        <div className="text-[11px] text-white/50 truncate">
          {p.address || "—"}
        </div>
        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 border border-white/10 uppercase tracking-wide">
          {p.status || "ACTIVE"}
        </div>
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle at 85% 15%, #6366f133, transparent 70%)",
        }}
      />
    </button>
  );
}

function Field({ label, name, placeholder }) {
  return (
    <label className="text-xs font-medium space-y-1">
      <span className="block text-white/60 uppercase tracking-wide">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-sm"
      />
    </label>
  );
}
