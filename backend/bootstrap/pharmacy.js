import Pharmacy from "../models/pharmacy.model.js";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";
import Medicine from "../models/medicine.model.js";
import Supplier from "../models/supplier.model.js";
import Request from "../models/request.model.js";

// Ensures at least one default pharmacy exists (Zelalem Pharmacy) and backfills
// any legacy documents missing the pharmacy reference. Idempotent and safe.
export async function ensureDefaultPharmacyAndBackfill() {
  let pharmacy = await Pharmacy.findOne({ code: "ZELALEM" });
  if (!pharmacy) {
    pharmacy = await Pharmacy.create({
      name: "Zelalem Pharmacy",
      code: "ZELALEM",
      address: "",
    });
    console.log("[pharmacyBootstrap] Created default Zelalem Pharmacy");
  }
  const pid = pharmacy._id;
  const filters = [
    User.updateMany(
      {
        role: { $ne: "super_admin" },
        $or: [
          { pharmacy: { $exists: false } },
          { pharmacy: null },
          { pharmacy: { $eq: undefined } },
        ],
      },
      { $set: { pharmacy: pid } }
    ),
    Branch.updateMany(
      {
        $or: [
          { pharmacy: { $exists: false } },
          { pharmacy: null },
          { pharmacy: { $eq: undefined } },
        ],
      },
      { $set: { pharmacy: pid } }
    ),
    Medicine.updateMany(
      {
        $or: [
          { pharmacy: { $exists: false } },
          { pharmacy: null },
          { pharmacy: { $eq: undefined } },
        ],
      },
      { $set: { pharmacy: pid } }
    ),
    Supplier.updateMany(
      {
        $or: [
          { pharmacy: { $exists: false } },
          { pharmacy: null },
          { pharmacy: { $eq: undefined } },
        ],
      },
      { $set: { pharmacy: pid } }
    ),
    Request.updateMany(
      {
        $or: [
          { pharmacy: { $exists: false } },
          { pharmacy: null },
          { pharmacy: { $eq: undefined } },
        ],
      },
      { $set: { pharmacy: pid } }
    ).catch(() => ({ modifiedCount: 0 })),
  ];
  try {
    const results = await Promise.all(filters);
    const modifiedTotal = results.reduce((a, r) => a + (r.modifiedCount || 0), 0);
    if (modifiedTotal) {
      console.log(
        `[pharmacyBootstrap] Backfilled pharmacy reference on ${modifiedTotal} legacy docs`
      );
    }
  } catch (e) {
    console.warn("[pharmacyBootstrap] Backfill warning:", e.message);
  }
  return pharmacy;
}
