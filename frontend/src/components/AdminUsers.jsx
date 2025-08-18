import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
const API = "http://localhost:3000/backend";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });

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
  useEffect(() => {
    load();
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
        setForm({ username: "", email: "", password: "" });
        load();
      } else setError(data.message || "Create failed");
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
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
          className="mb-6 grid md:grid-cols-4 gap-3 text-xs md:text-sm"
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
                    {u.username}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">{u.email}</td>
                  <td className="py-1.5 pr-3 text-white/70">{u.role}</td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 pr-3 text-white/70">
                    {u.role !== "admin" && (
                      <button
                        onClick={() => removeUser(u._id)}
                        className="group inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/20 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4 text-white/60 group-hover:text-white/90 transition" />
                      </button>
                    )}
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
