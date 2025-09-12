import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, Filter } from "lucide-react";

import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

// Branch medicine list styled like AdminMedicines (read-only subset)
const BranchMedicines = () => {
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [openRow, setOpenRow] = useState(null);

  // Derive branch from user (single branch) or keep dropdown
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.branch) {
          setBranchId(u.branch._id || u.branch);
        } else if (Array.isArray(u.branches) && u.branches.length === 1) {
          setBranchId(u.branches[0]._id || u.branches[0]);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/location/branch`);
        const data = await res.json();
        if (Array.isArray(data)) setBranches(data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = async (id) => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    setOpenRow(null);
    try {
      const res = await fetch(`${API}/inventory/branch/${id}/medicines`);
      const data = await res.json();
      if (res.ok && data.success) {
        const meds = (data.medicines || []).map((m) => ({
          ...m,
          expiryDate: m.expiryDate || m.expiry || new Date().toISOString(),
        }));
        setItems(meds);
        if (meds.length === 0) setMessage("No stock for this branch");
      } else setMessage(data.message || "Failed loading branch medicines");
    } catch {
      setMessage("Network error");
    }
    setLoading(false);
  };
  useEffect(() => {
    if (branchId) load(branchId);
  }, [branchId]);

  const lcSearch = search.trim().toLowerCase();
  const filtered = items.filter((m) => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (!lcSearch) return true;
    return (
      (m.name || "").toLowerCase().includes(lcSearch) ||
      (m.brand || "").toLowerCase().includes(lcSearch) ||
      (m.batchNumber || "").toLowerCase().includes(lcSearch)
    );
  });
  const uniqueCategories = Array.from(new Set(items.map((i) => i.category)))
    .filter(Boolean)
    .sort();

  return (
    <div className="min-h-screen text-foreground">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 md:p-6 border-b border-border space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Branch Medicines</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""} shown
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="flex items-center gap-2">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => load(branchId)}
                  disabled={!branchId || loading}
                  className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 disabled:opacity-50 rounded-lg border border-border"
                >
                  {loading ? "Loading..." : "Reload"}
                </button>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medicines..."
                  className="pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              {(search || categoryFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                  }}
                  className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div>
            {message && !loading && (
              <div className="p-4 text-sm text-muted-foreground">{message}</div>
            )}
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Loading branch medicines...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {branchId
                  ? "No medicines match criteria"
                  : "Select a branch to view stock"}
              </div>
            ) : (
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
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => {
                      const isOpen = openRow === m._id;
                      return (
                        <>
                          <tr
                            key={m._id}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <button
                                onClick={() =>
                                  setOpenRow(isOpen ? null : m._id)
                                }
                                className="p-1 hover:bg-muted rounded transition-colors"
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
                                {m.name}
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
                              {m.batchNumber || "—"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {m.quantity}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr
                              className="bg-muted/40"
                              key={`${m._id}-details`}
                            >
                              <td colSpan={6} className="p-4">
                                <div className="grid md:grid-cols-3 gap-6 text-xs">
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                                      General Information
                                    </h4>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground/60">
                                        Name:
                                      </span>{" "}
                                      <span className="font-medium">
                                        {m.name}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground/60">
                                        Brand:
                                      </span>{" "}
                                      <span>{m.brand || "—"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground/60">
                                        Category:
                                      </span>{" "}
                                      <span>{m.category || "—"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground/60">
                                        Batch:
                                      </span>{" "}
                                      <span>{m.batchNumber || "—"}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                                      Inventory & Pricing
                                    </h4>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground/60">
                                        Remaining:
                                      </span>{" "}
                                      <span>{m.quantity}</span>
                                    </div>
                                    {m.purchasePrice != null && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground/60">
                                          Purchase Price:
                                        </span>{" "}
                                        <span>Br {m.purchasePrice}</span>
                                      </div>
                                    )}
                                    {m.sellingPrice != null && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground/60">
                                          Selling Price:
                                        </span>{" "}
                                        <span>Br {m.sellingPrice}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                                      Supplier Information
                                    </h4>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground/60">
                                        Name:
                                      </span>{" "}
                                      <span>{m.supplier?.name || "—"}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Mobile list */}
          {!loading && filtered.length > 0 && (
            <div className="md:hidden divide-y divide-border">
              {filtered.map((m) => {
                const isOpen = openRow === m._id;
                return (
                  <div key={m._id} className="p-4">
                    <button
                      onClick={() => setOpenRow(isOpen ? null : m._id)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground flex-1 truncate">
                        {m.name}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Qty {m.quantity}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 text-xs space-y-1 text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground/70">
                            Brand:
                          </span>{" "}
                          {m.brand || "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">
                            Category:
                          </span>{" "}
                          {m.category}
                        </div>
                        <div>
                          <span className="text-muted-foreground/70">
                            Batch:
                          </span>{" "}
                          {m.batchNumber || "—"}
                        </div>
                        {m.purchasePrice != null && (
                          <div>
                            <span className="text-muted-foreground/70">
                              Purchase:
                            </span>{" "}
                            {m.purchasePrice}
                          </div>
                        )}
                        {m.sellingPrice != null && (
                          <div>
                            <span className="text-muted-foreground/70">
                              Selling:
                            </span>{" "}
                            {m.sellingPrice}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchMedicines;
