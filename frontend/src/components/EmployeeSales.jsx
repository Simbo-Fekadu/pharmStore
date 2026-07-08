import { useState, useEffect } from "react";
import { Search, Plus, DollarSign, Users, Receipt } from "lucide-react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";
import { ceilOrDash, ceilCurrency } from "../utils/number";

const API = API_BASE;

const EmployeeSales = () => {
  const [medicines, setMedicines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [sellUnit, setSellUnit] = useState("base"); // 'base' or 'pack'
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dailySales, setDailySales] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load medicines and employees on mount
  useEffect(() => {
    loadMedicines();
    loadEmployees();
    loadDailySales();
  }, []);

  const loadMedicines = async () => {
    try {
      // Try branch-specific stock first, falling back to global medicine list
      let branchId = null;
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          // branch may be populated object or id string
          if (u?.branch) {
            branchId = typeof u.branch === "object" ? u.branch._id : u.branch;
          }
          if (!branchId && Array.isArray(u?.branches) && u.branches.length) {
            branchId =
              typeof u.branches[0] === "object"
                ? u.branches[0]._id
                : u.branches[0];
          }
        }
        // Fallback: decode JWT stored token to get branch claim if present
        if (!branchId) {
          const tok = localStorage.getItem("token");
          if (tok) {
            const parts = tok.split(".");
            if (parts.length === 3) {
              try {
                const payload = JSON.parse(atob(parts[1]));
                if (payload?.branch) branchId = payload.branch;
              } catch {
                /* ignore */
              }
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!branchId) {
        // Last resort: fetch current user profile to get branch
        try {
          const resMe = await authFetch(`${API}/auth/me`);
          const isJsonMe = resMe.headers
            .get("content-type")
            ?.includes("application/json");
          const dataMe = isJsonMe ? await resMe.json() : null;
          if (resMe.ok && dataMe?.success && dataMe.user?.branch) {
            branchId =
              typeof dataMe.user.branch === "object"
                ? dataMe.user.branch._id
                : dataMe.user.branch;
            // cache user for later
            try {
              localStorage.setItem("user", JSON.stringify(dataMe.user));
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (branchId) {
        const res = await authFetch(
          `${API}/inventory/branch/${branchId}/medicines`
        );
        const isJson = res.headers
          .get("content-type")
          ?.includes("application/json");
        const data = isJson ? await res.json() : null;
        if (res.ok && data?.success && Array.isArray(data.medicines)) {
          // Normalize to expected shape for selection and posting sales
          const items = data.medicines.map((m) => ({
            _id: m.medicineId, // ensure _id points to medicine id for sales API
            medicineId: m.medicineId,
            medicineName: m.name,
            unit: m.unit,
            baseUnit: m.baseUnit,
            packUnit: m.packUnit,
            packSize: m.packSize,
            brand: m.brand,
            category: m.category,
            supplier: m.supplier,
            purchasePrice: m.purchasePrice,
            sellingPrice: m.sellingPrice,
            sellingPriceBase: m.sellingPriceBase,
            sellingPricePack: m.sellingPricePack,
            price: m.sellingPrice,
            batchNumber: m.batchNumber,
            available: m.quantity,
          }));
          setMedicines(items);
          return;
        }
      }

      // Fallback: global medicines list (no per-branch quantity)
      const res2 = await authFetch(`${API}/medicine`);
      const data2 = await res2.json();
      if (res2.ok && data2.success) {
        const items = data2.medicines
          .filter((m) => !m.isDeleted)
          .map((m) => ({
            ...m,
            medicineName: m.medicineName || m.name,
          }));
        setMedicines(items);
      }
    } catch (error) {
      console.error("Failed to load medicines:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      // Prefer non-admin team endpoint for branch employees
      const res = await authFetch(`${API}/user/team`);
      const isJson = res.headers
        .get("content-type")
        ?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if (res.ok && data?.success) {
        setEmployees(data.users);
        return;
      }
      // Legacy/admin endpoint fallback if available
      try {
        const res2 = await authFetch(`${API}/user?role=employee`);
        const isJson2 = res2.headers
          .get("content-type")
          ?.includes("application/json");
        const data2 = isJson2 ? await res2.json() : null;
        if (res2.ok && data2?.success) {
          setEmployees(data2.users);
          return;
        }
      } catch {
        // ignore and fallback to current user
      }
      // Fallback for non-admin users: use current user from localStorage
      const raw = localStorage.getItem("user");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          if (u && u._id) {
            setEmployees([
              { _id: u._id, username: u.username || u.email || "Me" },
            ]);
            setSelectedEmployee((prev) => prev || u._id);
          }
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
      // Fallback: set current user if available
      const raw = localStorage.getItem("user");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          if (u && u._id) {
            setEmployees([
              { _id: u._id, username: u.username || u.email || "Me" },
            ]);
            setSelectedEmployee((prev) => prev || u._id);
          }
        } catch {
          /* ignore */
        }
      }
    }
  };

  const loadDailySales = async () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`; // local YYYY-MM-DD
    try {
      const res = await authFetch(`${API}/sales/daily?date=${today}`);
      const isJson = res.headers
        .get("content-type")
        ?.includes("application/json");
      const data = isJson ? await res.json() : null;
      if (res.ok && data?.success) {
        setDailySales(data.sales);
      } else if (!res.ok) {
        // Likely 404 on prod backend without sales route yet
        console.warn("Sales endpoint not available (status:", res.status, ")");
      }
    } catch (error) {
      console.error("Failed to load daily sales:", error);
    }
  };

  const handleMedicineSelect = (medicine) => {
    setSelectedMedicine(medicine);
    // Decide available unit options
    const hasPack = medicine.packUnit && medicine.packSize > 1;
    const unitChoice = hasPack ? "base" : "base";
    setSellUnit(unitChoice);
    // Determine default price per selected unit
    const priceBase =
      typeof medicine.sellingPriceBase === "number"
        ? medicine.sellingPriceBase
        : typeof medicine.sellingPrice === "number"
        ? medicine.sellingPrice
        : 0;
    const pricePack =
      typeof medicine.sellingPricePack === "number"
        ? medicine.sellingPricePack
        : priceBase && medicine.packSize
        ? priceBase * medicine.packSize
        : undefined;
    setPrice(unitChoice === "pack" && pricePack ? pricePack : priceBase);
    setSearchTerm(medicine.medicineName || "");
    // If available stock is provided, cap quantity to available but keep at least 1
    if (typeof medicine.available === "number") {
      setQuantity((q) => Math.min(q, Math.max(1, medicine.available)));
    }
  };

  const handleSubmitSale = async () => {
    if (!selectedMedicine || !selectedEmployee || quantity <= 0) return;

    // Optional client-side check against available branch stock
    if (
      typeof selectedMedicine.available === "number" &&
      (selectedMedicine.available <= 0 || quantity > selectedMedicine.available)
    ) {
      console.error("Quantity exceeds available stock");
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        medicineId: selectedMedicine.medicineId || selectedMedicine._id,
        quantity,
        price,
        employeeId: selectedEmployee,
        date: new Date().toISOString(),
        unit:
          sellUnit === "pack"
            ? selectedMedicine.packUnit || selectedMedicine.unit
            : selectedMedicine.baseUnit || selectedMedicine.unit,
      };

      const res = await authFetch(`${API}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
      });

      if (res.ok) {
        // Reset form
        setSelectedMedicine(null);
        setQuantity(1);
        setPrice(0);
        setSelectedEmployee("");
        setSellUnit("base");
        setSearchTerm("");
        loadDailySales(); // Refresh daily sales
        loadMedicines(); // Refresh branch inventory so available decreases
      } else {
        const isJson = res.headers
          .get("content-type")
          ?.includes("application/json");
        const errorData = isJson ? await res.json() : null;
        console.error(
          "Failed to record sale:",
          errorData?.message || `status ${res.status}`
        );
      }
    } catch (error) {
      console.error("Failed to submit sale:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    const nm = m?.medicineName || "";
    return nm.toLowerCase().includes((searchTerm || "").toLowerCase());
  });

  const totalDailySales = dailySales.reduce(
    (sum, sale) => sum + sale.quantity * sale.price,
    0
  );

  return (
    <div className="space-y-8 pb-4 text-foreground">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Record sales and track daily performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sale Form */}
        <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" /> New Sale
          </h2>

          {/* Medicine Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Medicine</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medicine..."
                className="w-full pl-10 pr-4 py-2 rounded bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {searchTerm && (
              <div className="mt-2 max-h-40 overflow-auto bg-muted rounded border border-border">
                {filteredMedicines.slice(0, 5).map((med) => (
                  <button
                    key={med._id}
                    onClick={() => handleMedicineSelect(med)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/80 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {med.medicineName || med.name}
                        {med.unit ? ` (${med.unit})` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {typeof med.available === "number"
                          ? `Available: ${med.available} ${
                              med.baseUnit || med.unit || "units"
                            }`
                          : "Available: unknown"}
                        {med.packUnit &&
                        med.packSize > 1 &&
                        typeof med.available === "number"
                          ? ` (≈ ${Math.floor(med.available / med.packSize)} ${
                              med.packUnit
                            })`
                          : ""}
                        {"  •  Price: "}
                        {typeof med.sellingPriceBase === "number"
                          ? `${med.sellingPriceBase} per ${
                              med.baseUnit || med.unit || "unit"
                            }`
                          : typeof med.sellingPrice === "number"
                          ? med.sellingPrice
                          : med.price || 0}
                        {med.sellingPricePack
                          ? ` | ${med.sellingPricePack} per ${med.packUnit}`
                          : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Quantity
              {selectedMedicine
                ? ` (${
                    sellUnit === "pack"
                      ? selectedMedicine.packUnit
                      : selectedMedicine.baseUnit ||
                        selectedMedicine.unit ||
                        "unit"
                  })`
                : ""}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              max={(() => {
                if (
                  typeof selectedMedicine?.available === "number" &&
                  selectedMedicine.available > 0
                ) {
                  if (sellUnit === "pack" && selectedMedicine?.packSize > 1) {
                    return Math.floor(
                      selectedMedicine.available / selectedMedicine.packSize
                    );
                  }
                  return selectedMedicine.available;
                }
                return undefined;
              })()}
              className="w-full px-3 py-2 rounded bg-muted border border-border text-sm text-foreground"
            />
            {selectedMedicine?.packUnit && selectedMedicine?.packSize > 1 && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="sellUnit"
                    value="base"
                    checked={sellUnit === "base"}
                    onChange={() => {
                      setSellUnit("base");
                      const pb =
                        selectedMedicine.sellingPriceBase ??
                        selectedMedicine.sellingPrice ??
                        0;
                      setPrice(pb);
                    }}
                  />
                  <span>
                    {selectedMedicine.baseUnit || selectedMedicine.unit} (per
                    unit)
                  </span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name="sellUnit"
                    value="pack"
                    checked={sellUnit === "pack"}
                    disabled={
                      typeof selectedMedicine.available === "number" &&
                      selectedMedicine.available < selectedMedicine.packSize
                    }
                    onChange={() => {
                      setSellUnit("pack");
                      const pb =
                        selectedMedicine.sellingPriceBase ??
                        selectedMedicine.sellingPrice ??
                        0;
                      const pp =
                        selectedMedicine.sellingPricePack ??
                        (selectedMedicine.packSize
                          ? pb * selectedMedicine.packSize
                          : undefined) ??
                        pb;
                      setPrice(pp);
                      // Cap quantity to max packs available
                      if (
                        typeof selectedMedicine.available === "number" &&
                        selectedMedicine.packSize > 1
                      ) {
                        const maxPacks = Math.floor(
                          selectedMedicine.available / selectedMedicine.packSize
                        );
                        setQuantity((q) => Math.min(q, Math.max(1, maxPacks)));
                      }
                    }}
                  />
                  <span>
                    {selectedMedicine.packUnit} (x{selectedMedicine.packSize}{" "}
                    per pack)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Price</label>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
                className="flex-1 px-3 py-2 rounded bg-muted border border-border text-sm text-foreground"
              />
            </div>
          </div>

          {/* Employee Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> Select Employee
            </label>
            <div className="space-y-2">
              {employees.map((emp) => (
                <label key={emp._id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="employee"
                    value={emp._id}
                    checked={selectedEmployee === emp._id}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="text-[var(--brand)]"
                  />
                  <span className="text-sm">{emp.username}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitSale}
            disabled={
              !selectedMedicine ||
              !selectedEmployee ||
              loading ||
              (typeof selectedMedicine?.available === "number" &&
                selectedMedicine.available <= 0)
            }
            className="w-full px-4 py-2 rounded btn-brand disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {loading ? "Processing..." : "Record Sale"}
          </button>
        </div>

        {/* Daily Summary */}
        <div className="bg-card border border-border rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4">Daily Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Sales</span>
              <span className="text-lg font-semibold">
                {ceilCurrency(totalDailySales)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Transactions
              </span>
              <span className="text-lg font-semibold">{dailySales.length}</span>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Recent Sales</h3>
            <div className="space-y-2 max-h-40 overflow-auto">
              {dailySales
                .slice(-5)
                .reverse()
                .map((sale, idx) => {
                  const qty = Number(sale.quantity) || 0;
                  const unit = Number(sale.price) || 0;
                  const total = qty * unit;
                  return (
                    <div
                      key={sale._id}
                      className="bg-muted border border-border rounded-md px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand)]/25 text-[var(--brand)] text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span
                          className="font-medium truncate"
                          title={sale.medicineName}
                        >
                          {sale.medicineName}
                        </span>
                      </div>
                      <div className="ml-3 font-mono whitespace-nowrap opacity-90">
                        {ceilOrDash(qty)}x{ceilOrDash(unit)} ={" "}
                        {ceilOrDash(total)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSales;
