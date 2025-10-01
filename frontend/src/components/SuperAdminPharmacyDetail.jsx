import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getApiBase } from "../api/base";
import {
  Building2,
  Users,
  Store,
  Package,
  ArrowLeft,
  Edit2,
  Save,
  X,
  RefreshCcw,
} from "lucide-react";

const API = getApiBase() + "/backend";

export default function SuperAdminPharmacyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  // Drilldown data states
  const [usersData, setUsersData] = useState({
    loading: false,
    error: null,
    items: [],
  });
  const [branchesData, setBranchesData] = useState({
    loading: false,
    error: null,
    items: [],
  });
  const [medicinesData, setMedicinesData] = useState({
    loading: false,
    error: null,
    items: [],
  });
  const [requestsData, setRequestsData] = useState({
    loading: false,
    error: null,
    items: [],
  });
  const [transactionsData, setTransactionsData] = useState({
    loading: false,
    error: null,
    items: [],
  });
  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: "",
    address: "",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/superadmin/pharmacies/${id}`, {
          credentials: "include",
        });
        const txt = await res.text();
        let json;
        try {
          json = JSON.parse(txt);
        } catch {
          throw new Error("Non-JSON response");
        }
        if (!res.ok || !json.success)
          throw new Error(json.message || "Load failed");
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // When switching tabs, fetch data if not already fetched
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const fetcher = async (url, setState) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(url, { credentials: "include", headers });
        const txt = await res.text();
        let json;
        try {
          json = JSON.parse(txt);
        } catch {
          throw new Error("Non-JSON response");
        }
        if (!res.ok || !json.success)
          throw new Error(json.message || "Load failed");
        const key = Object.keys(json).find((k) => Array.isArray(json[k]));
        const items = key ? json[key] : [];
        setState({ loading: false, error: null, items });
      } catch (e) {
        setState({ loading: false, error: e.message, items: [] });
      }
    };
    if (
      activeTab === "users" &&
      usersData.items.length === 0 &&
      !usersData.loading
    ) {
      fetcher(`${API}/superadmin/pharmacies/${id}/users`, setUsersData);
    } else if (
      activeTab === "branches" &&
      branchesData.items.length === 0 &&
      !branchesData.loading
    ) {
      fetcher(`${API}/superadmin/pharmacies/${id}/branches`, setBranchesData);
    } else if (
      activeTab === "medicines" &&
      medicinesData.items.length === 0 &&
      !medicinesData.loading
    ) {
      fetcher(
        `${API}/superadmin/pharmacies/${id}/medicines?includeDeleted=false`,
        setMedicinesData
      );
    } else if (
      activeTab === "requests" &&
      requestsData.items.length === 0 &&
      !requestsData.loading
    ) {
      fetcher(`${API}/superadmin/pharmacies/${id}/requests`, setRequestsData);
    } else if (
      activeTab === "transactions" &&
      transactionsData.items.length === 0 &&
      !transactionsData.loading
    ) {
      fetcher(
        `${API}/superadmin/pharmacies/${id}/transactions`,
        setTransactionsData
      );
    }
  }, [
    activeTab,
    id,
    usersData.items.length,
    usersData.loading,
    branchesData.items.length,
    branchesData.loading,
    medicinesData.items.length,
    medicinesData.loading,
    requestsData.items.length,
    requestsData.loading,
    transactionsData.items.length,
    transactionsData.loading,
  ]);

  // Begin editing when user clicks edit icon
  const beginEdit = () => {
    if (!pharmacy) return;
    setEditValues({
      name: pharmacy.name,
      address: pharmacy.address || "",
      status: pharmacy.status || "ACTIVE",
    });
    setEditing(true);
    setSaveError(null);
  };
  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };
  const saveEdit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API}/superadmin/pharmacies/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        throw new Error("Non-JSON response");
      }
      if (!res.ok || !json.success)
        throw new Error(json.message || "Save failed");
      // Refresh summary
      setData((d) => (d ? { ...d, pharmacy: json.pharmacy } : d));
      setEditing(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const summary = data?.summary || {};
  const pharmacy = data?.pharmacy;
  const roleCounts = summary.users || {};
  const reqCounts = summary.requests || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-white/50 flex-wrap">
        <button
          onClick={() => navigate("/admin")}
          className="hover:text-white transition"
        >
          Admin
        </button>
        <span>/</span>
        <button
          onClick={() => navigate("/admin")}
          className="hover:text-white transition"
        >
          Pharmacies
        </button>
        <span>/</span>
        <span className="text-white/80">{pharmacy?.name || "..."}</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-300" />
            {!editing && (
              <h1 className="text-2xl font-bold tracking-tight">
                {pharmacy?.name || "..."}
              </h1>
            )}
            {editing && (
              <input
                value={editValues.name}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, name: e.target.value }))
                }
                className="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
              />
            )}
            {pharmacy && !editing && (
              <button
                onClick={beginEdit}
                className="p-2 rounded hover:bg-white/10"
                title="Edit pharmacy"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {pharmacy && !editing && (
            <span className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[11px] font-semibold uppercase">
              {pharmacy.status}
            </span>
          )}
          {editing && (
            <select
              value={editValues.status}
              onChange={(e) =>
                setEditValues((v) => ({ ...v, status: e.target.value }))
              }
              className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-3 py-2 rounded bg-[var(--brand)] text-white text-xs inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-xs inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </>
          )}
          {!editing && (
            <button
              onClick={() => {
                // refresh
                setData(null);
                setLoading(true);
                fetch(`${API}/superadmin/pharmacies/${id}`, {
                  credentials: "include",
                })
                  .then((r) => r.text())
                  .then((t) => {
                    try {
                      const j = JSON.parse(t);
                      if (j.success) setData(j);
                    } catch {
                      /* ignore parse */
                    }
                  })
                  .finally(() => setLoading(false));
              }}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-xs inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          )}
        </div>
      </div>
      {editing && (
        <div className="flex flex-col gap-2 max-w-xl">
          <textarea
            value={editValues.address}
            onChange={(e) =>
              setEditValues((v) => ({ ...v, address: e.target.value }))
            }
            placeholder="Address"
            className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
            rows={2}
          />
          {saveError && (
            <div className="text-rose-400 text-xs">{saveError}</div>
          )}
        </div>
      )}
      {error && (
        <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
          {error}
        </div>
      )}
      {loading && <div className="text-white/60 text-sm">Loading...</div>}
      {pharmacy && !loading && (
        <>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === "users"}
              onClick={() => setActiveTab("users")}
            >
              Users
            </TabButton>
            <TabButton
              active={activeTab === "branches"}
              onClick={() => setActiveTab("branches")}
            >
              Branches
            </TabButton>
            <TabButton
              active={activeTab === "medicines"}
              onClick={() => setActiveTab("medicines")}
            >
              Medicines
            </TabButton>
            <TabButton
              active={activeTab === "requests"}
              onClick={() => setActiveTab("requests")}
            >
              Requests
            </TabButton>
            <TabButton
              active={activeTab === "transactions"}
              onClick={() => setActiveTab("transactions")}
            >
              Transactions
            </TabButton>
          </div>
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
              <BigStat
                label="Admins"
                value={roleCounts.admin || 0}
                icon={<Users className="w-5 h-5" />}
                onClick={() => setActiveTab("users")}
              />
              <BigStat
                label="Employees"
                value={
                  (roleCounts.employee || 0) +
                  (roleCounts.inventory_manager || 0)
                }
                icon={<Users className="w-5 h-5" />}
                onClick={() => setActiveTab("users")}
              />
              <BigStat
                label="Branches"
                value={summary.branches || 0}
                icon={<Store className="w-5 h-5" />}
                onClick={() => setActiveTab("branches")}
              />
              <BigStat
                label="Medicines"
                value={summary.medicines?.total || 0}
                icon={<Package className="w-5 h-5" />}
                onClick={() => setActiveTab("medicines")}
              />
              <BigStat
                label="Expired"
                value={summary.medicines?.expired || 0}
                icon={<Package className="w-5 h-5" />}
                onClick={() => setActiveTab("medicines")}
              />
              <BigStat
                label="Pending Requests"
                value={reqCounts.Pending || 0}
                icon={<Package className="w-5 h-5" />}
                onClick={() => setActiveTab("requests")}
              />
              <BigStat
                label="Transactions"
                value={summary.transactions || 0}
                icon={<Package className="w-5 h-5" />}
                onClick={() => setActiveTab("transactions")}
              />
            </div>
          )}
          {activeTab === "users" && (
            <DrillList
              title="Users"
              state={usersData}
              columns={["Username", "Email", "Role", "Branch"]}
              rows={usersData.items.map((u) => [
                u.username,
                u.email,
                u.role,
                u.branch?.name || "—",
              ])}
            />
          )}
          {activeTab === "branches" && (
            <DrillList
              title="Branches"
              state={branchesData}
              columns={["Name", "Address", "Created"]}
              rows={branchesData.items.map((b) => ({
                key: b._id,
                cells: [
                  b.name,
                  b.address || "—",
                  new Date(b.createdAt).toLocaleDateString(),
                ],
                onClick: () => navigate(`/admin/pharmacies/${id}/branches/${b._id}`),
              }))}
            />
          )}
          {activeTab === "medicines" && (
            <DrillList
              title="Medicines"
              state={medicinesData}
              columns={[
                "Name",
                "Category",
                "Batch",
                "Expiry",
                "Qty",
                "Deleted",
              ]}
              rows={medicinesData.items.map((m) => [
                m.medicineName,
                m.category,
                m.batchNumber,
                new Date(m.expiryDate).toLocaleDateString(),
                m.quantity ?? 0,
                m.isDeleted ? "Yes" : "No",
              ])}
            />
          )}
          {activeTab === "requests" && (
            <DrillList
              title="Requests"
              state={requestsData}
              columns={["Medicine", "Branch", "Qty", "Status", "Created"]}
              rows={requestsData.items.map((r) => [
                r.medicine?.medicineName || "—",
                r.branch?.name || "—",
                r.quantity,
                r.status,
                new Date(r.createdAt).toLocaleString(),
              ])}
            />
          )}
          {activeTab === "transactions" && (
            <DrillList
              title="Transactions"
              state={transactionsData}
              columns={["Date", "Branch", "Medicine", "Qty", "Type", "Status"]}
              rows={transactionsData.items.map((t) => [
                new Date(t.createdAt).toLocaleString(),
                t.branch,
                t.medicine,
                t.qty,
                t.type,
                t.status,
              ])}
            />
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded border text-xs font-medium tracking-wide transition ${
        active
          ? "bg-[var(--brand)] text-white border-[var(--brand)]"
          : "bg-white/10 border-white/10 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function BigStat({ label, value, icon, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl bg-white/10 border border-white/10 flex flex-col gap-3 text-left transition ${
        clickable
          ? "hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between text-white/60 text-[11px] uppercase font-semibold tracking-wide">
        {label}
        <span className="text-white/30">{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </button>
  );
}

function DrillList({ title, state, columns, rows }) {
  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {state.loading && (
        <div className="text-white/60 text-sm">
          Loading {title.toLowerCase()}...
        </div>
      )}
      {state.error && (
        <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
          {state.error}
        </div>
      )}
      {!state.loading && !state.error && rows.length === 0 && (
        <div className="text-white/50 text-sm">
          No {title.toLowerCase()} found.
        </div>
      )}
      {rows.length > 0 && (
        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="text-left px-3 py-2 font-medium tracking-wide uppercase text-[11px]"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isObj = r && typeof r === 'object' && !Array.isArray(r);
                const key = isObj ? (r.key || i) : i;
                const cells = isObj ? r.cells : r;
                const onClick = isObj ? r.onClick : undefined;
                return (
                  <tr
                    key={key}
                    onClick={onClick}
                    className={`odd:bg-white/0 even:bg-white/[0.015] hover:bg-white/10 transition ${onClick ? 'cursor-pointer' : ''}`}
                  >
                    {cells.map((cell, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
