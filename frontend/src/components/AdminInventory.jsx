import { useEffect, useState } from "react";

const API = "http://localhost:3000/backend";

const AdminInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [receive, setReceive] = useState({ 
    medicineId: "", 
    locationId: "", 
    quantity: "", 
    batchNumber: "",
    expiryDate: ""
  });
  const [lists, setLists] = useState({ medicines: [], locations: [], branches: [] });
  const [submitting, setSubmitting] = useState(false);
  // Distribute modal state
  const [distOpen, setDistOpen] = useState(false);
  const [dist, setDist] = useState({ medicineId: "", branchId: "", quantity: "", storeId: "" });
  // Simple view: show all locations combined (keep UI minimal)

  const fetchInventory = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ includeZero: "false" });
      const res = await fetch(`${API}/inventory/stock?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) setInventory(data.balances || []);
      else setError(data.message || "Failed to load inventory");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async () => {
    try {
      const [medRes, stRes, brRes] = await Promise.all([
        fetch(`${API}/medicine`, { credentials: "include" }),
        fetch(`${API}/location/store`, { credentials: "include" }),
        fetch(`${API}/location/branch`, { credentials: "include" }),
      ]);
      const meds = await medRes.json();
      const stores = await stRes.json();
      const branches = await brRes.json();
      // Only allow Central Store for receiving - branches must request
      setLists({ medicines: meds.medicines || [], locations: Array.isArray(stores) ? stores : [], branches: Array.isArray(branches) ? branches : [] });
    } catch {}
  };

  useEffect(() => {
    loadLists();
    // Check user role for inventory access
    const role = localStorage.getItem("role");
    setUserRole(role);
  }, []);

  const submitReceive = async (e) => {
    e.preventDefault();
    if (!receive.medicineId || !receive.locationId || !receive.quantity) return;
    setSubmitting(true);
    try {
      const payload = {
        medicineId: receive.medicineId,
        locationId: receive.locationId,
        quantity: Number(receive.quantity),
        transactionType: "GRN",
        sourceDocType: "GRN",
        batchNumber: receive.batchNumber || undefined,
        expiryDate: receive.expiryDate || undefined,
      };
      const res = await fetch(`${API}/inventory/ledger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReceive({ medicineId: "", locationId: "", quantity: "", batchNumber: "", expiryDate: "" });
        setReceiveOpen(false);
        fetchInventory();
      }
    } catch {}
    finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stock</h1>
          <p className="text-white/70 mt-1 text-sm md:text-base">
            Real-time stock on hand across branches and store
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInventory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium backdrop-blur transition"
          >
            Refresh
          </button>
          {userRole && ["admin", "inventory_manager"].includes(userRole) && (
            <button
              onClick={() => setReceiveOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-sm font-medium backdrop-blur transition"
            >
              Quick Receive
            </button>
          )}
          {userRole && ["admin", "inventory_manager"].includes(userRole) && (
            <button
              onClick={() => setDistOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-sm font-medium backdrop-blur transition"
            >
              Distribute
            </button>
          )}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/10 rounded-xl border border-white/10 shadow-xl backdrop-blur">
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
              <h2 className="font-semibold text-lg">Current Stock</h2>
              <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
                {inventory.length} records
              </span>
            </div>
            {loading ? (
              <div className="py-12 text-center text-white/70 text-sm">
                Loading inventory...
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-300 text-sm">
                {error}
              </div>
            ) : inventory.length === 0 ? (
              <div className="py-12 text-center text-white/60 text-sm">
                No inventory yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/70 text-left">
                      <th className="py-3 pl-5 pr-4 font-medium">Medicine</th>
                      <th className="py-3 pr-4 font-medium">Location</th>
                      <th className="py-3 pr-4 font-medium">Qty</th>
                      <th className="py-3 pr-5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const qty = item.onHandQty ?? 0;
                      const low = qty < 10;
                      const medName =
                        item.medicineId?.name ||
                        item.medicineId?.medicineName ||
                        "-";
                      const locName = item.locationId?.name || "-";
                      return (
                        <tr
                          key={item._id}
                          className="border-t border-white/5 hover:bg-white/5 transition"
                        >
                          <td className="py-2.5 pl-5 pr-4 font-medium text-white/90">
                            {medName}
                          </td>
                          <td className="py-2.5 pr-4 text-white/80">{locName}</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                                low
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-green-500/20 text-green-300"
                              }`}
                            >
                              {qty}
                            </span>
                          </td>
                          <td className="py-2.5 pr-5">
                            <span className="px-2 py-1 rounded text-xs font-medium inline-block bg-blue-500/20 text-blue-300">
                              OK
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white/10 rounded-xl p-5 border border-white/10 shadow-lg backdrop-blur">
            <h3 className="font-semibold mb-4 tracking-wide text-sm uppercase text-white/70">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded p-3">
                <div className="text-white/60 text-xs">Items</div>
                <div className="text-lg font-bold">{inventory.length}</div>
              </div>
              <div className="bg-white/5 rounded p-3">
                <div className="text-white/60 text-xs">Low Stock</div>
                <div className="text-lg font-bold">
                  {inventory.filter((i) => (i.onHandQty ?? 0) < 10).length}
                </div>
              </div>
              
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#5C8374]/30 to-[#183D3D]/60 rounded-xl p-5 border border-white/10 shadow-lg backdrop-blur">
            <h3 className="font-semibold mb-2 tracking-wide text-sm uppercase text-white/70">
              Tips
            </h3>
            <p className="text-xs leading-relaxed text-white/70">
              Keep stock movements accurate. All additions or removals should go
              through a ledger action (receive, transfer, sale, adjustment).
            </p>
          </div>
        </div>
      </div>

      {/* Quick Receive Modal */}
      {receiveOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Quick Receive</h3>
                <button
                  onClick={() => setReceiveOpen(false)}
                  className="text-white/60 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={submitReceive} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Medicine</label>
                  <select
                    value={receive.medicineId}
                    onChange={(e) => setReceive((s) => ({ ...s, medicineId: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select medicine</option>
                    {lists.medicines.map((m) => (
                      <option key={m._id} value={m._id} className="bg-gray-800 text-white">
                        {m.medicineName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Central Store</label>
                  <select
                    value={receive.locationId}
                    onChange={(e) => setReceive((s) => ({ ...s, locationId: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Central Store</option>
                    {lists.locations.map((l) => (
                      <option key={l._id} value={l._id} className="bg-gray-800 text-white">
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-white/60 mt-1">
                    Branches must request from Central Store via Branch Request page
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={receive.quantity}
                    onChange={(e) => setReceive((s) => ({ ...s, quantity: e.target.value }))}
                    placeholder="Enter quantity"
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Batch Number (optional)</label>
                  <input
                    type="text"
                    value={receive.batchNumber}
                    onChange={(e) => setReceive((s) => ({ ...s, batchNumber: e.target.value }))}
                    placeholder="Enter batch number"
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={receive.expiryDate}
                    onChange={(e) => setReceive((s) => ({ ...s, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setReceiveOpen(false)}
                    className="flex-1 px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium transition disabled:opacity-60"
                  >
                    {submitting ? "Receiving..." : "Receive Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Distribute Modal */}
      {distOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Distribute to Branch</h3>
                <button onClick={() => setDistOpen(false)} className="text-white/60 hover:text-white">✕</button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!dist.medicineId || !dist.branchId || !dist.quantity || !dist.storeId) return;
                setSubmitting(true);
                try {
                  const res = await fetch(`${API}/inventory/transfer/direct`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      medicineId: dist.medicineId,
                      branchId: dist.branchId,
                      quantity: Number(dist.quantity),
                      storeId: dist.storeId,
                    }),
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    setDist({ medicineId: "", branchId: "", quantity: "", storeId: "" });
                    setDistOpen(false);
                    fetchInventory();
                  }
                } catch {}
                finally { setSubmitting(false); }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Medicine</label>
                  <select value={dist.medicineId} onChange={(e) => setDist((s) => ({ ...s, medicineId: e.target.value }))} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" required>
                    <option value="">Select medicine</option>
                    {lists.medicines.map((m) => (<option key={m._id} value={m._id} className="bg-gray-800 text-white">{m.medicineName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">From Store</label>
                  <select value={dist.storeId} onChange={(e) => setDist((s) => ({ ...s, storeId: e.target.value }))} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" required>
                    <option value="">Select store</option>
                    {(lists.locations || []).map((s) => (<option key={s._id} value={s._id} className="bg-gray-800 text-white">{s.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">To Branch</label>
                  <select value={dist.branchId} onChange={(e) => setDist((s) => ({ ...s, branchId: e.target.value }))} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white" required>
                    <option value="">Select branch</option>
                    {(lists.branches || []).map((b) => (<option key={b._id} value={b._id} className="bg-gray-800 text-white">{b.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Quantity</label>
                  <input type="number" min={1} value={dist.quantity} onChange={(e) => setDist((s) => ({ ...s, quantity: e.target.value }))} className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setDistOpen(false)} className="flex-1 px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-sm disabled:opacity-60">{submitting ? "Sending..." : "Distribute"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
