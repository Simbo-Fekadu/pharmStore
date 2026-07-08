import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Plus, X } from "lucide-react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
import useToast from "../hooks/useToast";

const API = API_BASE;

const empty = {
  medicineName: "",
  brand: "",
  category: "MISCELLANEOUS",
  unit: "Others",
  baseUnit: "",
  packUnit: "",
  packSize: "",
  piecesPerItem: "",
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

const MedicineAdd = ({ role }) => {
  const isAdmin = role === "admin" || role === "super_admin";
  const [form, setForm] = useState(empty);
  const [quantityUnit, setQuantityUnit] = useState("pack");
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInput, setSupplierInput] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [priceEdited, setPriceEdited] = useState({ pack: false, base: false });
  const [branchId, setBranchId] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [importErr, setImportErr] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      (async () => {
        try {
          const res = await authFetch(`${API}/auth/me`);
          const data = await res.json();
          if (res.ok && data.success) {
            const b = data.user?.branch;
            if (b) setBranchId(typeof b === "object" ? b._id : b);
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        try {
          const res = await authFetch(`${API}/location/store`);
          const data = await res.json();
          if (Array.isArray(data)) setStores(data);
        } catch {
          /* ignore */
        }
      }
      try {
        const res = await authFetch(`${API}/supplier`);
        const data = await res.json();
        if (res.ok && data.success) setSuppliers(data.suppliers || []);
      } catch {
        /* ignore */
      }
    })();
  }, [isAdmin]);

  useEffect(() => {
    const piecesCount = parseInt(form.piecesPerItem) || 0;
    const isPacket = form.unit === "Packet";
    const isBox = form.unit === "Box";

    if (isPacket || isBox || piecesCount > 1) {
      if (quantityUnit !== "pack") setQuantityUnit("pack");
    } else if (quantityUnit !== "base") {
      setQuantityUnit("base");
    }

    let derivedBase;
    let derivedPack;
    if (piecesCount > 1) {
      derivedBase = "Piece";
      derivedPack = "Item";
    } else if (isPacket) {
      derivedBase = "Strip";
      derivedPack = "Packet";
    } else if (isBox) {
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
      if (isAdmin) {
        setPriceEdited({ pack: false, base: false });
      }
    }
  }, [
    form.unit,
    form.piecesPerItem,
    form.packSize,
    form.baseUnit,
    form.packUnit,
    quantityUnit,
    isAdmin,
  ]);

  const ceil2 = (n) => Math.ceil(n * 100) / 100;
  const round2 = (n) => Math.round(n * 100) / 100;

  useEffect(() => {
    const p = parseFloat(form.purchasePrice);
    if (!Number.isFinite(p) || p <= 0) return;
    const factor = form.category === "COSMETICS" ? 1.35 : 1.25;
    const packSizeNum = parseInt(form.packSize || form.piecesPerItem) || 0;
    const isPackContext =
      form.unit === "Packet" || form.unit === "Box" || packSizeNum > 1;

    if (isAdmin) {
      if (!Number.isFinite(p) || p <= 0) {
        const spLegacy = parseFloat(form.sellingPrice);
        const spBase = parseFloat(form.sellingPriceBase);
        const spPack = parseFloat(form.sellingPricePack);
        let source = "";
        let knownSell = NaN;
        if (priceEdited.pack && Number.isFinite(spPack) && spPack > 0) {
          source = "pack";
          knownSell = spPack;
        } else if (priceEdited.base && Number.isFinite(spBase) && spBase > 0) {
          source = "base";
          knownSell = spBase;
        } else if (
          (form.unit === "Packet" || form.unit === "Box") &&
          Number.isFinite(spPack) &&
          spPack > 0
        ) {
          source = "pack";
          knownSell = spPack;
        } else if (Number.isFinite(spBase) && spBase > 0) {
          source = "base";
          knownSell = spBase;
        } else if (Number.isFinite(spLegacy) && spLegacy > 0) {
          source = "legacy";
          knownSell = spLegacy;
        }

        if (Number.isFinite(knownSell) && knownSell > 0) {
          let inferredP;
          if (isPackContext) {
            if (source === "base" && packSizeNum > 0) {
              inferredP =
                Math.round(((knownSell * packSizeNum) / factor) * 100) / 100;
            } else {
              inferredP = Math.round((knownSell / factor) * 100) / 100;
            }
          } else {
            inferredP = Math.round((knownSell / factor) * 100) / 100;
          }
          setForm((prev) => ({ ...prev, purchasePrice: String(inferredP) }));
          return;
        }
      }

      if (!Number.isFinite(p) || p <= 0) return;

      if (isPackContext) {
        if (!priceEdited.pack) {
          const packPrice = round2(p * factor);
          setForm((prev) => ({
            ...prev,
            sellingPricePack: String(packPrice),
            sellingPrice: String(packPrice),
          }));
        }
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
    } else {
      if (isPackContext) {
        if (!form.sellingPricePack) {
          const packPrice = Math.round(p * factor * 100) / 100;
          setForm((f) => ({
            ...f,
            sellingPricePack: String(packPrice),
            sellingPrice: String(packPrice),
          }));
        }
        if (packSize > 1 && form.sellingPricePack) {
          const perPiece =
            Math.ceil((parseFloat(form.sellingPricePack) / packSize) * 100) / 100;
          if (!form.sellingPriceBase) {
            setForm((f) => ({ ...f, sellingPriceBase: String(perPiece) }));
          }
        }
      } else {
        if (!form.sellingPriceBase) {
          const basePrice = Math.round(p * factor * 100) / 100;
          setForm((f) => ({
            ...f,
            sellingPriceBase: String(basePrice),
            sellingPrice: String(basePrice),
          }));
        }
      }
    }
  }, [
    form.purchasePrice,
    form.category,
    form.unit,
    form.packSize,
    form.piecesPerItem,
    form.sellingPrice,
    form.sellingPriceBase,
    form.sellingPricePack,
    priceEdited.pack,
    priceEdited.base,
    isAdmin,
  ]);

  useEffect(() => {
    if (!isAdmin) return;
    const packSizeNum = parseInt(form.packSize || form.piecesPerItem) || 0;
    const isPackContext =
      form.unit === "Packet" || form.unit === "Box" || packSizeNum > 1;
    if (!isPackContext) return;
    if (packSizeNum <= 0) return;
    const spBase = parseFloat(form.sellingPriceBase);
    const spPack = parseFloat(form.sellingPricePack);
    if (priceEdited.base && Number.isFinite(spBase) && spBase > 0) {
      const packPrice = round2(spBase * packSizeNum);
      setForm((prev) => ({
        ...prev,
        sellingPricePack: String(packPrice),
        sellingPrice: String(packPrice),
      }));
    } else if (priceEdited.pack && Number.isFinite(spPack) && spPack > 0) {
      const perPiece = ceil2(spPack / packSizeNum);
      setForm((prev) => ({ ...prev, sellingPriceBase: String(perPiece) }));
    }
  }, [
    form.unit,
    form.packSize,
    form.piecesPerItem,
    priceEdited.base,
    priceEdited.pack,
    form.sellingPriceBase,
    form.sellingPricePack,
    isAdmin,
  ]);

  useEffect(() => {
    if (isAdmin) {
      setPriceEdited({ pack: false, base: false });
    }
  }, [form.purchasePrice, form.category, isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handlePackPriceChange = (e) => {
    const v = e.target.value;
    setForm((prev) => {
      const packSizeNum = parseInt(prev.packSize || prev.piecesPerItem) || 0;
      const next = { ...prev, sellingPricePack: v };
      if (
        (prev.unit === "Packet" || prev.unit === "Box" || packSizeNum > 0) &&
        v !== "" &&
        packSizeNum > 0
      ) {
        const perPiece =
          Math.ceil(((parseFloat(v) || 0) / packSizeNum) * 100) / 100;
        if (Number.isFinite(perPiece) && perPiece > 0)
          next.sellingPriceBase = String(perPiece);
      }
      next.sellingPrice = v;
      return next;
    });
    setPriceEdited((p) => ({ ...p, pack: true }));
  };

  const handleBasePriceChange = (e) => {
    const v = e.target.value;
    setForm((prev) => {
      const packSizeNum = parseInt(prev.packSize || prev.piecesPerItem) || 0;
      const next = { ...prev, sellingPriceBase: v };
      if (
        (prev.unit === "Packet" || prev.unit === "Box" || packSizeNum > 0) &&
        v !== "" &&
        packSizeNum > 0
      ) {
        const packPrice =
          Math.round((parseFloat(v) || 0) * packSizeNum * 100) / 100;
        if (Number.isFinite(packPrice) && packPrice > 0) {
          next.sellingPricePack = String(packPrice);
          next.sellingPrice = String(packPrice);
        }
      } else {
        next.sellingPrice = v;
        next.sellingPricePack = "";
      }
      return next;
    });
    setPriceEdited((p) => ({ ...p, base: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin && (!form.medicineName || !form.batchNumber || !form.expiryDate)) return;
    setSubmitting(true);
    if (isAdmin) {
      setMessage("");
      setIsError(false);
    }
    try {
      let selling = form.sellingPrice;
      const pNum = parseFloat(form.purchasePrice);
      const sBase = parseFloat(form.sellingPriceBase);
      const sPack = parseFloat(form.sellingPricePack);
      const packSizeNum = parseInt(form.packSize || form.piecesPerItem) || 0;
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
        packUnit:
          form.packUnit || (packSizeNum > 1 ? form.unit || "Item" : undefined),
        packSize: packSizeNum > 1 ? packSizeNum : undefined,
        sellingPriceBase:
          Number.isFinite(sBase) && sBase > 0 ? Number(sBase) : undefined,
        sellingPricePack:
          packSizeNum > 1 && Number.isFinite(sPack) && sPack > 0
            ? Number(sPack)
            : undefined,
        initialQuantityUnit:
          form.unit === "Packet" || form.unit === "Box" || packSizeNum > 1
            ? "pack"
            : "base",
      };
      if (!isAdmin) {
        if (!payload.purchasePrice) payload.purchasePrice = 0;
        if (branchId) payload.branchId = branchId;
        const packNum = parseFloat(payload.sellingPricePack);
        if (packNum && packNum > 0 && packNum <= 3) {
          const adjPack = Math.round(pNum * packNum * 100) / 100;
          payload.sellingPricePack = adjPack;
          if (!payload.sellingPrice) payload.sellingPrice = adjPack;
        }
        const baseNum = parseFloat(payload.sellingPriceBase);
        if (baseNum && baseNum > 0 && baseNum <= 3) {
          const adjBase = Math.round(pNum * baseNum * 100) / 100;
          payload.sellingPriceBase = adjBase;
          if (!payload.sellingPrice) payload.sellingPrice = adjBase;
        }
        if (
          quantityUnit === "pack" &&
          payload.quantity &&
          (payload.packSize || payload.piecesPerItem)
        ) {
          const mult = parseInt(payload.packSize || payload.piecesPerItem) || 0;
          if (mult > 1) {
            payload.initialQuantityUnit = "pack";
          }
        }
      }
      if (!payload.storeId || !payload.storeId.trim()) delete payload.storeId;
      if (!payload.supplier || !payload.supplier.trim())
        delete payload.supplier;
      const isEdit = Boolean(editingId);
      const res = await authFetch(
        `${API}/medicine${isEdit ? "/" + editingId : ""}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        if (isAdmin) {
          setMessage(isEdit ? "Medicine updated" : "Medicine added");
          window.dispatchEvent(new CustomEvent("medicine-added"));
          navigate("/admin/medicines");
        } else {
          toast.success("Medicine registered");
          setForm(empty);
        }
      } else {
        if (isAdmin) {
          setMessage(data.message || "Failed");
          setIsError(true);
        } else {
          toast.error(data.message || "Failed to add");
        }
      }
    } catch {
      if (isAdmin) {
        setMessage("Network error");
        setIsError(true);
      } else {
        toast.error("Network error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-6">
            {/* Bulk Import (Upload only) */}
            <section className="space-y-3">
              <header className="border-b border-border pb-1 flex items-center justify-between">
                <h2 className="text-base md:text-lg font-semibold text-foreground">
                  Bulk Import (CSV / Excel)
                </h2>
              </header>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <input
                    type="file"
                    accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Columns: medicineName, brand, category, unit, baseUnit,
                    packUnit, packSize, batchNumber, expiryDate (YYYY-MM-DD),
                    purchasePrice, quantity, sellingPriceBase, sellingPricePack,
                    supplier.
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={!importFile}
                    onClick={async () => {
                      if (!importFile) return;
                      setImportErr(false);
                      setImportMsg("");
                      setImportResults(null);
                      try {
                        const fd = new FormData();
                        fd.append("file", importFile);
                        const res = await authFetch(`${API}/medicine/import`, {
                          method: "POST",
                          body: fd,
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          const okCount =
                            typeof data.imported === "number"
                              ? data.imported
                              : (data.results || []).filter((r) => r.ok).length;
                          setImportMsg(`${okCount} medicines added`);
                          setImportResults(null);
                          window.dispatchEvent(new CustomEvent("medicine-added"));
                        } else {
                          setImportErr(true);
                          const okCount = (data.results || []).filter(
                            (r) => r.ok
                          ).length;
                          const failCount = (data.results || []).length - okCount;
                          setImportMsg(
                            data.message || `Import failed (${failCount} errors)`
                          );
                          setImportResults(data.results || []);
                        }
                      } catch (e) {
                        setImportErr(true);
                        setImportMsg(e.message || "Network error");
                        setImportResults(null);
                      }
                    }}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    Upload File
                  </button>
                </div>
              </div>
              {importMsg && (
                <div
                  className={`text-sm p-2 rounded border ${
                    importErr
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  }`}
                >
                  {importMsg}
                </div>
              )}
              {importResults && importResults.length > 0 && (
                <div className="mt-3 space-y-2 text-xs">
                  {importResults.some((r) => !r.ok) && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded p-2">
                      Some rows failed. Hover over a row to see the raw values.
                      Common causes: missing required fields (medicineName,
                      batchNumber, expiryDate, purchasePrice), invalid date
                      format, non-numeric purchasePrice, header typos.
                    </div>
                  )}
                  <div className="max-h-60 overflow-auto border border-border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="p-1 text-left">#</th>
                          <th className="p-1 text-left">Status</th>
                          <th className="p-1 text-left">Name</th>
                          <th className="p-1 text-left">Batch</th>
                          <th className="p-1 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.slice(0, 100).map((r, i) => {
                          const row = r.row || {};
                          return (
                            <tr
                              key={i}
                              className={`border-t border-border ${
                                r.ok ? "bg-green-500/5" : "bg-destructive/5"
                              }`}
                              title={!r.ok ? JSON.stringify(row, null, 2) : ""}
                            >
                              <td className="p-1 align-top">{i + 1}</td>
                              <td className="p-1 align-top">
                                {r.ok ? "OK" : "FAIL"}
                              </td>
                              <td
                                className="p-1 align-top truncate max-w-[140px]"
                                title={row.medicineName || row.name}
                              >
                                {row.medicineName || row.name || "\u2014"}
                              </td>
                              <td className="p-1 align-top font-mono text-[11px]">
                                {row.batchNumber || "\u2014"}
                              </td>
                              <td className="p-1 align-top text-[11px] text-muted-foreground">
                                {r.ok ? "" : r.error || "Error"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {importResults.length > 100 && (
                    <div className="text-muted-foreground">
                      Showing first 100 rows\u2026
                    </div>
                  )}
                  {importResults.every((r) => !r.ok) && (
                    <div className="text-destructive text-xs font-medium">
                      All rows failed. Double-check header row EXACTLY matches:
                      medicineName, brand, category, unit, baseUnit, packUnit,
                      packSize, batchNumber, expiryDate, purchasePrice, quantity,
                      sellingPriceBase, sellingPricePack, supplier.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setImportResults(null);
                      setImportMsg("");
                      setImportErr(false);
                      setImportFile(null);
                    }}
                    className="inline-flex items-center mt-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded text-muted-foreground border border-border"
                  >
                    Clear Results
                  </button>
                </div>
              )}
            </section>

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
                        "ANTIBIOTICS",
                        "CNS DRUGS",
                        "VITAMINS & MINERALS",
                        "RESPIRATORY DRUGS",
                        "ENT DRUGS",
                        "GI DRUGS",
                        "ANALGESICS/ANTIHISTAMINS",
                        "HORMONES",
                        "DERMATOLOGICALS",
                        "CVS DRUGS",
                        "MISCELLANEOUS",
                        "COSMETICS",
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
                {!(form.unit === "Packet" || form.unit === "Box") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Pieces per Item
                      </label>
                      <input
                        type="number"
                        name="piecesPerItem"
                        value={form.piecesPerItem}
                        onChange={handleChange}
                        min="1"
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        If greater than 1, we treat 1 item as a pack of pieces.
                      </div>
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
                {form.unit === "Packet" ||
                form.unit === "Box" ||
                (parseInt(form.piecesPerItem) || 0) > 1 ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Selling Price (per{" "}
                        {form.unit === "Packet" || form.unit === "Box"
                          ? form.unit
                          : "Item"}
                        )
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
                        {form.unit === "Packet"
                          ? "strip"
                          : form.unit === "Box"
                          ? "ampule"
                          : "piece"}{" "}
                        by dividing and rounding up.
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Selling Price (per{" "}
                        {form.unit === "Packet"
                          ? "Strip"
                          : form.unit === "Box"
                          ? "Ampule"
                          : "Piece"}
                        )
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
                        Changing this will set per-
                        {form.unit === "Packet" || form.unit === "Box"
                          ? form.unit.toLowerCase()
                          : "item"}{" "}
                        by multiplying.
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
                              {s.phoneNumber} {s.address ? `\u2022 ${s.address}` : ""}
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

            {/* Additional Info */}
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
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
            <div>
              <h1 className="text-lg font-semibold">Register New Medicine</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Creates a new central medicine record. Some advanced pricing
                logic simplified for employee use.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-3 py-2 text-xs rounded border border-border bg-muted hover:bg-muted/80"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" /> {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </header>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Basic Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Medicine Name *
                </label>
                <input
                  name="medicineName"
                  value={form.medicineName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                  placeholder="e.g. Paracetamol"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Brand</label>
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                >
                  {[
                    "ANTIBIOTICS",
                    "CNS DRUGS",
                    "VITAMINS & MINERALS",
                    "RESPIRATORY DRUGS",
                    "ENT DRUGS",
                    "GI DRUGS",
                    "ANALGESICS/ANTIHISTAMINS",
                    "HORMONES",
                    "DERMATOLOGICALS",
                    "CVS DRUGS",
                    "MISCELLANEOUS",
                    "COSMETICS",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Batch Number *
                </label>
                <input
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Unit Type
                </label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                >
                  {["Packet", "Box", "Ampule", "Tube", "Bottle", "Others"].map(
                    (u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    )
                  )}
                </select>
              </div>
              {(form.unit === "Packet" || form.unit === "Box") && (
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {form.unit === "Packet"
                      ? "Strips per Packet"
                      : "Ampules per Box"}
                  </label>
                  <input
                    type="number"
                    name="packSize"
                    value={form.packSize}
                    onChange={handleChange}
                    min={1}
                    className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                  />
                </div>
              )}
              {!(form.unit === "Packet" || form.unit === "Box") && (
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Pieces per Item
                  </label>
                  <input
                    type="number"
                    name="piecesPerItem"
                    value={form.piecesPerItem}
                    onChange={handleChange}
                    min={1}
                    className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">
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
                  min={0}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Purchase Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="purchasePrice"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
              </div>
              {quantityUnit === "pack" && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1 flex items-center gap-2">
                      <span>Selling (Pack)</span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        total / {form.packUnit || "pack"}
                      </span>
                      {form.packSize &&
                        form.sellingPricePack &&
                        form.sellingPriceBase && (
                          <span className="text-[10px] text-muted-foreground">
                            {form.packSize} x {form.baseUnit || "unit"}
                          </span>
                        )}
                    </label>
                    <input
                      name="sellingPricePack"
                      value={form.sellingPricePack}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 flex items-center gap-2">
                      <span>Selling (Base)</span>
                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        per {form.baseUnit || "unit"}
                      </span>
                    </label>
                    <input
                      name="sellingPriceBase"
                      value={form.sellingPriceBase}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                    />
                  </div>
                </>
              )}
              {quantityUnit === "base" && (
                <div>
                  <label className="block text-xs font-medium mb-1 flex items-center gap-2">
                    <span>Selling Price</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                      per {form.baseUnit || form.unit || "unit"}
                    </span>
                  </label>
                  <input
                    name="sellingPriceBase"
                    value={form.sellingPriceBase}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Supplier (select or type new)
                </label>
                <input
                  value={supplierInput}
                  onChange={(e) => {
                    setSupplierInput(e.target.value);
                    setShowSupplierDrop(true);
                  }}
                  placeholder="Existing or new supplier name"
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                />
                {showSupplierDrop && supplierInput && (
                  <div className="mt-1 border border-border rounded bg-popover max-h-40 overflow-auto text-xs">
                    {suppliers
                      .filter((s) =>
                        (s.supplierName || "")
                          .toLowerCase()
                          .includes(supplierInput.toLowerCase())
                      )
                      .slice(0, 15)
                      .map((s) => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, supplier: s._id }));
                            setSupplierInput(s.supplierName);
                            setShowSupplierDrop(false);
                          }}
                          className="block w-full text-left px-2 py-1 hover:bg-muted/60"
                        >
                          {s.supplierName}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          supplier: supplierInput.trim(),
                        }));
                        setShowSupplierDrop(false);
                      }}
                      className="block w-full text-left px-2 py-1 hover:bg-muted/60 text-primary"
                    >
                      Use &quot;{supplierInput}&quot;
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default MedicineAdd;
