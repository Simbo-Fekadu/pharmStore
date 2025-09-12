import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Plus, X } from "lucide-react";

import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

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
  const [editingId] = useState(null);
  const [sellingDirty, setSellingDirty] = useState(false); // track if user edited selling
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/location/store`);
        const data = await res.json();
        if (Array.isArray(data)) setStores(data);
      } catch {
        // ignore store fetch errors
      }
      try {
        const res = await fetch(`${API}/supplier`);
        const data = await res.json();
        if (res.ok && data.success) setSuppliers(data.suppliers || []);
      } catch {
        // ignore supplier fetch errors
      }
    })();
  }, []);

  // Default and auto-convert behavior for Selling Price
  useEffect(() => {
    const p = parseFloat(form.purchasePrice);
    const factor = form.category === "Cosmetics" ? 1.35 : 1.25;
    const computed =
      Number.isFinite(p) && p > 0
        ? String(Math.round(p * factor * 100) / 100)
        : "";

    if (!sellingDirty) {
      // Auto-fill and keep in sync when user hasn't edited selling
      if (form.sellingPrice !== computed) {
        setForm((prev) => ({ ...prev, sellingPrice: computed }));
      }
      return;
    }

    // If user-provided looks like a multiplier, convert it immediately
    const sNum = parseFloat(form.sellingPrice);
    if (Number.isFinite(p) && Number.isFinite(sNum) && sNum > 0 && sNum <= 3) {
      const conv = String(Math.round(p * sNum * 100) / 100);
      if (form.sellingPrice !== conv) {
        setForm((prev) => ({ ...prev, sellingPrice: conv }));
      }
    }
  }, [form.purchasePrice, form.category, form.sellingPrice, sellingDirty]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "sellingPrice") {
      // typing into selling makes it user-controlled; clearing re-enables auto
      setSellingDirty(value !== "");
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      // If sellingPrice is blank, omit and let server default apply; otherwise use user's value
      let selling = form.sellingPrice;
      const pNum = parseFloat(form.purchasePrice);
      const sNum = parseFloat(form.sellingPrice);
      // If user typed a multiplier (e.g., 1.35) instead of absolute price, convert to price
      if (
        sNum &&
        pNum &&
        Number.isFinite(sNum) &&
        Number.isFinite(pNum) &&
        sNum > 0 &&
        sNum <= 3
      ) {
        selling = String(Math.round(pNum * sNum * 100) / 100);
      }
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        quantity: form.quantity ? Number(form.quantity) : 0,
        sellingPrice:
          selling !== "" && selling != null ? Number(selling) : undefined,
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
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-6">
          {/* Basic Information */}
          <section className="space-y-3">
            <header className="border-b border-border pb-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Basic Information
              </h2>
            </header>
            <div className="grid gap-3">
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
                      "Cosmetics",
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
          <section className="space-y-3">
            <header className="border-b border-border pb-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Inventory Details
              </h2>
            </header>
            <div className="grid gap-3">
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
          <section className="space-y-3">
            <header className="border-b border-border pb-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Pricing
              </h2>
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
                  placeholder={(function () {
                    const p = parseFloat(form.purchasePrice);
                    const factor = form.category === "Cosmetics" ? 1.35 : 1.25;
                    if (Number.isFinite(p) && p > 0) {
                      return (Math.round(p * factor * 100) / 100).toFixed(2);
                    }
                    return "Auto";
                  })()}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Store & Supplier */}
          <section className="space-y-3">
            <header className="border-b border-border pb-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Store & Supplier
              </h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  onBlur={() =>
                    setTimeout(() => setShowSupplierDrop(false), 150)
                  }
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
            </div>
          </section>

          {/* Additional Info (collapsed) */}
          <details className="space-y-3">
            <summary className="list-none cursor-pointer select-none border-b border-border pb-1 text-base md:text-lg font-semibold text-foreground flex items-center justify-between">
              <span>Additional Information</span>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </summary>
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
          </details>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-border">
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
