import { useEffect, useState } from "react";
import { ceilOrDash, ceilCurrency } from "../utils/number";

import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
const API = API_BASE;

const BranchRequest = () => {
  const [medicines, setMedicines] = useState([]);
  // branches removed; single branch derived from session
  const [selectedMed, setSelectedMed] = useState(null);
  const [centralAvailable, setCentralAvailable] = useState(null);
  const [noBalanceRecord, setNoBalanceRecord] = useState(false);
  const [form, setForm] = useState({
    medicineId: "",
    branchId: "",
    quantity: "",
    batchNumber: "",
    reason: "",
  });
  const branchDetected = !!form.branchId;
  const [recentRequests, setRecentRequests] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        authFetch(`${API}/medicine`),
        authFetch(`${API}/inventory/request`),
      ]);
      const mData = await mRes.json();
      const rData = await rRes.json();
      setMedicines(mData.medicines || []);
      if (rData.success) setRecentRequests(rData.requests || []);
    } catch (err) {
      console.warn("Load error", err);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  // Resolve user's branch from stored session
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.branch) {
          setForm((p) => ({ ...p, branchId: u.branch._id || u.branch }));
        } else if (Array.isArray(u.branches) && u.branches.length === 1) {
          // legacy backward compatibility
          setForm((p) => ({
            ...p,
            branchId: u.branches[0]._id || u.branches[0],
          }));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // When medicine changes, fetch central stock & set description panel
  useEffect(() => {
    if (!form.medicineId) {
      setSelectedMed(null);
      setCentralAvailable(null);
      setNoBalanceRecord(false);
      return;
    }
    const med = medicines.find((m) => m._id === form.medicineId);
    setSelectedMed(med || null);
    // Fetch accurate central stock for this medicine (backend aggregates and falls back to legacy if needed)
    authFetch(`${API}/inventory/stock/central?medicineId=${form.medicineId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && typeof data.available === "number") {
          setCentralAvailable(data.available);
          setNoBalanceRecord(data.source === "none");
        } else {
          setCentralAvailable(null);
          setNoBalanceRecord(false);
        }
      })
      .catch(() => {
        setCentralAvailable(null);
        setNoBalanceRecord(false);
      });
  }, [form.medicineId, medicines]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    // Frontend validation for available stock
    if (
      centralAvailable != null &&
      Number(form.quantity) > Number(centralAvailable) &&
      Number(centralAvailable) > 0
    ) {
      setMessage(`Cannot request above available (${centralAvailable})`);
      setIsError(true);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await authFetch(`${API}/inventory/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          medicineId: form.medicineId,
          quantity: Number(form.quantity),
          batchNumber: form.batchNumber || undefined,
          reason: form.reason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Request submitted");
        setForm((prev) => ({
          medicineId: "",
          branchId: prev.branchId, // keep detected branch
          quantity: "",
          batchNumber: "",
          reason: "",
        }));
        setSelectedMed(null);
        setCentralAvailable(null);
        load();
      } else {
        setMessage(data.message || "Failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    }
  };

  const cancel = async (id) => {
    if (!id) return;
    try {
      const res = await authFetch(`${API}/inventory/request/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Request cancelled");
        setIsError(false);
        load();
      } else {
        setMessage(data.message || "Cancel failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Branch Request</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>
      <form
        onSubmit={submit}
        className="space-y-5 max-w-xl bg-white/10 p-6 rounded-xl border border-white/10 backdrop-blur-sm"
      >
        <div className="space-y-3">
          <select
            name="medicineId"
            value={form.medicineId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
          >
            <option value="">
              {loading ? "Loading medicines..." : "Select Medicine"}
            </option>
            {medicines.map((m) => (
              <option key={m._id} value={m._id}>
                {m.medicineName}
                {m.brand ? " - " + m.brand : ""}
              </option>
            ))}
          </select>
          {/* Branch selection removed; derived from session */}
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            required
            placeholder="Quantity"
            className="w-full px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
          />
          <input
            name="batchNumber"
            value={form.batchNumber}
            onChange={handleChange}
            placeholder="Batch (optional)"
            className="w-full px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
          />
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Reason (optional)"
            className="w-full px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
          />
        </div>
        <button
          disabled={!branchDetected}
          className="px-5 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] rounded text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Request
        </button>
        {!branchDetected && (
          <div className="text-xs text-amber-300">
            No branch linked to your account. Re-login or ask admin to assign a
            branch.
          </div>
        )}
        {message && (
          <div
            className={`text-sm ${isError ? "text-red-300" : "text-green-300"}`}
          >
            {message}
          </div>
        )}
        {selectedMed && (
          <div className="mt-4 p-3 rounded bg-white/5 border border-white/10 text-xs space-y-1 text-white/70">
            <div className="font-semibold text-white/90">
              {selectedMed.medicineName}{" "}
              {selectedMed.brand && `• ${selectedMed.brand}`}
            </div>
            <div>Category: {selectedMed.category}</div>
            <div>Purchase Price: {ceilCurrency(selectedMed.purchasePrice)}</div>
            {selectedMed.sellingPrice && (
              <div>Selling Price: {ceilCurrency(selectedMed.sellingPrice)}</div>
            )}
            {selectedMed.supplier && (
              <div>
                Supplier:{" "}
                {selectedMed.supplier?.supplierName || selectedMed.supplier}
              </div>
            )}
            {centralAvailable != null && (
              <div>
                Central Available: {ceilOrDash(centralAvailable)}
                {centralAvailable === 0 && noBalanceRecord && (
                  <span className="ml-2 text-amber-300">
                    (No balance record; may be legacy)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </form>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Recent Requests</h2>
        <div className="bg-white/10 rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {recentRequests.length === 0 && (
            <div className="p-4 text-sm text-white/60">No requests yet.</div>
          )}
          {recentRequests.map((r) => (
            <div
              key={r._id}
              className="p-4 flex flex-wrap items-center gap-3 text-sm"
            >
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium flex items-center gap-2">
                  <span>
                    {r.medicine?.medicineName || "Medicine"} x{r.quantity}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide border
                      ${
                        r.status === "Pending"
                          ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                          : ""
                      }
                      ${
                        r.status === "Fulfilled"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                          : ""
                      }
                      ${
                        r.status === "Rejected"
                          ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                          : ""
                      }
                    `}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="text-[11px] text-white/50">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              {r.status === "Pending" && (
                <button
                  onClick={() => cancel(r._id)}
                  className="px-3 py-1.5 text-xs rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold"
                >
                  Cancel
                </button>
              )}
              {r.status !== "Pending" && r.rejectionNote && (
                <div className="text-[11px] text-rose-300">
                  {r.rejectionNote}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchRequest;
