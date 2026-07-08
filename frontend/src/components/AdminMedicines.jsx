"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import { API_BASE } from "../api/base";
import { ceilCurrency, ceilOrDash } from "../utils/number";
import { sortByRecent, formatBirr, sellingValue, displayQuantity } from "../utils/medicine";
import { authFetch } from "../api/authFetch";
import useToast from "../hooks/useToast";
import useConfirm from "../hooks/useConfirm";
import { usePharmacy } from "../hooks/usePharmacy";
const API = API_BASE;

const AdminMedicines = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const isElectron = typeof window !== "undefined" && !!window.desktop;
  const cfg = isElectron ? window.desktop?.config || {} : {};
  const useRealm = isElectron && cfg?.dataMode === "realm" && cfg?.realm?.appId;

  const displayPrice = (m) => {
    if (m.sellingPriceBase) {
      return `${formatBirr(m.sellingPriceBase)}/${m.baseUnit || "unit"}`;
    }
    return formatBirr(sellingValue(m));
  };
  const displayPurchasePrice = (m) => {
    if (m.purchasePrice) {
      return `${formatBirr(m.purchasePrice)}/${m.packUnit || "packet"}`;
    }
    return "—";
  };
  const formatQuantity = (m, quantity) => {
    if (quantity == null) return "—";
    return m.packSize ? Math.floor(quantity / m.packSize) : quantity;
  };
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyMedicine, setHistoryMedicine] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    medicineId: "",
    storeId: "",
    branchId: "",
    quantity: "",
  });
  const [locations, setLocations] = useState({ stores: [], branches: [] });
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState(null);
  const [exporting, setExporting] = useState(false);
  const isAdminLike = role === "admin" || role === "super_admin";
  // Selection state for bulk actions
  const [selected, setSelected] = useState([]);
  const [deletingMany, setDeletingMany] = useState(false);
  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    medicineName: "",
    brand: "",
    category: "",
    batchNumber: "",
    expiryDate: "",
    purchasePrice: "",
    sellingPrice: "",
  });
  // Excel export (with route diagnostic on 404)
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const qs =
        selectedPharmacyId && role === "super_admin" ? `?selectedPharmacyId=${selectedPharmacyId}` : "";
      const res = await authFetch(`${API}/medicine/export/xlsx${qs}`);
      if (!res.ok) {
        if (res.status === 404) {
          try {
            const routeRes = await authFetch(`${API_BASE}/_routes`);
            if (routeRes.ok) {
              const json = await routeRes.json();
              const found = (json.routes || []).some(
                (r) =>
                  r.path === "/backend/medicine/export/xlsx" &&
                  (r.methods || []).includes("GET")
              );
              if (!found) {
                toast.error(
                  "Export route not active. Restart backend to load latest code."
                );
              } else {
                toast.error(
                  "Export route exists but returned 404 (auth/path issue)."
                );
              }
            } else {
              toast.error("Export 404. Could not inspect backend routes.");
            }
          } catch {
            toast.error("Export 404 and route inspection failed.");
          }
        } else {
          toast.error(`Export failed (${res.status})`);
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medicines_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel exported");
    } catch (e) {
      toast.error(e.message || "Export error");
    } finally {
      setExporting(false);
    }
  };

  // Improved PDF export with robust wrapping and grouping
  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const margin = 28;
      const pageHeight = doc.internal.pageSize.getHeight();
      const headers = [
        "Name",
        "Category",
        "Batch",
        "Expiry",
        "Purchase",
        "Selling",
        "Remaining",
      ];
      const widths = [200, 90, 90, 70, 70, 70, 70];
      const startX = margin;
      let y = margin;
      doc.setFontSize(15);
      doc.setFont(undefined, "bold");
      doc.text("Medicines Report", startX, y);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      y += 10;
      doc.text(`Generated: ${new Date().toLocaleString()}`, startX, y);
      y += 12;
      const lineHeight = 11;
      const cellPaddingY = 4;
      const headerHeight = 20;
      const drawTableHeader = () => {
        // Draw header background blocks first
        let x = startX;
        doc.setDrawColor(60);
        doc.setFillColor(30, 30, 30);
        widths.forEach((w) => {
          doc.rect(x, y, w, headerHeight, "FD");
          x += w;
        });
        // Now write text centered in each cell
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.setTextColor(255);
        x = startX;
        headers.forEach((txt, idx) => {
          const w = widths[idx];
          // Center horizontally & vertically
          const textX = x + w / 2;
          const textY = y + headerHeight / 2 + 3; // slight downward tweak
          doc.text(String(txt || ""), textX, textY, {
            align: "center",
            baseline: "middle",
          });
          x += w;
        });
        // Reset for body
        doc.setTextColor(0);
        doc.setFont(undefined, "normal");
        y += headerHeight;
      };
      const ensureSpace = (needed) => {
        if (y + needed + margin > pageHeight) {
          doc.addPage();
          y = margin;
          doc.setFontSize(11);
          doc.setFont(undefined, "bold");
          doc.text("Medicines Report (cont.)", startX, y);
          doc.setFont(undefined, "normal");
          y += 18;
          drawTableHeader();
        }
      };
      const wrapCell = (text, maxWidth) => {
        if (text == null || text === "") return [""];
        const raw = String(text).replace(/\s+/g, " ").trim();
        if (!raw) return [""];
        const words = raw.split(" ");
        const lines = [];
        let current = "";
        words.forEach((w) => {
          const tentative = current ? current + " " + w : w;
          if (doc.getTextWidth(tentative) > maxWidth - 8) {
            if (current) lines.push(current);
            if (!current && doc.getTextWidth(w) > maxWidth - 8) {
              let slice = "";
              for (const ch of w) {
                const test = slice + ch;
                if (doc.getTextWidth(test) > maxWidth - 8) {
                  if (slice) lines.push(slice);
                  slice = ch;
                } else slice += ch;
              }
              current = slice;
            } else {
              current = w;
            }
          } else {
            current = tentative;
          }
        });
        if (current) lines.push(current);
        return lines.length ? lines : [""];
      };
      // Grouping
      const today = new Date();
      const nearCutoff = new Date(today.getTime() + 30 * 86400000);
      const active = [],
        near = [],
        expired = [];
      list.forEach((m) => {
        if (!m.expiryDate) return active.push(m);
        const exp = new Date(m.expiryDate);
        if (exp < today) expired.push(m);
        else if (exp <= nearCutoff) near.push(m);
        else active.push(m);
      });
      const groups = [
        {
          title: `Active (${active.length})`,
          data: active,
          color: [34, 139, 34],
        },
        {
          title: `Near Expiry ≤30d (${near.length})`,
          data: near,
          color: [218, 165, 32],
        },
        {
          title: `Expired (${expired.length})`,
          data: expired,
          color: [178, 34, 34],
        },
      ].filter((g) => g.data.length);
      const drawGroupHeader = (g) => {
        const gh = 20;
        ensureSpace(gh + headerHeight);
        doc.setFillColor(...g.color);
        doc.setDrawColor(...g.color);
        doc.setTextColor(255);
        doc.rect(
          startX,
          y,
          widths.reduce((a, b) => a + b, 0),
          gh,
          "FD"
        );
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(g.title, startX + 8, y + 13);
        doc.setFont(undefined, "normal");
        doc.setTextColor(0);
        y += gh;
        drawTableHeader();
      };
      groups.forEach((group) => {
        drawGroupHeader(group);
        group.data.forEach((m) => {
          const expStr = m.expiryDate
            ? new Date(m.expiryDate).toISOString().slice(0, 10)
            : "";
          const purchase = displayPurchasePrice(m);
          const selling = displayPrice(m);
          const remaining = displayQuantity(m);
          const rowValues = [
            m.medicineName || "",
            m.category || "",
            m.batchNumber || "",
            expStr,
            purchase,
            selling,
            remaining,
          ];
          const wrapped = rowValues.map((v, i) => wrapCell(v, widths[i]));
          const linesMax = Math.max(...wrapped.map((w) => w.length));
          const rowHeight = Math.max(
            headerHeight - 2,
            linesMax * lineHeight + cellPaddingY * 2
          );
          ensureSpace(rowHeight);
          let x = startX;
          wrapped.forEach((lines, i) => {
            doc.setDrawColor(180);
            doc.rect(x, y, widths[i], rowHeight);
            lines.forEach((ln, li) => {
              const textY = y + cellPaddingY + 8 + li * lineHeight;
              doc.text(ln, x + 4, textY);
            });
            x += widths[i];
          });
          y += rowHeight;
        });
      });
      doc.save(`medicines_${Date.now()}.pdf`);
      toast.success("PDF exported");
    } catch (e) {
      toast.error(e.message || "PDF export error");
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (useRealm && window.desktop?.realm) {
        const arr = await window.desktop.realm.listMedicines();
        setList(sortByRecent(arr || []));
      } else {
        const qs = new URLSearchParams({
          includeDeleted: "false",
          withStock: "true",
          centralNet: "true",
          initialCurrent: "true",
        });
        if (role === "super_admin" && selectedPharmacyId)
          qs.set("selectedPharmacyId", selectedPharmacyId);
        const res = await authFetch(`${API}/medicine?${qs.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) setList(sortByRecent(data.medicines));
      }
    } catch (err) {
      // Silent failure previously; log for visibility
      console.error("Failed to load medicines", err);
    } finally {
      setLoading(false);
    }
  }, [useRealm, role, selectedPharmacyId]);
  useEffect(() => {
    // set role first so we know whether to include selectedPharmacyId
    const r = localStorage.getItem("role");
    setRole(r);
  }, []);
  const { pharmacies, selectedPharmacyId, setSelectedPharmacyId } = usePharmacy();

  // Load medicines when role/pharmacy changes
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("medicine-added", h);
    return () => window.removeEventListener("medicine-added", h);
  }, [load]);
  // Removed auto-polling to prevent periodic refreshes
  // Optionally refresh on window focus for a light-touch UX
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Keep selection in sync with current list (drop ids that no longer exist)
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => list.some((x) => x._id === id)));
  }, [list]);

  const openHistory = async (m) => {
    setHistoryMedicine(m);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await authFetch(
        `${API}/inventory/ledger?medicineId=${m._id}&limit=100`
      );
      const data = await res.json();
      if (res.ok && data.success) setHistory(data.entries || []);
      else setHistory([]);
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
      const [sRes, bRes] = await Promise.all([
        authFetch(`${API}/location/store`),
        authFetch(`${API}/location/branch`),
      ]);
      const stores = await sRes.json();
      const branches = await bRes.json();
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
      const res = await authFetch(`${API}/inventory/transfer/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        load();
        const med = list.find((x) => x._id === sendForm.medicineId);
        if (med) openHistory(med);
        toast.success("Transfer completed");
      } else toast.error(data.message || "Failed to transfer");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };
  const softDelete = async (id) => {
    const ok = await confirm({
      title: "Move to trash?",
      message: "You can restore from Trash later.",
      confirmText: "Move to Trash",
      tone: "danger",
    });
    if (!ok) return;
    try {
      if (useRealm && window.desktop?.realm) {
        await window.desktop.realm.softDeleteMedicine(id);
        setList((ls) => ls.filter((m) => m._id !== id));
        toast.success("Moved to trash");
      } else {
        const qs =
          selectedPharmacyId && role === "super_admin"
            ? `?selectedPharmacyId=${selectedPharmacyId}`
            : "";
        const res = await authFetch(`${API}/medicine/${id}${qs}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          load();
          toast.success("Moved to trash");
        } else toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // (moved) bulk soft delete helpers are defined below, after visibleList is computed

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
    setSelected([]);
  }, [search, categoryFilter, expiryFilter, list.length]);

  // Bulk soft delete helpers (now that visibleList is defined)
  const visibleIds = (arr) => arr.map((m) => m._id);
  const isAllSelected =
    visibleList.length > 0 &&
    visibleList.every((m) => selected.includes(m._id));
  const toggleSelectAll = () => {
    const ids = visibleIds(visibleList);
    if (isAllSelected) {
      // remove only currently visible ids from selection
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };
  const toggleOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const bulkSoftDelete = async () => {
    if (!selected.length) return;
    const ok = await confirm({
      title: `Move ${selected.length} selected to trash?`,
      message: "You can restore items later from Trash.",
      confirmText: "Move to Trash",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingMany(true);
    const okIds = [];
    try {
      if (useRealm && window.desktop?.realm) {
        for (const id of selected) {
          try {
            await window.desktop.realm.softDeleteMedicine(id);
            okIds.push(id);
          } catch {
            // continue on failure
          }
        }
      } else {
        for (const id of selected) {
          try {
            const qs =
              selectedPharmacyId && role === "super_admin"
                ? `?selectedPharmacyId=${selectedPharmacyId}`
                : "";
            const res = await authFetch(`${API}/medicine/${id}${qs}`, {
              method: "DELETE",
            });
            const data = await res.json();
            if (res.ok && data.success) okIds.push(id);
          } catch {
            // continue on failure
          }
        }
      }
      if (okIds.length) {
        // Optimistic removal; also refresh for any computed fields
        setList((ls) => ls.filter((x) => !okIds.includes(x._id)));
        setSelected((prev) => prev.filter((id) => !okIds.includes(id)));
        toast.success(`Moved ${okIds.length} item(s) to trash`);
      }
      const failed = selected.length - okIds.length;
      if (failed > 0) toast.error(`${failed} deletion(s) failed`);
    } finally {
      setDeletingMany(false);
      // Refresh to keep stock metrics aligned
      load();
    }
  };

  // Inline edit helpers
  const fmtDateInput = (d) => {
    try {
      if (!d) return "";
      const q = new Date(d);
      if (Number.isNaN(q.getTime())) return "";
      return new Date(q.getTime() - q.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
    } catch {
      return "";
    }
  };
  const startEdit = (m) => {
    setEditingId(m._id);
    setEditForm({
      medicineName: m.medicineName || "",
      brand: m.brand || "",
      category: m.category || "",
      batchNumber: m.batchNumber || "",
      expiryDate: fmtDateInput(m.expiryDate),
      purchasePrice: m.purchasePrice ?? "",
      sellingPrice: m.sellingPrice ?? "",
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      medicineName: "",
      brand: "",
      category: "",
      batchNumber: "",
      expiryDate: "",
      purchasePrice: "",
      sellingPrice: "",
    });
  };
  const saveEdit = async (m) => {
    try {
      const payload = {
        medicineName: editForm.medicineName?.trim(),
        brand: editForm.brand?.trim() || undefined,
        category: editForm.category,
        batchNumber: editForm.batchNumber?.trim(),
        expiryDate: editForm.expiryDate
          ? new Date(editForm.expiryDate).toISOString()
          : undefined,
        purchasePrice:
          editForm.purchasePrice === "" || editForm.purchasePrice == null
            ? undefined
            : Number(editForm.purchasePrice),
        sellingPrice:
          editForm.sellingPrice === "" || editForm.sellingPrice == null
            ? undefined
            : Number(editForm.sellingPrice),
      };
      const qs =
        selectedPharmacyId && role === "super_admin" ? `?selectedPharmacyId=${selectedPharmacyId}` : "";
      const res = await authFetch(`${API}/medicine/${m._id}${qs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Medicine updated");
        cancelEdit();
        load();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (e) {
      toast.error(e.message || "Network error");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-6 max-w-6xl mx-auto space-y-8">
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    All Medicines
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredList.length} medicine
                    {filteredList.length !== 1 ? "s" : ""} found
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search medicines..."
                      className="pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-auto"
                    >
                      <option value="all">All Categories</option>
                      {uniqueCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-muted-foreground">
                      Expiry
                    </span>
                    <select
                      value={expiryFilter}
                      onChange={(e) => setExpiryFilter(e.target.value)}
                      className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-auto"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="expiring">Expiring ≤30d</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={load}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-muted hover:bg-muted/80 disabled:opacity-50 text-foreground rounded-lg border border-border"
                      title="Refresh list"
                    >
                      Refresh
                    </button>
                    {role === "super_admin" && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground">
                          Pharmacy
                        </span>
                        <select
                          value={selectedPharmacyId}
                          onChange={(e) => setSelectedPharmacyId(e.target.value)}
                          className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-auto"
                        >
                          {pharmacies.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
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
                        className="px-3 py-2 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={exportExcel}
                      disabled={exporting}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg"
                      title="Export Excel (Active / NearExpiry / Expired)"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button
                      type="button"
                      onClick={exportPdf}
                      disabled={exporting}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-secondary-foreground rounded-lg"
                      title="Export PDF"
                    >
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    {isAdminLike && (
                      <button
                        type="button"
                        onClick={bulkSoftDelete}
                        disabled={!selected.length || deletingMany}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-lg disabled:opacity-50"
                        title="Move selected to trash"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingMany
                          ? "Deleting..."
                          : `Delete Selected (${selected.length})`}
                      </button>
                    )}
                  </div>
                  <Link
                    to="/admin/medicines/add"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4" /> Add Medicine
                  </Link>
                </div>
              </div>
            </div>
            <div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading medicines...
                  </div>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-muted-foreground">
                    {search ||
                    categoryFilter !== "all" ||
                    expiryFilter !== "all"
                      ? "No medicines match your search criteria"
                      : "No medicines found"}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile (cards) */}
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
                                onClick={() =>
                                  setOpenRow(isOpen ? null : m._id)
                                }
                                className="text-left w-full"
                              >
                                <div className="flex items-center gap-2">
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <input
                                    type="checkbox"
                                    className="accent-[var(--brand)] mr-1"
                                    checked={selected.includes(m._id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleOne(m._id);
                                    }}
                                    aria-label={`Select ${m.medicineName}`}
                                  />
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
                                    {new Date(
                                      m.expiryDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </button>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <button
                                onClick={() => openHistory(m)}
                                className="px-2 py-1 text-[11px] bg-muted hover:bg-muted/80 text-muted-foreground rounded border border-border transition-colors"
                              >
                                History
                              </button>
                              <div className="flex items-center gap-1">
                                {isAdminLike && (
                                  <button
                                    onClick={() => softDelete(m._id)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title="Move to trash"
                                  >
                                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                )}
                                {(role === "admin" ||
                                  role === "inventory_manager") && (
                                  <button
                                    onClick={() => openSend(m)}
                                    className="px-2 py-1 text-[11px] bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded transition-colors"
                                  >
                                    Send
                                  </button>
                                )}
                              </div>
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
                                    {displayQuantity(m)}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">
                                    Purchase
                                  </p>
                                  <p className="text-foreground font-medium">
                                    {displayPurchasePrice(m)}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">
                                    Selling
                                  </p>
                                  <p className="text-foreground font-medium">
                                    {displayPrice(m)}
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
                              {m.supplier && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">
                                      Supplier
                                    </p>
                                    <p className="text-foreground font-medium break-words">
                                      {m.supplier.supplierName || "—"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-muted-foreground">
                                      Phone
                                    </p>
                                    <p className="text-foreground">
                                      {m.supplier.phoneNumber || "—"}
                                    </p>
                                  </div>
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
                          <th className="text-left py-3 px-4 font-medium text-foreground w-8">
                            <input
                              type="checkbox"
                              className="accent-[var(--brand)]"
                              checked={isAllSelected}
                              onChange={toggleSelectAll}
                              aria-label="Select all on page"
                            />
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
                                  <input
                                    type="checkbox"
                                    className="accent-[var(--brand)]"
                                    checked={selected.includes(m._id)}
                                    onChange={() => toggleOne(m._id)}
                                    aria-label={`Select ${m.medicineName}`}
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  {editingId === m._id ? (
                                    <input
                                      value={editForm.medicineName}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          medicineName: e.target.value,
                                        }))
                                      }
                                      className="px-2 py-1 rounded bg-background border border-border text-foreground w-48"
                                    />
                                  ) : (
                                    <div className="font-medium text-foreground">
                                      {m.medicineName}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {editingId === m._id ? (
                                    <input
                                      value={editForm.brand}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          brand: e.target.value,
                                        }))
                                      }
                                      className="px-2 py-1 rounded bg-background border border-border text-foreground w-40"
                                    />
                                  ) : (
                                    m.brand || "—"
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {editingId === m._id ? (
                                    <select
                                      value={editForm.category}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          category: e.target.value,
                                        }))
                                      }
                                      className="px-2 py-1 rounded bg-background border border-border text-foreground"
                                    >
                                      {[
                                        ...new Set([
                                          m.category,
                                          ...uniqueCategories.filter(Boolean),
                                        ]),
                                      ].map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                      {m.category}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground font-mono text-sm">
                                  {editingId === m._id ? (
                                    <input
                                      value={editForm.batchNumber}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          batchNumber: e.target.value,
                                        }))
                                      }
                                      className="px-2 py-1 rounded bg-background border border-border text-foreground w-36"
                                    />
                                  ) : (
                                    m.batchNumber
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {editingId === m._id ? (
                                    <input
                                      type="date"
                                      value={editForm.expiryDate}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          expiryDate: e.target.value,
                                        }))
                                      }
                                      className="px-2 py-1 rounded bg-background border border-border text-foreground"
                                    />
                                  ) : (
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        isExpiringSoon
                                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                          : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                      }`}
                                    >
                                      {new Date(
                                        m.expiryDate
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => openHistory(m)}
                                      className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded border border-border transition-colors"
                                      title="View history"
                                    >
                                      History
                                    </button>
                                    {editingId === m._id ? (
                                      <>
                                        <button
                                          onClick={() => saveEdit(m)}
                                          className="px-2 py-1 text-xs bg-green-600/20 border border-green-500/30 text-green-500 rounded"
                                          title="Save changes"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="px-2 py-1 text-xs bg-muted border border-border rounded"
                                          title="Cancel"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      isAdminLike && (
                                        <button
                                          onClick={() => startEdit(m)}
                                          className="px-2 py-1 text-xs bg-muted border border-border rounded"
                                          title="Edit inline"
                                        >
                                          Edit
                                        </button>
                                      )
                                    )}
                                    {isAdminLike && (
                                      <button
                                        onClick={() => softDelete(m._id)}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                        title="Move to trash"
                                      >
                                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                                      </button>
                                    )}
                                    {(role === "admin" ||
                                      role === "inventory_manager") && (
                                      <button
                                        onClick={() => openSend(m)}
                                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded transition-colors"
                                        title="Send to branch"
                                      >
                                        Send
                                      </button>
                                    )}
                                  </div>
                                  {editingId === m._id && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                      <label className="flex items-center gap-1">
                                        <span className="text-muted-foreground">
                                          Purchase
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editForm.purchasePrice}
                                          onChange={(e) =>
                                            setEditForm((f) => ({
                                              ...f,
                                              purchasePrice: e.target.value,
                                            }))
                                          }
                                          className="px-2 py-1 rounded bg-background border border-border text-foreground w-28"
                                        />
                                      </label>
                                      <label className="flex items-center gap-1">
                                        <span className="text-muted-foreground">
                                          Selling
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editForm.sellingPrice}
                                          onChange={(e) =>
                                            setEditForm((f) => ({
                                              ...f,
                                              sellingPrice: e.target.value,
                                            }))
                                          }
                                          className="px-2 py-1 rounded bg-background border border-border text-foreground w-28"
                                        />
                                      </label>
                                    </div>
                                  )}
                                </td>
                              </tr>
                              {isOpen && (
                                <tr key={`${m._id}-details`}>
                                  <td colSpan={8} className="py-0">
                                    <div className="bg-muted/30 p-6 border-t border-border">
                                      <div className="grid md:grid-cols-3 gap-6 text-sm">
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                            General Information
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
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Expiry:
                                            </span>
                                            <span className="text-foreground">
                                              {new Date(
                                                m.expiryDate
                                              ).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                            Inventory & Pricing
                                          </h4>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Original Initial:
                                            </span>
                                            <span className="text-foreground">
                                              {formatQuantity(
                                                m,
                                                m.originalInitialQuantity
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Sent Out:
                                            </span>
                                            <span className="text-foreground">
                                              {formatQuantity(m, m.sentOut)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Remaining:
                                            </span>
                                            <span className="text-foreground font-medium">
                                              {displayQuantity(m)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Purchase Price:
                                            </span>
                                            <span className="text-foreground font-medium">
                                              {displayPurchasePrice(m)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Selling Price:
                                            </span>
                                            <span className="text-foreground font-medium">
                                              {displayPrice(m)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                            Supplier Information
                                          </h4>
                                          {m.supplier ? (
                                            <>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                  Name:
                                                </span>
                                                <span className="text-foreground">
                                                  {m.supplier.supplierName ||
                                                    "—"}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                  Phone:
                                                </span>
                                                <span className="text-foreground">
                                                  {m.supplier.phoneNumber ||
                                                    "—"}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                  Address:
                                                </span>
                                                <span
                                                  className="text-foreground max-w-32 truncate"
                                                  title={m.supplier.address}
                                                >
                                                  {m.supplier.address || "—"}
                                                </span>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-muted-foreground">
                                              No supplier info
                                            </div>
                                          )}
                                        </div>
                                        {m.description && (
                                          <div className="md:col-span-3 space-y-2">
                                            <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">
                                              Description
                                            </h4>
                                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                              {m.description}
                                            </p>
                                          </div>
                                        )}
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
      </div>
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card text-foreground rounded-xl border border-border shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Transaction History — {historyMedicine?.medicineName}
                </h3>
                <button
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close history"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
              {historyLoading ? (
                <div className="text-muted-foreground text-sm">Loading...</div>
              ) : history.length === 0 ? (
                <div className="text-muted-foreground text-sm">No history</div>
              ) : (
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="text-left bg-muted/50 text-muted-foreground">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Qty</th>
                        <th className="py-2 pr-3">Location</th>
                        <th className="py-2 pr-3">Ref</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      {history.map((h) => (
                        <tr key={h._id} className="border-t border-border">
                          <td className="py-1.5 pr-3">
                            {new Date(h.createdAt).toLocaleString()}
                          </td>
                          <td className="py-1.5 pr-3">{h.transactionType}</td>
                          <td className="py-1.5 pr-3">{h.quantity}</td>
                          <td className="py-1.5 pr-3">
                            {h.locationId?.name || "-"}
                          </td>
                          <td className="py-1.5 pr-3 leading-tight">
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
      {sendOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card text-foreground rounded-xl border border-border shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Send to Branch</h3>
                <button
                  onClick={() => setSendOpen(false)}
                  aria-label="Close send form"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={submitSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    From Store
                  </label>
                  <select
                    value={sendForm.storeId}
                    onChange={(e) =>
                      setSendForm((s) => ({ ...s, storeId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select store</option>
                    {(locations.stores || []).map((s) => (
                      <option
                        key={s._id}
                        value={s._id}
                        className="bg-card text-foreground"
                      >
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    To Branch
                  </label>
                  <select
                    value={sendForm.branchId}
                    onChange={(e) =>
                      setSendForm((s) => ({ ...s, branchId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select branch</option>
                    {(locations.branches || []).map((b) => (
                      <option
                        key={b._id}
                        value={b._id}
                        className="bg-card text-foreground"
                      >
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sendForm.quantity}
                    onChange={(e) =>
                      setSendForm((s) => ({ ...s, quantity: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSendOpen(false)}
                    className="flex-1 px-4 py-2 rounded bg-muted hover:bg-muted/80 text-foreground border border-border text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-sm disabled:opacity-60 transition-colors"
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
