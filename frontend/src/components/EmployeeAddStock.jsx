import React, { useEffect, useState, useCallback } from "react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
import useToast from "../hooks/useToast";
import { Search, Plus, Trash2, AlertCircle } from "lucide-react";

const API = API_BASE;

// Employee self-service add stock UI (single + batch)
// Utilizes endpoints: POST /inventory/branch/add-self and /inventory/branch/add-self/batch
const EmployeeAddStock = () => {
  const toast = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [search, setSearch] = useState("");
  const [single, setSingle] = useState({
    medicineId: "",
    quantity: "",
    reason: "",
  });
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Batch state
  const [rows, setRows] = useState([
    { id: 1, medicineId: "", quantity: "", reason: "" },
  ]);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState(null); // {results: []}

  const loadMedicines = useCallback(async () => {
    setLoadingMeds(true);
    try {
      // fetch medicines with central stock info (storeOnly & withStock flags used elsewhere)
      const res = await authFetch(
        `${API}/medicine?includeDeleted=false&withStock=true&centralNet=true&initialCurrent=true`
      );
      const data = await res.json();
      if (res.ok && data.success) setMedicines(data.medicines || []);
    } catch {
      // Silently ignore network errors; UI will just show empty list
    } finally {
      setLoadingMeds(false);
    }
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const filteredMeds = medicines.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.medicineName || "").toLowerCase().includes(q) ||
      (m.brand || "").toLowerCase().includes(q) ||
      (m.batchNumber || "").toLowerCase().includes(q)
    );
  });

  const submitSingle = async (e) => {
    e.preventDefault();
    if (!single.medicineId || !single.quantity) return;
    setSubmittingSingle(true);
    try {
      const res = await authFetch(`${API}/inventory/branch/add-self`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: single.medicineId,
          quantity: Number(single.quantity),
          reason: single.reason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Stock added to branch");
        setSingle({ medicineId: "", quantity: "", reason: "" });
        loadMedicines();
      } else {
        toast.error(data.message || "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmittingSingle(false);
    }
  };

  const updateRow = (id, patch) => {
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };
  const addRow = () => {
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    setRows((r) => [
      ...r,
      { id: maxId, medicineId: "", quantity: "", reason: "" },
    ]);
  };
  const removeRow = (id) => {
    setRows((r) => r.filter((row) => row.id !== id));
  };

  const submitBatch = async (e) => {
    e.preventDefault();
    const items = rows
      .filter((r) => r.medicineId && r.quantity && Number(r.quantity) > 0)
      .map((r) => ({
        medicineId: r.medicineId,
        quantity: Number(r.quantity),
        reason: r.reason || undefined,
      }));
    if (!items.length) return toast.error("No valid rows");
    setSubmittingBatch(true);
    setBatchResult(null);
    try {
      const res = await authFetch(`${API}/inventory/branch/add-self/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (res.status === 207 && data.results) {
        setBatchResult(data);
        const okCount = data.results.filter((r) => r.success).length;
        toast.success(
          `Batch processed: ${okCount}/${data.results.length} succeeded`
        );
        loadMedicines();
      } else if (res.ok && data.success) {
        toast.success("Batch processed");
        setBatchResult(data);
        loadMedicines();
      } else {
        toast.error(data.message || "Batch failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmittingBatch(false);
    }
  };

  const medOptions = (value, onChange) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs focus:outline-none"
    >
      <option value="">Select medicine</option>
      {filteredMeds.map((m) => (
        <option key={m._id} value={m._id}>
          {m.medicineName} {m.brand ? `- ${m.brand}` : ""}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-10">
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-6 border-b border-border flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add Stock (Single)</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Creates a synthetic transfer from central store to your branch.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine..."
              className="pl-7 pr-3 py-1.5 w-full rounded border border-border bg-background text-sm"
            />
          </div>
        </div>
        <form onSubmit={submitSingle} className="p-6 space-y-4">
          {loadingMeds && (
            <div className="text-xs text-muted-foreground">
              Loading medicines...
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              {medOptions(single.medicineId, (v) =>
                setSingle((s) => ({ ...s, medicineId: v }))
              )}
            </div>
            <div>
              <input
                type="number"
                min={1}
                value={single.quantity}
                onChange={(e) =>
                  setSingle((s) => ({ ...s, quantity: e.target.value }))
                }
                placeholder="Quantity"
                className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-sm"
                required
              />
            </div>
            <div>
              <input
                value={single.reason}
                onChange={(e) =>
                  setSingle((s) => ({ ...s, reason: e.target.value }))
                }
                placeholder="Reason / note (optional)"
                className="w-full px-2 py-1.5 rounded border border-border bg-background text-foreground text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submittingSingle}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />{" "}
              {submittingSingle ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() =>
                setSingle({ medicineId: "", quantity: "", reason: "" })
              }
              className="px-4 py-2 rounded bg-muted text-foreground text-sm"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-6 border-b border-border flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Batch Add</h2>
            <p className="text-xs text-muted-foreground">
              Submit multiple transfers in one request (partial success
              supported).
            </p>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Ensure central stock is
            sufficient for each line.
          </div>
        </div>
        <form onSubmit={submitBatch} className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-2 py-2 font-medium">Medicine</th>
                  <th className="text-left px-2 py-2 font-medium w-28">Qty</th>
                  <th className="text-left px-2 py-2 font-medium">Reason</th>
                  <th className="text-left px-2 py-2 font-medium w-10"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-2 py-1.5 min-w-[220px]">
                      {medOptions(r.medicineId, (v) =>
                        updateRow(r.id, { medicineId: v })
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={r.quantity}
                        onChange={(e) =>
                          updateRow(r.id, { quantity: e.target.value })
                        }
                        className="w-full px-2 py-1.5 border border-border rounded bg-background"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={r.reason}
                        onChange={(e) =>
                          updateRow(r.id, { reason: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-2 py-1.5 border border-border rounded bg-background"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-rose-500"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-2 rounded bg-muted text-foreground text-xs inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Row
            </button>
            <button
              type="submit"
              disabled={submittingBatch}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submittingBatch ? "Processing..." : "Submit Batch"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRows([{ id: 1, medicineId: "", quantity: "", reason: "" }]);
                setBatchResult(null);
              }}
              className="px-3 py-2 rounded bg-muted text-foreground text-xs"
            >
              Reset
            </button>
          </div>
          {batchResult && (
            <div className="mt-4 border-t border-border pt-4 text-xs space-y-2">
              <h4 className="font-semibold">Batch Results</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {batchResult.results.map((r, i) => {
                  const med = medicines.find((m) => m._id === r.medicineId);
                  return (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded flex justify-between items-center text-[11px] ${
                        r.success
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <span className="truncate mr-2">
                        {med ? med.medicineName : r.medicineId}
                      </span>
                      <span>{r.success ? "OK" : r.error || "Failed"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeAddStock;
