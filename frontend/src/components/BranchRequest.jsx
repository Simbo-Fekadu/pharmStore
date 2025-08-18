import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

const API = "http://localhost:3000/backend";

const BranchRequest = () => {
  const [medicines, setMedicines] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    medicineId: "",
    branchId: "",
    quantity: "",
    batchNumber: "",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, bRes] = await Promise.all([
        fetch(`${API}/medicine`),
        fetch(`${API}/location/branch`),
      ]);
      const mData = await mRes.json();
      const bData = await bRes.json();
      setMedicines(mData.medicines || []);
      setBranches(Array.isArray(bData) ? bData : []);
    } catch (err) {
      console.warn("Load error", err);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch(`${API}/inventory/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: form.medicineId,
          branchId: form.branchId,
          quantity: Number(form.quantity),
          batchNumber: form.batchNumber || undefined,
          reason: form.reason || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Request submitted");
        setForm({
          medicineId: "",
          branchId: "",
          quantity: "",
          batchNumber: "",
          reason: "",
        });
      } else {
        setMessage(data.message || "Failed");
        setIsError(true);
      }
    } catch {
      setMessage("Network error");
      setIsError(true);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#183D3D] to-[#5C8374]/40 text-white">
      <Sidebar />
      <main className="flex-1 p-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Branch Request</h1>
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Reload
          </button>
        </div>
        <form
          onSubmit={submit}
          className="space-y-5 max-w-xl bg-white/10 p-6 rounded-xl border border-white/10 backdrop-blur"
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
            <select
              name="branchId"
              value={form.branchId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded bg-white/80 text-gray-800 text-sm"
            >
              <option value="">
                {loading ? "Loading branches..." : "Select Branch"}
              </option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
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
          <button className="px-5 py-2.5 bg-[#5C8374] hover:bg-[#4a6b5f] rounded text-sm font-semibold text-white">
            Submit Request
          </button>
          {message && (
            <div
              className={`text-sm ${
                isError ? "text-red-300" : "text-green-300"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </main>
    </div>
  );
};

export default BranchRequest;
