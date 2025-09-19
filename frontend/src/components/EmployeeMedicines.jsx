import React, { useEffect, useState, useCallback, useRef } from "react";
import { ChevronDown, ChevronRight, Search, Filter } from "lucide-react";
import { getApiBase } from "../api/base";
import { authFetch } from "../api/authFetch";
const API = getApiBase() + "/backend";

const EmployeeMedicines = () => {
  const sortByRecent = (arr) =>
    (arr || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
      );
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    medicineId: "",
    branchId: "",
    quantity: "",
    batchNumber: "",
    reason: "",
  });
  // Branches removed; branch auto-detected from session
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/medicine?includeDeleted=false&withStock=true&storeOnly=true&centralNet=true&initialCurrent=true`
      );
      const data = await res.json();
      if (res.ok && data.success) setList(sortByRecent(data.medicines));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const pollRef = useRef(null);
  useEffect(() => {
    if (openRow) {
      const quick = async () => {
        try {
          const r = await fetch(
            `${API}/medicine?includeDeleted=false&withStock=true&storeOnly=true&centralNet=true&initialCurrent=true`
          );
          const d = await r.json();
          if (r.ok && d.success) setList(sortByRecent(d.medicines));
        } catch {
          // silent polling error
        }
      };
      quick();
      pollRef.current = setInterval(quick, 4000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [openRow]);

  const lcSearch = search.trim().toLowerCase();
  const today = new Date();
  const filteredList = list.filter((m) => {
    const expDate = m.expiryDate ? new Date(m.expiryDate) : null;
    const expired = expDate ? expDate < today : false;
    const expiringSoon = expDate
      ? expDate >= today && expDate <= new Date(Date.now() + 30 * 86400000)
      : false;
    if (expiryFilter === "active" && (expired || expiringSoon)) return false;
    if (expiryFilter === "expiring" && !expiringSoon) return false;
    if (expiryFilter === "expired" && !expired) return false;
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (!lcSearch) return true;
    return (
      (m.medicineName || "").toLowerCase().includes(lcSearch) ||
      (m.batchNumber || "").toLowerCase().includes(lcSearch) ||
      (m.brand || "").toLowerCase().includes(lcSearch)
    );
  });
  const uniqueCategories = Array.from(
    new Set(list.map((m) => m.category))
  ).sort();
  const total = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const visibleList = filteredList.slice(startIdx, startIdx + PAGE_SIZE);
  useEffect(() => {
    setPage(1);
    setOpenRow(null);
  }, [search, categoryFilter, expiryFilter, list.length]);

  // Derive branchId from session/localStorage or /auth/me
  const openRequest = async (m) => {
    let branchId = "";
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.branch) branchId = u.branch._id || u.branch;
        else if (Array.isArray(u.branches) && u.branches.length === 1) {
          branchId = u.branches[0]._id || u.branches[0];
        }
      }
    } catch {
      /* ignore */
    }
    if (!branchId) {
      // Fallback: fetch /auth/me
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.branch)
            branchId = data.user.branch._id || data.user.branch;
        }
      } catch {
        /* ignore */
      }
    }
    setRequestForm((f) => ({
      ...f,
      medicineId: m._id,
      quantity: "",
      branchId,
      batchNumber: "",
      reason: "",
    }));
    setRequestOpen(true);
  };
  // Use authFetch and auto-branch
  const submitRequest = async (e) => {
    e.preventDefault();
    if (
      !requestForm.medicineId ||
      !requestForm.branchId ||
      !requestForm.quantity
    )
      return;
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/inventory/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: requestForm.medicineId,
          quantity: Number(requestForm.quantity),
          batchNumber: requestForm.batchNumber || undefined,
          reason: requestForm.reason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRequestOpen(false);
        setRequestForm({
          medicineId: "",
          branchId: "",
          quantity: "",
          batchNumber: "",
          reason: "",
        });
      } else alert(data.message || "Failed");
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Medicines
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredList.length} item
                  {filteredList.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search medicines..."
                    className="pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-64"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Expiry</span>
                  <select
                    value={expiryFilter}
                    onChange={(e) => setExpiryFilter(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="expiring">Expiring ≤30d</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                {(search ||
                  categoryFilter !== "all" ||
                  expiryFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setExpiryFilter("all");
                    }}
                    className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />{" "}
                  Loading...
                </div>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-muted-foreground">No medicines found</div>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {visibleList.map((m) => {
                    const isOpen = openRow === m._id;
                    const isExpiringSoon =
                      new Date(m.expiryDate) <=
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={m._id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => setOpenRow(isOpen ? null : m._id)}
                              className="text-left w-full"
                            >
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-foreground truncate">
                                  {m.medicineName}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  {m.category}
                                </span>
                                <span className="font-mono">
                                  {m.batchNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                                    isExpiringSoon
                                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                      : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  }`}
                                >
                                  {new Date(m.expiryDate).toLocaleDateString()}
                                </span>
                              </div>
                            </button>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <button
                              onClick={() => openRequest(m)}
                              className="px-2 py-1 text-[11px] bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded transition-colors"
                            >
                              Request
                            </button>
                          </div>
                        </div>
                        {isOpen && (
                          <div className="mt-4 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <p className="text-muted-foreground">Brand</p>
                                <p className="text-foreground font-medium break-words">
                                  {m.brand || "—"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-muted-foreground">
                                  Remaining
                                </p>
                                <p className="text-foreground font-medium">
                                  {m.remainingQuantity ??
                                    m.initialQuantity ??
                                    "—"}
                                </p>
                              </div>
                            </div>
                            {m.description && (
                              <div className="space-y-1">
                                <p className="text-muted-foreground">
                                  Description
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                  {m.description}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          <span className="sr-only">Expand</span>
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Brand
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Category
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Batch
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Expiry
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleList.map((m) => {
                        const isOpen = openRow === m._id;
                        const isExpiringSoon =
                          new Date(m.expiryDate) <=
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        return (
                          <React.Fragment key={m._id}>
                            <tr className="hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4">
                                <button
                                  onClick={() =>
                                    setOpenRow(isOpen ? null : m._id)
                                  }
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                  title={
                                    isOpen
                                      ? "Collapse details"
                                      : "Expand details"
                                  }
                                >
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-foreground">
                                  {m.medicineName}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {m.brand || "—"}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  {m.category}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground font-mono text-sm">
                                {m.batchNumber}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    isExpiringSoon
                                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                      : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  }`}
                                >
                                  {new Date(m.expiryDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => openRequest(m)}
                                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded transition-colors"
                                  title="Request from central"
                                >
                                  Request
                                </button>
                              </td>
                            </tr>
                            {isOpen && (
                              <tr key={`${m._id}-details`}>
                                <td colSpan={7} className="py-0">
                                  <div className="bg-muted/30 p-6 border-t border-border">
                                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                          General
                                        </h4>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Name:
                                          </span>
                                          <span className="text-foreground font-medium">
                                            {m.medicineName}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Brand:
                                          </span>
                                          <span className="text-foreground">
                                            {m.brand || "—"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Category:
                                          </span>
                                          <span className="text-foreground">
                                            {m.category}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Batch:
                                          </span>
                                          <span className="text-foreground font-mono">
                                            {m.batchNumber}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                          Inventory
                                        </h4>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Original Initial:
                                          </span>
                                          <span className="text-foreground">
                                            {m.originalInitialQuantity ?? "—"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Sent Out:
                                          </span>
                                          <span className="text-foreground">
                                            {m.sentOut ?? "—"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Remaining:
                                          </span>
                                          <span className="text-foreground font-medium">
                                            {m.remainingQuantity ??
                                              m.initialQuantity ??
                                              "—"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                          Description
                                        </h4>
                                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                          {m.description || "—"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {total === 0 ? 0 : startIdx + 1}-
                    {Math.min(startIdx + PAGE_SIZE, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border border-border rounded-lg transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border border-border rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {requestOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card text-foreground rounded-xl border border-border shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Request Medicine</h3>
                <button
                  onClick={() => setRequestOpen(false)}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={submitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={requestForm.quantity}
                    onChange={(e) =>
                      setRequestForm((f) => ({
                        ...f,
                        quantity: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Batch (optional)
                  </label>
                  <input
                    value={requestForm.batchNumber}
                    onChange={(e) =>
                      setRequestForm((f) => ({
                        ...f,
                        batchNumber: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={requestForm.reason}
                    onChange={(e) =>
                      setRequestForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRequestOpen(false)}
                    className="flex-1 px-4 py-2 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-sm disabled:opacity-60 transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMedicines;
