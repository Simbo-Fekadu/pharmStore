import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Plus, X } from "lucide-react";

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
  storeId: "",
};

const AdminMedicineAdd = () => {
  const [form, setForm] = useState(empty);
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInput, setSupplierInput] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/location/store`);
        const data = await res.json();
        if (Array.isArray(data)) setStores(data);
      } catch {}
      try {
        const res = await fetch(`${API}/supplier`);
        const data = await res.json();
        if (res.ok && data.success) setSuppliers(data.suppliers || []);
      } catch {}
    })();
  }, []);

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
        sellingPrice: form.sellingPrice ? form.sellingPrice : undefined,
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
        window.dispatchEvent(new CustomEvent("medicine-added"));
        navigate("/admin/medicines");
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Medicine</h1>
          <p className="text-muted-foreground mt-1">
            Create a new medicine entry
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm font-medium"
        >
          Back
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <section className="space-y-4">
            <header className="border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-foreground">
                Basic Information
              </h2>
            </header>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Medicine Name *
                </label>
                <input
                  name="medicineName"
                  value={form.medicineName}
                  onChange={handleChange}
                  required
                  placeholder="Enter medicine name"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Brand
                  </label>
                  <input
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                    placeholder="Brand name"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Category
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {[
                      "Tablet",
                      "Capsule",
                      "Syrup",
                      "Injection",
                      "Cream/Oint",
                      "Others",
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Inventory */}
          <section className="space-y-4">
            <header className="border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-foreground">
                Inventory Details
              </h2>
            </header>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Batch Number *
                  </label>
                  <input
                    name="batchNumber"
                    value={form.batchNumber}
                    onChange={handleChange}
                    required
                    placeholder="Batch number"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Unit Type
                  </label>
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {["Packet", "Strip", "Tube", "Bottle", "Others"].map(
                      (u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={form.expiryDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="space-y-4">
            <header className="border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-foreground">Pricing</h2>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Purchase Price *
                </label>
                <input
                  type="number"
                  name="purchasePrice"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Selling Price
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={form.sellingPrice}
                  onChange={handleChange}
                  placeholder="Auto calculated"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Store & Supplier */}
          <section className="space-y-4">
            <header className="border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-foreground">
                Store & Supplier
              </h2>
            </header>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Store
              </label>
              <select
                name="storeId"
                value={form.storeId}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select store for initial stock</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Supplier
              </label>
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
                onBlur={() => setTimeout(() => setShowSupplierDrop(false), 150)}
                placeholder="Search supplier or enter new"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {showSupplierDrop && supplierInput && (
                <div className="absolute z-20 mt-1 left-0 right-0 max-h-48 overflow-auto bg-card border border-border rounded-lg shadow-lg">
                  {suppliers
                    .filter((s) =>
                      s.supplierName
                        .toLowerCase()
                        .includes(supplierInput.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((s) => (
                      <button
                        type="button"
                        key={s._id}
                        onClick={() => {
                          setForm((p) => ({ ...p, supplier: s._id }));
                          setSupplierInput(s.supplierName);
                          setShowSupplierDrop(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted transition-colors"
                      >
                        <div className="font-medium text-foreground">
                          {s.supplierName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.phoneNumber} {s.address ? `• ${s.address}` : ""}
                        </div>
                      </button>
                    ))}
                  {suppliers.filter((s) =>
                    s.supplierName
                      .toLowerCase()
                      .includes(supplierInput.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No match - will create new supplier
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Additional Info */}
          <section className="space-y-4">
            <header className="border-b border-border pb-2">
              <h2 className="text-lg font-semibold text-foreground">
                Additional Information
              </h2>
            </header>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter medicine description..."
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg font-medium transition-colors"
            >
              {editingId ? (
                submitting ? (
                  "Updating..."
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" /> Update Medicine
                  </>
                )
              ) : submitting ? (
                "Adding..."
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add Medicine
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/medicines")}
              className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          {message && (
            <div
              className={`text-sm p-3 rounded-lg ${
                isError
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminMedicineAdd;
