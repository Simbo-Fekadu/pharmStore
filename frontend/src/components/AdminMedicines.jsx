"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";

import { getApiBase } from "../api/base";
const API = getApiBase() + "/backend";

const AdminMedicines = () => {
  // Helper: sort medicines by most recent first
  const sortByRecent = (arr) =>
    (arr || []).slice().sort((a, b) => {
      const aT = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const bT = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      return bT - aT;
    });
  const formatBirr = (v) =>
    v == null || v === "" || isNaN(Number(v))
      ? "—"
      : `Br ${Number(v).toFixed(2)}`;
  const sellingValue = (m) => {
    const pp = Number(m.purchasePrice);
    const sp = Number(m.sellingPrice);
    if (!isFinite(pp)) return sp;
    // If missing or clearly a multiplier (<= 3), compute from purchase price
    if (!isFinite(sp) || sp <= 3) {
      // If a valid multiplier present (>= 1), use it; else fallback to defaults by category
      const factor =
        isFinite(sp) && sp >= 1 ? sp : m.category === "Cosmetics" ? 1.35 : 1.25;
      return Math.round(pp * factor * 100) / 100;
    }
    return sp;
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/medicine?includeDeleted=false&withStock=true&storeOnly=true&centralNet=true&initialCurrent=true`
      );
      const data = await res.json();
      if (res.ok && data.success) setList(sortByRecent(data.medicines));
    } catch (err) {
      // Silent failure previously; log for visibility
      console.error("Failed to load medicines", err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    setRole(localStorage.getItem("role"));
  }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("medicine-added", h);
    return () => window.removeEventListener("medicine-added", h);
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
        } catch (err) {
          console.error("Polling refresh failed", err);
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
        fetch(`${API}/location/store`, { credentials: "include" }),
        fetch(`${API}/location/branch`, { credentials: "include" }),
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
        load();
        const med = list.find((x) => x._id === sendForm.medicineId);
        if (med) openHistory(med);
      } else alert(data.message || "Failed to transfer");
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
      if (res.ok && data.success) load();
      else alert(data.message || "Delete failed");
    } catch {
      alert("Network error");
    }
  };

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

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className="p-6 max-w-6xl mx-auto space-y-8">
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    All Medicines
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredList.length} medicine
                    {filteredList.length !== 1 ? "s" : ""} found
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
                    <span className="text-xs text-muted-foreground">
                      Expiry
                    </span>
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
                  <a
                    href="/admin/medicines/add"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Medicine
                  </a>
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
                                <button
                                  onClick={() => softDelete(m._id)}
                                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                                  title="Move to trash"
                                >
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </button>
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
                                    {m.remainingQuantity ??
                                      m.initialQuantity ??
                                      "—"}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">
                                    Purchase
                                  </p>
                                  <p className="text-foreground font-medium">
                                    {formatBirr(m.purchasePrice)}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">
                                    Selling
                                  </p>
                                  <p className="text-foreground font-medium">
                                    {formatBirr(sellingValue(m))}
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
                                    {new Date(
                                      m.expiryDate
                                    ).toLocaleDateString()}
                                  </span>
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
                                    <button
                                      onClick={() => softDelete(m._id)}
                                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                                      title="Move to trash"
                                    >
                                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                                    </button>
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
                                </td>
                              </tr>
                              {isOpen && (
                                <tr key={`${m._id}-details`}>
                                  <td colSpan={7} className="py-0">
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
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Purchase Price:
                                            </span>
                                            <span className="text-foreground font-medium">
                                              {formatBirr(m.purchasePrice)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Selling Price:
                                            </span>
                                            <span className="text-foreground font-medium">
                                              {formatBirr(sellingValue(m))}
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
