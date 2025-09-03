import React, { useEffect, useState, useRef } from "react";
import {
  PenLine,
  Trash2,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Search,
  Filter,
} from "lucide-react";

const API = "http://localhost:3000/backend";

const empty = {
  medicineName: "",
  brand: "",
  category: "Tablet",
  unit: "Packet",
  batchNumber: "",
  expiryDate: "",
  description: "",
  purchasePrice: "",
  quantity: "",
  sellingPrice: "",
  supplier: "",
  createdBy: "admin", // placeholder until auth user integrated
  storeId: "",
};

const AdminMedicines = () => {
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInput, setSupplierInput] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [showForm, setShowForm] = useState(true); // toggle form visibility
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  // History modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyMedicine, setHistoryMedicine] = useState(null);
  // Send modal state (direct distribute from central)
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    medicineId: "",
    storeId: "",
    branchId: "",
    quantity: "",
  });
  const [locations, setLocations] = useState({ stores: [], branches: [] });
  const [role, setRole] = useState(null);
  const [stores, setStores] = useState([]);
  // Trash moved to dedicated page

  const load = async () => {
    setLoading(true);
    try {
      const url = `${API}/medicine?includeDeleted=false&withStock=true&storeOnly=true&centralNet=true&initialCurrent=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) setList(data.medicines || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    fetchSuppliers();
    const r = localStorage.getItem("role");
    setRole(r);
    fetchStores();
  }, []);

  // Polling for live quantities while a row is expanded
  const pollRef = useRef(null);
  useEffect(() => {
    if (openRow) {
      // immediate refresh without toggling global loading state
      const quick = async () => {
        try {
          const res = await fetch(
            `${API}/medicine?includeDeleted=false&withStock=true&storeOnly=true&centralNet=true&initialCurrent=true`
          );
          const data = await res.json();
          if (res.ok && data.success) setList(data.medicines || []);
        } catch {
          /* ignore */
        }
      };
      quick();
      pollRef.current = setInterval(quick, 4000); // 4s cadence
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [openRow]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API}/supplier`);
      const data = await res.json();
      if (res.ok && data.success) setSuppliers(data.suppliers || []);
    } catch {
      /* ignore */
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        quantity: form.quantity ? Number(form.quantity) : 0,
        sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
      };
      if (!payload.storeId || !payload.storeId.trim()) delete payload.storeId;
      if (!payload.supplier || !payload.supplier.trim())
        delete payload.supplier;
      const isEdit = Boolean(editingId);
      const res = await fetch(
        `${API}/medicine${isEdit ? "/" + editingId : ""}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(isEdit ? "Medicine updated" : "Medicine added");
        setForm(empty);
        setEditingId(null);
        load();
        fetchSuppliers();
        setSupplierInput("");
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

  const fetchStores = async () => {
    try {
      const res = await fetch(`${API}/location/store`);
      const data = await res.json();
      if (Array.isArray(data)) setStores(data);
    } catch {
      /* ignore load error */
    }
  };

  const startEdit = (m) => {
    // ensure form visible when editing
    setShowForm(true);
    setEditingId(m._id);
    // Determine supplier id & display name
    let supplierId = "";
    let supplierNameDisplay = "";
    if (m.supplier && typeof m.supplier === "object") {
      supplierId = m.supplier._id || "";
      supplierNameDisplay = m.supplier.supplierName || "";
    } else if (typeof m.supplier === "string") {
      supplierId = m.supplier;
      const found = suppliers.find((s) => s._id === m.supplier);
      supplierNameDisplay = found ? found.supplierName : m.supplier;
    }
    setForm({
      medicineName: m.medicineName || "",
      brand: m.brand || "",
      category: m.category || "Tablet",
      unit: m.unit || "Packet",
      batchNumber: m.batchNumber || "",
      expiryDate: m.expiryDate ? m.expiryDate.substring(0, 10) : "",
      description: m.description || "",
      purchasePrice: m.purchasePrice || "",
      sellingPrice: m.sellingPrice || "",
      quantity: m.quantity || "",
      supplier: supplierId,
      createdBy: m.createdBy || "admin",
    });
    setSupplierInput(supplierNameDisplay);
  };

  const openHistory = async (m) => {
    setHistoryMedicine(m);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `${API}/inventory/ledger?medicineId=${m._id}&limit=100`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok && data.success) setHistory(data.entries || []);
      else setHistory([]);
      // refresh stock so expanded quantity stays current
      load();
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openSend = async (m) => {
    setSendForm({ medicineId: m._id, storeId: "", branchId: "", quantity: "" });
    setSendOpen(true);
    try {
      const [stRes, brRes] = await Promise.all([
        fetch(`${API}/location/store`, { credentials: "include" }),
        fetch(`${API}/location/branch`, { credentials: "include" }),
      ]);
      const stores = await stRes.json();
      const branches = await brRes.json();
      setLocations({
        stores: Array.isArray(stores) ? stores : [],
        branches: Array.isArray(branches) ? branches : [],
      });
    } catch {
      setLocations({ stores: [], branches: [] });
    }
  };

  const submitSend = async (e) => {
    e.preventDefault();
    if (
      !sendForm.medicineId ||
      !sendForm.storeId ||
      !sendForm.branchId ||
      !sendForm.quantity
    )
      return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/inventory/transfer/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medicineId: sendForm.medicineId,
          storeId: sendForm.storeId,
          branchId: sendForm.branchId,
          quantity: Number(sendForm.quantity),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendOpen(false);
        setSendForm({
          medicineId: "",
          storeId: "",
          branchId: "",
          quantity: "",
        });
        // Refresh list and show history for this medicine
        load(); // refresh list (liveQuantity)
        const med = list.find((x) => x._id === sendForm.medicineId);
        if (med) openHistory(med);
      } else {
        alert(data.message || "Failed to transfer");
      }
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const softDelete = async (id) => {
    if (!confirm("Move to trash?")) return;
    try {
      const res = await fetch(`${API}/medicine/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Moved to trash");
        load();
      } else {
        setMessage(data.message || "Delete failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    }
  };

  // restore & purge moved to dedicated trash page

  // Derive filtered list for search/filter
  const lcSearch = search.trim().toLowerCase();
  const today = new Date();
  const filteredList = list.filter((m) => {
    // Exclude expired
    if (m.expiryDate && new Date(m.expiryDate) < today) return false;
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

  // Pagination calculations
  const total = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const visibleList = filteredList.slice(startIdx, startIdx + PAGE_SIZE);

  // Reset to first page on filter/search/list change
  useEffect(() => {
    setPage(1);
    setOpenRow(null);
  }, [search, categoryFilter, list.length]);

  return (
    <>
      <div className="space-y-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Medicines</h1>
        </div>
        <div className={`grid gap-8 ${showForm ? "lg:grid-cols-2" : ""}`}>
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur relative"
            >
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded bg-white/10 hover:bg-white/20 border border-white/10"
                title="Hide form"
              >
                <ChevronLeft className="w-4 h-4 text-white/70" />
              </button>
              <h2 className="font-semibold tracking-wide text-sm uppercase text-white/70">
                {editingId ? "Update Medicine" : "Add Medicine"}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  name="medicineName"
                  value={form.medicineName}
                  onChange={handleChange}
                  required
                  placeholder="Medicine Name"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="Brand"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                >
                  {[
                    "Tablet",
                    "Capsule",
                    "Syrup",
                    "Injection",
                    "Cream/Oint",
                    "Others",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                >
                  {["Packet", "Strip", "Tube", "Bottle", "Others"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <input
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={handleChange}
                  required
                  placeholder="Batch Number"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  required
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <input
                  type="number"
                  name="purchasePrice"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  required
                  placeholder="Purchase Price"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Quantity"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <select
                  name="storeId"
                  value={form.storeId}
                  onChange={handleChange}
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                >
                  <option value="">Select Store (for initial stock)</option>
                  {stores.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="sellingPrice"
                  value={form.sellingPrice}
                  onChange={handleChange}
                  placeholder="Selling Price (auto if blank)"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                />
                <div className="col-span-full relative">
                  <input
                    name="supplier"
                    value={supplierInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSupplierInput(val);
                      setForm((p) => ({ ...p, supplier: val }));
                      setShowSupplierDrop(true);
                    }}
                    onFocus={() => setShowSupplierDrop(true)}
                    onBlur={() =>
                      setTimeout(() => setShowSupplierDrop(false), 150)
                    }
                    placeholder="Supplier name or ID (autocomplete)"
                    className="w-full px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
                  />
                  {showSupplierDrop && supplierInput && (
                    <div className="absolute z-20 mt-1 left-0 right-0 max-h-52 overflow-auto bg-white rounded-md shadow-lg border border-gray-200 text-gray-800 text-sm">
                      {suppliers
                        .filter((s) =>
                          s.supplierName
                            .toLowerCase()
                            .includes(supplierInput.toLowerCase())
                        )
                        .slice(0, 15)
                        .map((s) => (
                          <button
                            type="button"
                            key={s._id}
                            onClick={() => {
                              setForm((p) => ({ ...p, supplier: s._id }));
                              setSupplierInput(s.supplierName);
                              setShowSupplierDrop(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[#5C8374]/10 focus:bg-[#5C8374]/20"
                          >
                            <div className="font-medium">{s.supplierName}</div>
                            <div className="text-xs text-gray-500">
                              {s.phoneNumber}{" "}
                              {s.address ? `• ${s.address}` : ""}
                            </div>
                          </button>
                        ))}
                      {suppliers.filter((s) =>
                        s.supplierName
                          .toLowerCase()
                          .includes(supplierInput.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          No match - will create new supplier on save
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Description"
                  className="px-3 py-2 rounded bg-white/80 text-gray-800 text-sm col-span-full"
                />
              </div>
              <div className="flex gap-3">
                <button
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  {editingId ? (
                    submitting ? (
                      "Updating..."
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" /> Update
                      </>
                    )
                  ) : submitting ? (
                    "Saving..."
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add Medicine
                    </>
                  )}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(empty);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded text-sm text-white"
                    title="Cancel edit"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
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
          )}
          <div
            className={`bg-white/10 rounded-xl p-6 border border-white/10 backdrop-blur overflow-x-auto ${
              showForm ? "" : "lg:col-span-2"
            }`}
          >
            <h2 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
              All Medicines
            </h2>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                {!showForm && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/10 inline-flex items-center gap-1"
                    title="Show form"
                  >
                    <ChevronRight className="w-4 h-4" /> Form
                  </button>
                )}
                <div className="relative">
                  <Search className="w-4 h-4 text-white/50 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, batch, brand"
                    className="pl-7 pr-3 py-1.5 rounded bg-white/15 border border-white/10 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-white/90 placeholder:text-white/40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-white/50" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2 py-1.5 rounded bg-white/15 border border-white/10 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-white/90"
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
                    className="px-2.5 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/10"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-white/50">
                  {filteredList.length} shown
                </span>
              </div>
            </div>
            {loading ? (
              <div className="text-sm text-white/70">Loading...</div>
            ) : filteredList.length === 0 ? (
              <div className="text-sm text-white/60">No medicines</div>
            ) : (
              <>
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-left text-white/70 bg-white/5">
                      <th className="py-2 pr-3"> </th>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Brand</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Batch</th>
                      <th className="py-2 pr-3">Expiry</th>
                      <th className="py-2 pr-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleList.map((m) => {
                      const isOpen = openRow === m._id;
                      return (
                        <React.Fragment key={m._id}>
                          <tr className="border-t border-white/5 hover:bg-white/5">
                            <td className="py-1.5 pr-3 align-top">
                              <button
                                onClick={() =>
                                  setOpenRow(isOpen ? null : m._id)
                                }
                                className="w-6 h-6 inline-flex items-center justify-center rounded bg-white/10 hover:bg-white/20 border border-white/10"
                                title={isOpen ? "Collapse" : "Expand"}
                              >
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 text-white/70" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-white/70" />
                                )}
                              </button>
                            </td>
                            <td className="py-1.5 pr-3 font-medium text-white/90">
                              {m.medicineName}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              {m.brand || "-"}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              {m.category}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              {m.batchNumber}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              {new Date(m.expiryDate).toLocaleDateString()}
                            </td>
                            <td className="py-1.5 pr-3 text-white/70">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEdit(m)}
                                  className="group inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/20 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                                  title="Edit"
                                >
                                  <PenLine className="w-4 h-4 text-white/60 group-hover:text-white/90 transition" />
                                </button>
                                <button
                                  onClick={() => softDelete(m._id)}
                                  className="group inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/20 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                                  title="Move to Trash"
                                >
                                  <Trash2 className="w-4 h-4 text-white/60 group-hover:text-white/90 transition" />
                                </button>
                                {(role === "admin" ||
                                  role === "inventory_manager") && (
                                  <button
                                    onClick={() => openSend(m)}
                                    className="px-2.5 py-1.5 text-xs rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30"
                                    title="Send to Branch"
                                  >
                                    Send
                                  </button>
                                )}
                                <button
                                  onClick={() => openHistory(m)}
                                  className="px-2.5 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 border border-white/10"
                                  title="View History"
                                >
                                  History
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-white/5" key={`${m._id}-details`}>
                              <td colSpan={7} className="px-6 py-4">
                                <div className="grid md:grid-cols-3 gap-6 text-xs md:text-sm">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-white/80 text-sm">
                                      General
                                    </h4>
                                    <div>
                                      <span className="text-white/50">
                                        Name:{" "}
                                      </span>
                                      {m.medicineName}
                                    </div>
                                    <div>
                                      <span className="text-white/50">
                                        Brand:{" "}
                                      </span>
                                      {m.brand || "-"}
                                    </div>
                                    <div>
                                      <span className="text-white/50">
                                        Category:{" "}
                                      </span>
                                      {m.category}
                                    </div>
                                    <div>
                                      <span className="text-white/50">
                                        Batch:{" "}
                                      </span>
                                      {m.batchNumber}
                                    </div>
                                    <div>
                                      <span className="text-white/50">
                                        Expiry:{" "}
                                      </span>
                                      {new Date(
                                        m.expiryDate
                                      ).toLocaleDateString()}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white/50">
                                          Original Initial:
                                        </span>
                                        <span>
                                          {m.originalInitialQuantity != null
                                            ? m.originalInitialQuantity
                                            : "-"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-white/50">
                                          Sent Out:
                                        </span>
                                        <span>
                                          {m.sentOut != null ? m.sentOut : "-"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-white/50">
                                          Remaining:
                                        </span>
                                        <span>
                                          {m.remainingQuantity != null
                                            ? m.remainingQuantity
                                            : m.initialQuantity != null
                                            ? m.initialQuantity
                                            : "-"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-white/80 text-sm">
                                      Pricing
                                    </h4>
                                    <div>
                                      <span className="text-white/50">
                                        Purchase:{" "}
                                      </span>
                                      {m.purchasePrice}
                                    </div>
                                    <div>
                                      <span className="text-white/50">
                                        Selling:{" "}
                                      </span>
                                      {m.sellingPrice}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-white/80 text-sm">
                                      Supplier
                                    </h4>
                                    {m.supplier ? (
                                      <>
                                        <div>
                                          <span className="text-white/50">
                                            Name:{" "}
                                          </span>
                                          {m.supplier.supplierName || "-"}
                                        </div>
                                        <div>
                                          <span className="text-white/50">
                                            Phone:{" "}
                                          </span>
                                          {m.supplier.phoneNumber || "-"}
                                        </div>
                                        <div>
                                          <span className="text-white/50">
                                            Address:{" "}
                                          </span>
                                          {m.supplier.address || "-"}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-white/60">
                                        No supplier
                                      </div>
                                    )}
                                  </div>
                                  <div className="md:col-span-3 pt-2">
                                    <h4 className="font-semibold text-white/80 text-sm mb-1">
                                      Description
                                    </h4>
                                    <p className="text-white/70 leading-relaxed whitespace-pre-line">
                                      {m.description || "—"}
                                    </p>
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
                {/* Pagination controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 text-xs md:text-sm">
                  <div className="opacity-70">
                    Showing {total === 0 ? 0 : startIdx + 1}-
                    {Math.min(startIdx + PAGE_SIZE, total)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/20"
                    >
                      Prev
                    </button>
                    <span className="px-2 select-none">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/20"
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
      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Transaction History — {historyMedicine?.medicineName}
                </h3>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {historyLoading ? (
                <div className="text-white/70 text-sm">Loading...</div>
              ) : history.length === 0 ? (
                <div className="text-white/70 text-sm">No history</div>
              ) : (
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="text-left text-white/70 bg-white/5">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Qty</th>
                        <th className="py-2 pr-3">Location</th>
                        <th className="py-2 pr-3">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h._id} className="border-t border-white/5">
                          <td className="py-1.5 pr-3">
                            {new Date(h.createdAt).toLocaleString()}
                          </td>
                          <td className="py-1.5 pr-3">{h.transactionType}</td>
                          <td className="py-1.5 pr-3">{h.quantity}</td>
                          <td className="py-1.5 pr-3">
                            {h.locationId?.name || "-"}
                          </td>
                          <td className="py-1.5 pr-3">
                            {h.sourceDocType}
                            {h.sourceDocId ? `: ${h.sourceDocId}` : ""}{" "}
                            {h.createdByUserId
                              ? `• ${
                                  h.createdByUserId.role === "admin"
                                    ? "admin"
                                    : h.createdByUserId.username || "user"
                                }`
                              : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Send Modal */}
      {sendOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Send to Branch
                </h3>
                <button
                  onClick={() => setSendOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={submitSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    From Store
                  </label>
                  <select
                    value={sendForm.storeId}
                    onChange={(e) =>
                      setSendForm((s) => ({ ...s, storeId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    required
                  >
                    <option value="">Select store</option>
                    {(locations.stores || []).map((s) => (
                      <option
                        key={s._id}
                        value={s._id}
                        className="bg-gray-800 text-white"
                      >
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    To Branch
                  </label>
                  <select
                    value={sendForm.branchId}
                    onChange={(e) =>
                      setSendForm((s) => ({ ...s, branchId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
                    required
                  >
                    <option value="">Select branch</option>
                    {(locations.branches || []).map((b) => (
                      <option
                        key={b._id}
                        value={b._id}
                        className="bg-gray-800 text-white"
                      >
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sendForm.quantity}
                    onChange={(e) =>
                      setSendForm((s) => ({ ...s, quantity: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSendOpen(false)}
                    className="flex-1 px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-sm disabled:opacity-60"
                  >
                    {submitting ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminMedicines;
