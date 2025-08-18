import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Placeholder location filters (could be dynamic later)
  const locationType = "Store";
  const locationId = "main";

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ locationType, locationId });
        const res = await fetch(
          `http://localhost:3000/backend/inventory?${params.toString()}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setInventory(data.inventory.slice(0, 5)); // show only recent few
        } else {
          setError(data.message || "Failed to load inventory");
        }
      } catch {
        setError("Network error loading inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row app-gradient text-white">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[var(--bg-start)]/85 backdrop-blur-sm flex flex-row md:flex-col py-4 md:py-8 px-3 md:px-5 shadow-xl gap-3 md:gap-6 items-center md:items-start">
        <div className="text-xl md:text-2xl font-bold tracking-wide">
          PharmStore
        </div>
        <nav className="flex flex-row md:flex-col gap-2 md:gap-3 w-full">
          <button
            onClick={() => navigate("/home")}
            className="w-full text-left px-3 py-2 rounded hover:bg-[var(--brand)] transition text-sm md:text-base font-medium bg-[var(--brand)]/40"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/inventory")}
            className="w-full text-left px-3 py-2 rounded hover:bg-[var(--brand)] transition text-sm md:text-base font-medium"
          >
            Inventory
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-[var(--brand)] transition text-sm md:text-base font-medium">
            Medicines
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-[var(--brand)] transition text-sm md:text-base font-medium">
            Suppliers
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-[var(--brand)] transition text-sm md:text-base font-medium">
            Users
          </button>
          <button className="w-full text-left px-3 py-2 rounded hover:bg-[var(--brand)] transition text-sm md:text-base font-medium">
            Settings
          </button>
        </nav>
        <div className="md:mt-auto md:pt-6 w-full">
          {/* Placeholder logout - could import existing component */}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/signin");
            }}
            className="w-full btn-brand hover:bg-[var(--brand-hover)] text-white font-semibold py-2 rounded transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-white/70 text-sm md:text-base">
              Overview of your pharmacy operations
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Items", value: inventory.length },
              {
                label: "Low Stock",
                value: inventory.filter((i) => i.quantity < 10).length,
              },
              {
                label: "Expiring",
                value: inventory.filter(
                  (i) =>
                    i.expiryDate &&
                    new Date(i.expiryDate) <
                      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                ).length,
              },
              { label: "Suppliers", value: 0 },
              { label: "Users", value: 0 },
              { label: "Transfers", value: 0 },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/10 rounded-lg p-3 sm:p-4 backdrop-blur border border-white/10 shadow hover:shadow-lg transition"
              >
                <div className="text-xs uppercase tracking-wide text-white/60">
                  {stat.label}
                </div>
                <div className="text-lg sm:text-2xl font-bold mt-1">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Inventory Table */}
          <div className="bg-white/10 rounded-xl p-4 md:p-6 backdrop-blur border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">
                Recent Inventory
              </h2>
              <button
                onClick={() => navigate("/inventory")}
                className="text-sm px-3 py-1 rounded bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition"
              >
                Manage
              </button>
            </div>
            {loading ? (
              <div className="py-8 text-center text-white/70">
                Loading inventory...
              </div>
            ) : error ? (
              <div className="py-8 text-center text-red-300">{error}</div>
            ) : inventory.length === 0 ? (
              <div className="py-8 text-center text-white/70">
                No inventory records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm md:text-base">
                  <thead>
                    <tr className="text-white/70 border-b border-white/10">
                      <th className="py-2 pr-4 font-medium">Medicine</th>
                      <th className="py-2 pr-4 font-medium">Qty</th>
                      <th className="py-2 pr-4 font-medium">Batch</th>
                      <th className="py-2 pr-4 font-medium hidden sm:table-cell">
                        Expiry
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr
                        key={item._id}
                        className="border-b border-white/5 last:border-none hover:bg-white/5"
                      >
                        <td className="py-2 pr-4">
                          {item.medicine?.medicineName || "-"}
                        </td>
                        <td className="py-2 pr-4">{item.quantity}</td>
                        <td className="py-2 pr-4">
                          {item.batchNumber ||
                            item.medicine?.batchNumber ||
                            "-"}
                        </td>
                        <td className="py-2 pr-4 hidden sm:table-cell">
                          {item.expiryDate
                            ? new Date(item.expiryDate).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Placeholder sections for future expansion */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-4 md:p-6 border border-white/10 min-h-[180px] flex items-center justify-center text-white/60 text-sm md:text-base">
              Upcoming: Sales Trends Chart
            </div>
            <div className="bg-white/10 rounded-xl p-4 md:p-6 border border-white/10 min-h-[180px] flex items-center justify-center text-white/60 text-sm md:text-base">
              Upcoming: Expiring Medicines Widget
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
