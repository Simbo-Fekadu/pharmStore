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
  baseUnit: "",
  packUnit: "",
  packSize: "",
  batchNumber: "",
  expiryDate: "",
  description: "",
  purchasePrice: "",
  quantity: "",
  sellingPrice: "",
  sellingPriceBase: "",
  sellingPricePack: "",
  supplier: "",
  storeId: "",
};

const AdminMedicineAdd = () => {
  const [form, setForm] = useState(empty);
  const [quantityUnit, setQuantityUnit] = useState("pack"); // auto: 'pack' for Packet/Box, otherwise 'base'
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInput, setSupplierInput] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingId] = useState(null);
  const [priceEdited, setPriceEdited] = useState({ pack: false, base: false });
  // pricing is derived automatically from selected unit and counts
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

  // Derive units (base/pack) and quantity unit from selected unit
  useEffect(() => {
    // Auto-set quantity unit: Packet/Box => pack; others => base
    if (form.unit === "Packet" || form.unit === "Box") {
      if (quantityUnit !== "pack") setQuantityUnit("pack");
    } else if (quantityUnit !== "base") {
      setQuantityUnit("base");
    }

    // Derive baseUnit/packUnit from unit selection
    let derivedBase = form.baseUnit;
    let derivedPack = form.packUnit;
    if (form.unit === "Packet") {
      derivedBase = "Strip";
      derivedPack = "Packet";
    } else if (form.unit === "Box") {
      derivedBase = "Ampule";
      derivedPack = "Box";
    } else {
      derivedBase = form.unit || "";
      derivedPack = "";
    }
    if (derivedBase !== form.baseUnit || derivedPack !== form.packUnit) {
      setForm((prev) => ({
        ...prev,
        baseUnit: derivedBase,
        packUnit: derivedPack,
      }));
      // reset price edit flags when switching unit types
      setPriceEdited({ pack: false, base: false });
    }
  }, [form.unit, form.baseUnit, form.packUnit, quantityUnit]);

  // Utilities for rounding
  const ceil2 = (n) => Math.ceil(n * 100) / 100;
  const round2 = (n) => Math.round(n * 100) / 100;

  // Auto-fill selling prices dynamically: reacts to purchase, category, packSize, and unit.
  useEffect(() => {
    const p = parseFloat(form.purchasePrice);
    if (!Number.isFinite(p) || p <= 0) return;
    const factor = form.category === "Cosmetics" ? 1.35 : 1.25;
    const packSizeNum = parseInt(form.packSize) || 0;

    if (form.unit === "Packet" || form.unit === "Box") {
      // Recompute pack price from purchase unless user manually edited the pack price
      if (!priceEdited.pack) {
        const packPrice = round2(p * factor);
        setForm((prev) => ({
          ...prev,
          sellingPricePack: String(packPrice),
          sellingPrice: String(packPrice),
        }));
      }
      // Recompute per-piece from current pack price unless user edited base price
      const currentPack = parseFloat(form.sellingPricePack);
      if (
        packSizeNum > 0 &&
        Number.isFinite(currentPack) &&
        currentPack > 0 &&
        !priceEdited.base
      ) {
        const perPiece = ceil2(currentPack / packSizeNum);
        setForm((prev) => ({ ...prev, sellingPriceBase: String(perPiece) }));
      }
    } else {
      // Single-unit item: recompute base price unless user manually edited base price
      if (!priceEdited.base) {
        const basePrice = round2(p * factor);
        setForm((prev) => ({
          ...prev,
          sellingPriceBase: String(basePrice),
          sellingPrice: String(basePrice),
          sellingPricePack: "",
        }));
      }
    }
  }, [
    form.purchasePrice,
    form.category,
    form.unit,
    form.packSize,
    form.sellingPricePack,
    priceEdited.pack,
    priceEdited.base,
  ]);

  // When purchase price or category changes, re-enable dynamic pricing
  useEffect(() => {
    setPriceEdited({ pack: false, base: false });
  }, [form.purchasePrice, form.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // simple handler; derived fields are computed in useEffect
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePackPriceChange = (e) => {
    const v = e.target.value;
    setForm((prev) => {
      const packSizeNum = parseInt(prev.packSize) || 0;
      const next = { ...prev, sellingPricePack: v };
      if (
        (prev.unit === "Packet" || prev.unit === "Box") &&
        v !== "" &&
        packSizeNum > 0
      ) {
        const perPiece = ceil2((parseFloat(v) || 0) / packSizeNum);
        if (Number.isFinite(perPiece) && perPiece > 0)
          next.sellingPriceBase = String(perPiece);
      }
      // keep legacy sellingPrice aligned (used by some lists)
      next.sellingPrice = v;
      return next;
    });
    setPriceEdited((p) => ({ ...p, pack: true }));
  };

  const handleBasePriceChange = (e) => {
    const v = e.target.value;
    setForm((prev) => {
      const packSizeNum = parseInt(prev.packSize) || 0;
      const next = { ...prev, sellingPriceBase: v };
      if (
        (prev.unit === "Packet" || prev.unit === "Box") &&
        v !== "" &&
        packSizeNum > 0
      ) {
        const packPrice = round2((parseFloat(v) || 0) * packSizeNum);
        if (Number.isFinite(packPrice) && packPrice > 0) {
          next.sellingPricePack = String(packPrice);
          next.sellingPrice = String(packPrice);
        }
      } else {
        // not a pack: legacy mirrors base
        next.sellingPrice = v;
        next.sellingPricePack = "";
      }
      return next;
    });
    setPriceEdited((p) => ({ ...p, base: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      // If sellingPrice is blank, omit and let server default apply; otherwise use user's value
      // Prepare payload respecting per-unit prices
      let selling = form.sellingPrice; // legacy value used by older views
      const pNum = parseFloat(form.purchasePrice);
      const sBase = parseFloat(form.sellingPriceBase);
      const sPack = parseFloat(form.sellingPricePack);
      const packSizeNum = parseInt(form.packSize) || 0;
      // If user typed a multiplier in legacy selling, convert
      const sLegacyNum = parseFloat(form.sellingPrice);
      if (
        sLegacyNum &&
        pNum &&
        Number.isFinite(sLegacyNum) &&
        Number.isFinite(pNum) &&
        sLegacyNum > 0 &&
        sLegacyNum <= 3
      ) {
        selling = String(Math.round(pNum * sLegacyNum * 100) / 100);
      }
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        quantity: form.quantity ? Number(form.quantity) : 0,
        sellingPrice:
          selling !== "" && selling != null ? Number(selling) : undefined,
        baseUnit: form.baseUnit || undefined,
        packUnit: form.packUnit || (packSizeNum > 1 ? form.unit : undefined),
        packSize: packSizeNum > 1 ? packSizeNum : undefined,
        sellingPriceBase:
          Number.isFinite(sBase) && sBase > 0 ? Number(sBase) : undefined,
        sellingPricePack:
          packSizeNum > 1 && Number.isFinite(sPack) && sPack > 0
            ? Number(sPack)
            : undefined,
        initialQuantityUnit:
          form.unit === "Packet" || form.unit === "Box" ? "pack" : "base",
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
                    {[
                      "Packet",
                      "Box",
                      "Ampule",
                      "Tube",
                      "Bottle",
                      "Others",
                    ].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Pack mapping: Packet -> Strips per Packet, Box -> Ampules per Box */}
              {(form.unit === "Packet" || form.unit === "Box") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {form.unit === "Packet"
                        ? "Strips per Packet"
                        : "Ampules per Box"}
                    </label>
                    <input
                      type="number"
                      name="packSize"
                      value={form.packSize}
                      onChange={handleChange}
                      min="1"
                      placeholder={
                        form.unit === "Packet" ? "e.g., 10" : "e.g., 10"
                      }
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Quantity (
                    {quantityUnit === "pack"
                      ? form.packUnit || "Pack"
                      : form.baseUnit || "Unit"}
                    )
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
              {/* quantity treated as pack for Packet/Box; base otherwise */}
            </div>
          </section>

          {/* Pricing */}
          <section className="space-y-3">
            <header className="border-b border-border pb-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Pricing
              </h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              {form.unit === "Packet" || form.unit === "Box" ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Selling Price (per {form.unit})
                    </label>
                    <input
                      type="number"
                      name="sellingPricePack"
                      value={form.sellingPricePack}
                      onChange={handlePackPriceChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Changing this will set per-
                      {form.unit === "Packet" ? "strip" : "ampule"} by dividing
                      and rounding up.
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Selling Price (per{" "}
                      {form.unit === "Packet" ? "Strip" : "Ampule"})
                    </label>
                    <input
                      type="number"
                      name="sellingPriceBase"
                      value={form.sellingPriceBase}
                      onChange={handleBasePriceChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Changing this will set per-{form.unit.toLowerCase()} by
                      multiplying.
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Selling Price (per {form.unit || "unit"})
                  </label>
                  <input
                    type="number"
                    name="sellingPriceBase"
                    value={form.sellingPriceBase}
                    onChange={handleBasePriceChange}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}
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
