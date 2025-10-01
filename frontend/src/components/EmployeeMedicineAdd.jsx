import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { getApiBase } from "../api/base";
import { authFetch } from "../api/authFetch";
import useToast from "../hooks/useToast";

// Simplified version of AdminMedicineAdd for employees to register NEW medicines into central store.
// Differences:
// - Removes bulk import, editing, advanced pricing sync logic (keeps core auto pricing factor 1.25 / 1.35 cosmetics)
// - Forces initial stock optional; if provided we treat it as base units unless pack context inferred
// - Auto-derives baseUnit/packUnit like admin form (Packet/Box logic + pieces per item)
// - After success: stay on page (optionally offer another add) and show toast.

const API = getApiBase() + "/backend";

const empty = {
  medicineName: "",
  brand: "",
  category: "MISCELLANEOUS",
  unit: "Others",
  packSize: "",
  piecesPerItem: "",
  baseUnit: "",
  packUnit: "",
  batchNumber: "",
  expiryDate: "",
  purchasePrice: "",
  quantity: "",
  sellingPrice: "",
  sellingPriceBase: "",
  sellingPricePack: "",
  supplier: "",
};

export default function EmployeeMedicineAdd() {
  const [form, setForm] = useState(empty);
  const [quantityUnit, setQuantityUnit] = useState("base");
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInput, setSupplierInput] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Load suppliers (read-only)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/supplier`);
        const data = await res.json();
        if (res.ok && data.success) setSuppliers(data.suppliers || []);
      } catch {/* ignore */}
    })();
  }, []);

  // Derive units from unit / pieces / packSize
  useEffect(() => {
    const pieces = parseInt(form.piecesPerItem) || 0;
    const isPacket = form.unit === "Packet";
    const isBox = form.unit === "Box";

    let baseUnit = form.baseUnit;
    let packUnit = form.packUnit;
    if (pieces > 1) {
      baseUnit = "Piece";
      packUnit = "Item";
      if (quantityUnit !== "pack") setQuantityUnit("pack");
    } else if (isPacket) {
      baseUnit = "Strip";
      packUnit = "Packet";
      if (quantityUnit !== "pack") setQuantityUnit("pack");
    } else if (isBox) {
      baseUnit = "Ampule";
      packUnit = "Box";
      if (quantityUnit !== "pack") setQuantityUnit("pack");
    } else {
      baseUnit = form.unit || "Unit";
      packUnit = "";
      if (quantityUnit !== "base") setQuantityUnit("base");
    }
    if (baseUnit !== form.baseUnit || packUnit !== form.packUnit) {
      setForm(f => ({ ...f, baseUnit, packUnit }));
    }
  }, [form.unit, form.piecesPerItem, form.packSize, quantityUnit, form.baseUnit, form.packUnit]);

  // Basic auto pricing (pack vs base)
  useEffect(() => {
    const purchase = parseFloat(form.purchasePrice);
    if (!Number.isFinite(purchase) || purchase <= 0) return;
    const factor = form.category === "COSMETICS" ? 1.35 : 1.25;
    const packSize = parseInt(form.packSize || form.piecesPerItem) || 0;
    const isPackContext = form.unit === "Packet" || form.unit === "Box" || packSize > 1;
    if (isPackContext) {
      if (!form.sellingPricePack) {
        const packPrice = Math.round(purchase * factor * 100) / 100;
        setForm(f => ({ ...f, sellingPricePack: String(packPrice), sellingPrice: String(packPrice) }));
      }
      if (packSize > 1 && form.sellingPricePack) {
        const perPiece = Math.ceil((parseFloat(form.sellingPricePack) / packSize) * 100) / 100;
        if (!form.sellingPriceBase) {
          setForm(f => ({ ...f, sellingPriceBase: String(perPiece) }));
        }
      }
    } else {
      if (!form.sellingPriceBase) {
        const basePrice = Math.round(purchase * factor * 100) / 100;
        setForm(f => ({ ...f, sellingPriceBase: String(basePrice), sellingPrice: String(basePrice) }));
      }
    }
  }, [form.purchasePrice, form.category, form.unit, form.packSize, form.piecesPerItem, form.sellingPricePack, form.sellingPriceBase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.medicineName || !form.batchNumber || !form.expiryDate) return;
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.purchasePrice) payload.purchasePrice = 0; // allow zero (will still store)
      // interpret quantity by unit context
      payload.quantity = payload.quantity ? Number(payload.quantity) : 0;
      if (quantityUnit === "pack" && payload.quantity && (payload.packSize || payload.piecesPerItem)) {
        const mult = parseInt(payload.packSize || payload.piecesPerItem) || 0;
        if (mult > 1) {
          payload.initialQuantityUnit = "pack"; // backend logic multiplies if pack context
        }
      }
      const res = await authFetch(`${API}/medicine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Medicine registered");
        setForm(empty);
      } else {
        toast.error(data.message || "Failed to add");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
            <div>
              <h1 className="text-lg font-semibold">Register New Medicine</h1>
              <p className="text-xs text-muted-foreground mt-1">Creates a new central medicine record. Some advanced pricing logic simplified for employee use.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate(-1)} className="px-3 py-2 text-xs rounded border border-border bg-muted hover:bg-muted/80">Back</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-60">
                <Plus className="w-4 h-4" /> {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </header>
          {/* Basic */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Medicine Name *</label>
                <input name="medicineName" value={form.medicineName} onChange={handleChange} required className="w-full px-3 py-2 rounded border border-border bg-background text-sm" placeholder="e.g. Paracetamol" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Brand</label>
                <input name="brand" value={form.brand} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm">
                  {["ANTIBIOTICS","CNS DRUGS","VITAMINS & MINERALS","RESPIRATORY DRUGS","ENT DRUGS","GI DRUGS","ANALGESICS/ANTIHISTAMINS","HORMONES","DERMATOLOGICALS","CVS DRUGS","MISCELLANEOUS","COSMETICS"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Batch Number *</label>
                <input name="batchNumber" value={form.batchNumber} onChange={handleChange} required className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Expiry Date *</label>
                <input type="date" name="expiryDate" value={form.expiryDate} onChange={handleChange} required className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Unit Type</label>
                <select name="unit" value={form.unit} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm">
                  {["Packet","Box","Ampule","Tube","Bottle","Others"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {(form.unit === 'Packet' || form.unit === 'Box') && (
                <div>
                  <label className="block text-xs font-medium mb-1">{form.unit === 'Packet' ? 'Strips per Packet' : 'Ampules per Box'}</label>
                  <input type="number" name="packSize" value={form.packSize} onChange={handleChange} min={1} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
                </div>
              )}
              {!(form.unit === 'Packet' || form.unit === 'Box') && (
                <div>
                  <label className="block text-xs font-medium mb-1">Pieces per Item</label>
                  <input type="number" name="piecesPerItem" value={form.piecesPerItem} onChange={handleChange} min={1} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Quantity ({quantityUnit === 'pack' ? (form.packUnit || 'Pack') : (form.baseUnit || 'Unit')})</label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleChange} min={0} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Purchase Price</label>
                <input type="number" step="0.01" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
              </div>
              {quantityUnit === 'pack' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1">Selling (Pack)</label>
                    <input name="sellingPricePack" value={form.sellingPricePack} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Selling (Base)</label>
                    <input name="sellingPriceBase" value={form.sellingPriceBase} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
                  </div>
                </>
              )}
              {quantityUnit === 'base' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Selling Price</label>
                  <input name="sellingPriceBase" value={form.sellingPriceBase} onChange={handleChange} className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Supplier (select or type new)</label>
                <input value={supplierInput} onChange={e=>{ setSupplierInput(e.target.value); setShowSupplierDrop(true); }} placeholder="Existing or new supplier name" className="w-full px-3 py-2 rounded border border-border bg-background text-sm" />
                {showSupplierDrop && supplierInput && (
                  <div className="mt-1 border border-border rounded bg-popover max-h-40 overflow-auto text-xs">
                    {suppliers.filter(s => (s.supplierName||'').toLowerCase().includes(supplierInput.toLowerCase())).slice(0,15).map(s => (
                      <button key={s._id} type="button" onClick={()=>{ setForm(f=>({...f, supplier: s._id})); setSupplierInput(s.supplierName); setShowSupplierDrop(false); }} className="block w-full text-left px-2 py-1 hover:bg-muted/60">{s.supplierName}</button>
                    ))}
                    <button type="button" onClick={()=>{ setForm(f=>({...f, supplier: supplierInput.trim()})); setShowSupplierDrop(false); }} className="block w-full text-left px-2 py-1 hover:bg-muted/60 text-primary">Use "{supplierInput}"</button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
