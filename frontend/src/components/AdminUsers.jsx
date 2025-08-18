import { useEffect, useState } from "react";
import { Trash2, Edit3, Save, X } from "lucide-react";
const API = "http://localhost:3000/backend";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    branches: [],
  });
  const [branches, setBranches] = useState([]);
  const [savingBranches, setSavingBranches] = useState(null); // user id currently updating branches
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role: "employee",
    password: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) setUsers(data.users || []);
      else setError(data.message || "Failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };
  const loadBranches = async () => {
    try {
      const res = await fetch(`${API}/branch`);
      const data = await res.json();
      if (data.success && Array.isArray(data.branches))
        setBranches(data.branches);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    loadBranches();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForm({ username: "", email: "", password: "", branches: [] });
        load();
      } else setError(data.message || "Create failed");
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const toggleBranchForNew = (id) => {
    setForm((f) => ({
      ...f,
      branches: f.branches.includes(id)
        ? f.branches.filter((b) => b !== id)
        : [...f.branches, id],
    }));
  };

  const updateUserBranches = async (user, branchId) => {
    const has = (user.branches || []).some(
      (b) => b._id === branchId || b === branchId
    );
    const newList = has
      ? (user.branches || []).filter((b) => (b._id || b) !== branchId)
      : [...(user.branches || []).map((b) => b._id || b), branchId];
    setSavingBranches(user._id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ branches: newList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((us) => us.map((u) => (u._id === user._id ? data.user : u)));
      } else {
        alert(data.message || "Update failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setSavingBranches(null);
    }
  };

  const removeUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) load();
      else setError(data.message || "Delete failed");
    } catch {
      setError("Network error");
    }
  };

  const startEdit = (u) => {
    setEditUserId(u._id);
    setEditForm({
      username: u.username,
      email: u.email,
      role: u.role,
      password: "",
    });
  };
  const cancelEdit = () => {
    setEditUserId(null);
    setEditForm({ username: "", email: "", role: "employee", password: "" });
  };
  const saveEdit = async (u) => {
    const payload = {
      username: editForm.username,
      email: editForm.email,
      role: editForm.role,
    };
    if (editForm.password.trim()) payload.password = editForm.password.trim();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/${u._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((us) => us.map((x) => (x._id === u._id ? data.user : x)));
        cancelEdit();
      } else {
        alert(data.message || "Update failed");
      }
    } catch {
      alert("Network error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur overflow-x-auto">
        <h2 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
          All Users
        </h2>
        <form
          onSubmit={create}
          className="mb-6 grid md:grid-cols-5 gap-3 text-xs md:text-sm"
        >
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
            required
            className="px-2 py-1.5 rounded bg-white/80 text-gray-800"
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            required
            className="px-2 py-1.5 rounded bg-white/80 text-gray-800"
          />
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required
            className="px-2 py-1.5 rounded bg-white/80 text-gray-800"
          />
          <div className="flex flex-wrap gap-1 items-center max-h-20 overflow-auto p-1 bg-white/10 rounded border border-white/10">
            {branches.map((b) => {
              const selected = form.branches.includes(b._id);
              return (
                <button
                  type="button"
                  key={b._id}
                  onClick={() => toggleBranchForNew(b._id)}
                  className={`px-2 py-1 rounded text-[10px] font-medium border ${
                    selected
                      ? "bg-[var(--brand)] border-[var(--brand)]"
                      : "bg-white/10 border-white/20"
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
          <button
            disabled={creating}
            className="px-3 py-1.5 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold disabled:opacity-60"
          >
            {creating ? "Saving..." : "Add Employee"}
          </button>
        </form>
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-300">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-white/60">No users</div>
        ) : (
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left text-white/70 bg-white/5">
                <th className="py-2 pr-3">Username</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Branches</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u._id}
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <td className="py-1.5 pr-3 font-medium text-white/90">
                    {editUserId === u._id ? (
                      <input
                        value={editForm.username}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            username: e.target.value,
                          }))
                        }
                        className="px-2 py-1 rounded bg-white/80 text-gray-800 w-32"
                      />
                    ) : (
                      u.username
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {editUserId === u._id ? (
                      <input
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className="px-2 py-1 rounded bg-white/80 text-gray-800 w-40"
                      />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {editUserId === u._id ? (
                      <select
                        value={editForm.role}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, role: e.target.value }))
                        }
                        className="px-2 py-1 rounded bg-white/80 text-gray-800"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {branches.map((b) => {
                        const assigned = (u.branches || []).some(
                          (ub) => (ub._id || ub) === b._id
                        );
                        return (
                          <button
                            key={b._id}
                            disabled={savingBranches === u._id}
                            onClick={() => updateUserBranches(u, b._id)}
                            className={`px-2 py-0.5 rounded text-[10px] border transition ${
                              assigned
                                ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                                : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                            } ${savingBranches === u._id ? "opacity-50" : ""}`}
                            title={assigned ? "Remove branch" : "Assign branch"}
                            type="button"
                          >
                            {b.name}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    <div className="flex items-center gap-1">
                      {editUserId === u._id ? (
                        <>
                          <button
                            onClick={() => saveEdit(u)}
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
                          <input
                            type="password"
                            placeholder="New password"
                            value={editForm.password}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                password: e.target.value,
                              }))
                            }
                            className="ml-2 px-2 py-1 rounded bg-white/80 text-gray-800 text-xs"
                          />
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(u)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/20"
                            title="Edit User"
                            type="button"
                          >
                            <Edit3 className="w-4 h-4 text-white/70" />
                          </button>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => removeUser(u._id)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/20"
                              title="Delete User"
                              type="button"
                            >
                              <Trash2 className="w-4 h-4 text-white/60" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
