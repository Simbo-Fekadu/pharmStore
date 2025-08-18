import { useState, useEffect } from "react";

// TODO: move to env variable (e.g. import.meta.env.VITE_API_BASE)
const API = "http://localhost:3000/backend";

const initialForm = {
  medicineId: "",
  locationType: "Store",
  locationId: "",
  quantity: "",
  batchNumber: "",
  expiryDate: "",
};

const InventoryForm = ({ onSuccess }) => {
  const [form, setForm] = useState(initialForm);
  const [lists, setLists] = useState({
    medicines: [],
    stores: [],
    branches: [],
  });
  const [loadingLists, setLoadingLists] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const loadLists = async () => {
    setLoadingLists(true);
    setMessage("");
    try {
      const [medRes, storeRes, branchRes] = await Promise.all([
        fetch(`${API}/medicine`, { credentials: "include" }),
        fetch(`${API}/location/store`, { credentials: "include" }),
        fetch(`${API}/location/branch`, { credentials: "include" }),
      ]);
      const medData = await medRes.json();
      const storeData = await storeRes.json();
      const branchData = await branchRes.json();
      setLists({
        medicines: medData.medicines || [],
        stores: Array.isArray(storeData) ? storeData : [],
        branches: Array.isArray(branchData) ? branchData : [],
      });
    } catch (err) {
      console.error("List load error", err);
      setMessage("Failed to load dropdown data");
      setIsError(true);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const validate = () => {
    if (!form.medicineId) return "Select a medicine";
    if (!form.locationId) return "Select a location";
    if (!form.quantity || Number(form.quantity) <= 0)
      return "Quantity must be > 0";
    if (form.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.expiryDate) < today)
        return "Expiry must be in the future";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    const problem = validate();
    if (problem) {
      setMessage(problem);
      setIsError(true);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        medicineId: form.medicineId,
        locationType: form.locationType,
        locationId: form.locationId,
        quantity: Number(form.quantity),
        batchNumber: form.batchNumber || undefined,
        expiryDate: form.expiryDate || undefined,
      };
      const res = await fetch(`${API}/inventory/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "Inventory saved");
        setIsError(false);
        // Keep selected locationType for faster consecutive entries
        setForm((prev) => ({
          ...initialForm,
          locationType: prev.locationType,
        }));
        onSuccess && onSuccess();
      } else {
        setMessage(data.message || "Save failed");
        setIsError(true);
      }
    } catch (err) {
      console.error("Upsert error", err);
      setMessage("Network error saving inventory");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLocations =
    form.locationType === "Store" ? lists.stores : lists.branches;

  return (
    <div className="relative group bg-gradient-to-br from-white/90 to-white/70 shadow-xl rounded-xl p-5 sm:p-8 border border-white/40 overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top_left,rgba(147,177,166,0.25),transparent_60%)]" />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse" />
          Register Inventory
        </h2>
        <button
          type="button"
          onClick={loadLists}
          className="text-xs px-3 py-1.5 rounded bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 text-[var(--bg-start)] font-medium border border-[var(--brand)]/30 disabled:opacity-50"
          disabled={loadingLists}
        >
          {loadingLists ? "Loading..." : "Reload Lists"}
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Medicine */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Medicine
            </label>
            <select
              name="medicineId"
              value={form.medicineId}
              onChange={handleChange}
              required
              disabled={loadingLists}
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent outline-none disabled:opacity-50"
            >
              <option value="">
                {loadingLists ? "Loading..." : "Select medicine"}
              </option>
              {lists.medicines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.medicineName} {m.brand ? `- ${m.brand}` : ""}
                </option>
              ))}
            </select>
          </div>
          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              placeholder="e.g. 100"
              min={1}
              required
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent outline-none"
            />
          </div>
          {/* Location Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Location Type
            </label>
            <select
              name="locationType"
              value={form.locationType}
              onChange={(e) => {
                handleChange(e);
                setForm((f) => ({ ...f, locationId: "" }));
              }}
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent outline-none"
            >
              <option value="Store">Store</option>
              <option value="Branch">Branch</option>
            </select>
          </div>
          {/* Location Id */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              {form.locationType} Name
            </label>
            <select
              name="locationId"
              value={form.locationId}
              onChange={handleChange}
              required
              disabled={loadingLists}
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent outline-none disabled:opacity-50"
            >
              <option value="">
                {loadingLists
                  ? "Loading..."
                  : `Select ${form.locationType.toLowerCase()}`}
              </option>
              {filteredLocations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          {/* Batch Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Batch Number (optional)
            </label>
            <input
              type="text"
              name="batchNumber"
              value={form.batchNumber}
              onChange={handleChange}
              placeholder="Batch code"
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent outline-none"
            />
          </div>
          {/* Expiry Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              name="expiryDate"
              value={form.expiryDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white/70 backdrop-blur border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center items-center gap-2 px-6 py-3 bg-[var(--brand)] text-white rounded-lg font-semibold shadow-lg shadow-[var(--brand)]/30 hover:bg-[var(--brand-hover)] active:scale-[0.97] focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 focus:ring-offset-white transition disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Inventory"}
          </button>
          {message && (
            <span
              className={`text-sm font-medium ${
                isError ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </span>
          )}
        </div>
        {loadingLists && (
          <div className="text-xs text-gray-500">Loading lists...</div>
        )}
      </form>
    </div>
  );
};

export default InventoryForm;
