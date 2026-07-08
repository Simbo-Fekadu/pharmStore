import { useEffect, useState, useCallback } from "react";
import { Calendar, Search } from "lucide-react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
import { usePharmacy } from "../hooks/usePharmacy";
import { ceilCurrency, ceilOrDash } from "../utils/number";

const API = API_BASE;

const AdminSales = () => {
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [branchId, setBranchId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [totalCount, setTotalCount] = useState(0);
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalTransactions: 0,
  });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(null);
  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const { pharmacies, selectedPharmacyId, setSelectedPharmacyId } = usePharmacy();

  const loadBranchesAndUsers = useCallback(async () => {
    try {
      const qs =
        role === "super_admin" && selectedPharmacyId ? `?selectedPharmacyId=${selectedPharmacyId}` : "";
      const [bRes, eRes] = await Promise.all([
        authFetch(`${API}/location/branch${qs}`),
        authFetch(`${API}/user${qs}`),
      ]);
      const bJson = await bRes.json().catch(() => ({}));
      const eJson = await eRes.json().catch(() => ({}));
      if (bRes.ok && Array.isArray(bJson)) setBranches(bJson);
      if (eRes.ok && eJson?.success && Array.isArray(eJson.users)) {
        const emps = eJson.users.filter((u) =>
          ["employee", "inventory_manager"].includes(u.role)
        );
        setEmployees(emps);
      }
    } catch {
      /* ignore */
    }
  }, [role, selectedPharmacyId]);

  useEffect(() => {
    loadBranchesAndUsers();
  }, [loadBranchesAndUsers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (branchId) params.set("branchId", branchId);
      if (employeeId) params.set("employeeId", employeeId);
      if (role === "super_admin" && selectedPharmacyId)
        params.set("selectedPharmacyId", selectedPharmacyId);
      const res = await authFetch(`${API}/sales/admin/list?${params}`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setSales(data.sales || []);
        setTotalCount(Number(data.totalCount) || 0);
        setTotals(data.totals || { totalAmount: 0, totalTransactions: 0 });
      } else {
        setSales([]);
        setTotalCount(0);
        setTotals({ totalAmount: 0, totalTransactions: 0 });
        setError(data?.message || "Failed to load sales");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    page,
    pageSize,
    branchId,
    employeeId,
    role,
    selectedPharmacyId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const lc = q.trim().toLowerCase();
  const filtered = sales.filter((s) =>
    (s.medicineName || "").toLowerCase().includes(lc)
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sales (All Branches)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Filter by date range, branch, and employee
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {role === "super_admin" && (
            <div className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">Pharmacy</span>
              <select
                value={selectedPharmacyId}
                onChange={(e) => {
                  setSelectedPharmacyId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded bg-muted border border-border text-sm text-foreground"
              >
                {pharmacies.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground"
            />
          </label>
          <label className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground"
            />
          </label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded bg-muted border border-border text-sm text-foreground"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded bg-muted border border-border text-sm text-foreground"
          >
            <option value="">All Employees</option>
            {employees.map((u) => (
              <option key={u._id} value={u._id}>
                {u.username}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-muted hover:bg-muted/80 border border-border text-sm text-foreground"
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 md:p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            {totalCount} record{totalCount !== 1 ? "s" : ""} · Page{" "}
            {currentPage} of {totalPages}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search medicine name..."
              className="pl-9 pr-3 py-2 rounded bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        {error && <div className="text-sm text-rose-400 mb-3">{error}</div>}
        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-foreground">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Branch</th>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Medicine</th>
                  <th className="text-left px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Unit Price</th>
                  <th className="text-left px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => {
                  const qn = Number(s.quantity) || 0;
                  const up = Number(s.price) || 0;
                  const tot = qn * up;
                  return (
                    <tr key={s._id} className="hover:bg-muted">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(s.date).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{s.branchId?.name || ""}</td>
                      <td className="px-3 py-2">
                        {s.employeeId?.username || s.employeeName || ""}
                      </td>
                      <td className="px-3 py-2">
                        {s.medicineName ||
                          s.medicineId?.medicineName ||
                          s.medicineId?.name ||
                          ""}
                      </td>
                      <td className="px-3 py-2 font-mono">{ceilOrDash(qn)}</td>
                      <td className="px-3 py-2 font-mono">
                        {ceilCurrency(up)}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold">
                        {ceilCurrency(tot)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-foreground">
            Total Amount:{" "}
            <span className="font-semibold">
              {ceilCurrency(totals.totalAmount || 0)}
            </span>{" "}
            · Transactions:{" "}
            <span className="font-semibold">
              {ceilOrDash(totals.totalTransactions || 0)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 rounded border border-border bg-muted text-foreground disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="px-3 py-1.5 rounded border border-border bg-muted text-foreground disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSales;
