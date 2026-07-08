import { useEffect, useState } from "react";
import { Calendar, Filter, Search } from "lucide-react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
import { ceilCurrency, ceilOrDash } from "../utils/number";

const API = API_BASE;

// Shows logged-in employee's sales for a date range, paginated (15/page)
const EmployeeSalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const localYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [startDate, setStartDate] = useState(() => localYMD());
  const [endDate, setEndDate] = useState(() => localYMD());
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [q, setQ] = useState("");

  // Branch-wide view; no per-user filter needed

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await authFetch(`${API}/sales/summary?${params}`);
      const data = await res.json();
      if (res.ok && data?.success && data.summary) {
        // Branch-wide history: flatten all employees' sales for the range
        let items = [];
        for (const entry of Object.values(data.summary)) {
          if (Array.isArray(entry.sales)) items = items.concat(entry.sales);
        }
        // Sort newest first
        items.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSales(items);
        setPage(1);
      } else {
        setSales([]);
        setError(data?.message || "Failed to load sales history");
      }
    } catch {
      setError("Network error");
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived filters and pagination
  const lc = q.trim().toLowerCase();
  const filtered = sales.filter((s) =>
    lc ? (s.medicineName || "").toLowerCase().includes(lc) : true
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);
  const totalAmount = filtered.reduce(
    (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.price) || 0),
    0
  );

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Branch Sales History
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Filter by date range; shows all sales in your branch
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded bg-white/10 border border-white/10 text-sm"
            />
          </label>
          <label className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded bg-white/10 border border-white/10 text-sm"
            />
          </label>
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="bg-white/10 border border-white/10 rounded-xl p-4 md:p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-sm text-white/70">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} · Page{" "}
            {currentPage} of {totalPages}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search medicine name..."
              className="pl-9 pr-3 py-2 rounded bg-white/10 border border-white/10 text-sm"
            />
          </div>
        </div>

        {error && <div className="text-sm text-rose-300 mb-3">{error}</div>}
        {loading ? (
          <div className="py-10 text-center text-white/70 text-sm">
            Loading...
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-10 text-center text-white/70 text-sm">
            No sales
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Medicine</th>
                  <th className="text-left px-3 py-2">Qty</th>
                  <th className="text-left px-3 py-2">Unit Price</th>
                  <th className="text-left px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageItems.map((s) => {
                  const qn = Number(s.quantity) || 0;
                  const up = Number(s.price) || 0;
                  const tot = qn * up;
                  return (
                    <tr key={s._id} className="hover:bg-white/5">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(s.date).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        {s.medicineName || s.medicineId?.name || ""}
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

        {/* Footer summary and pagination */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm">
            Total Amount:{" "}
            <span className="font-semibold">{ceilCurrency(totalAmount)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 rounded border border-white/10 bg-white/10 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <div className="text-sm text-white/70">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="px-3 py-1.5 rounded border border-white/10 bg-white/10 disabled:opacity-50"
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

export default EmployeeSalesHistory;
