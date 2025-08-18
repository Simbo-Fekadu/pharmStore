import { useEffect, useState } from "react";
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
  // Trash moved to dedicated page

  const load = async () => {
    setLoading(true);
    try {
      const url = `${API}/medicine?includeDeleted=false`;
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
  }, []);

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
                            {s.phoneNumber} {s.address ? `• ${s.address}` : ""}
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
                      <>
                        <tr
                          key={m._id}
                          className="border-t border-white/5 hover:bg-white/5"
                        >
                          <td className="py-1.5 pr-3 align-top">
                            <button
                              onClick={() => setOpenRow(isOpen ? null : m._id)}
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
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-white/5">
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
                                  <div>
                                    <span className="text-white/50">
                                      Quantity:{" "}
                                    </span>
                                    {m.quantity ?? "-"}
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
                      </>
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
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  );
};

export default AdminMedicines;
