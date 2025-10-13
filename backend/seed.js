import { config } from "dotenv";
import mongoose from "mongoose";
import Medicine from "./models/medicine.model.js";
import Supplier from "./models/supplier.model.js";

config();

async function run() {
  const uri =
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/pharmstore";
  if (!process.env.MONGO_URL && !process.env.MONGO_URI) {
    console.warn(
      "[seed] No MONGO_URL/MONGO_URI set; defaulting to mongodb://localhost:27017/pharmstore"
    );
  }
  await mongoose.connect(uri);
  console.log("Connected for seeding");

  // Create a set of suppliers if none / few exist
  const existingSuppliers = await Supplier.find();
  let supplierIds = existingSuppliers.map((s) => s._id);
  if (supplierIds.length < 5) {
    const seedSuppliers = [
      {
        supplierName: "HealthPlus Distributors",
        phoneNumber: "555-1001",
        address: "Industrial Zone",
      },
      {
        supplierName: "MediCore Pharma",
        phoneNumber: "555-1002",
        address: "Market Street",
      },
      {
        supplierName: "VitalMed Supply",
        phoneNumber: "555-1003",
        address: "Warehouse District",
      },
      {
        supplierName: "EverGreen Pharma",
        phoneNumber: "555-1004",
        address: "Green Park",
      },
      {
        supplierName: "PrimeCare Labs",
        phoneNumber: "555-1005",
        address: "Innovation Hub",
      },
    ];
    const inserted = await Supplier.insertMany(seedSuppliers, {
      ordered: false,
    }).catch(() => []);
    supplierIds = [...supplierIds, ...inserted.map((i) => i._id)];
    console.log(`Seeded ${inserted.length} suppliers.`);
  }

  // Build 20 diverse medicines (avoid duplicate batchNumber among active)
  const categories = [
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Cream/Oint",
    "Others",
  ];
  const units = ["Packet", "Strip", "Tube", "Bottle", "Others"];
  const base = [
    "Paracetamol",
    "Ibuprofen",
    "Amoxicillin",
    "Cough Syrup",
    "Vitamin C",
    "Aspirin",
    "Metformin",
    "Lisinopril",
    "Omeprazole",
    "Cetirizine",
    "Azithromycin",
    "Hydrocortisone Cream",
    "Insulin",
    "Multivitamin",
    "Antacid Suspension",
    "Dextromethorphan",
    "Nasal Spray",
    "Eye Drops",
    "Antifungal Cream",
    "Electrolyte Solution",
  ];

  const existingCount = await Medicine.countDocuments();
  if (existingCount >= 20) {
    console.log(`Already have ${existingCount} medicines; skipping.`);
    await mongoose.disconnect();
    return;
  }

  const medicines = [];
  const today = Date.now();
  for (let i = 0; i < base.length; i++) {
    const name = base[i];
    const purchasePrice = 5 + i * 1.5;
    const quantity = 50 + ((i * 7) % 120);
    // Spread expiries: some near, some far, some expired
    const expiryOffsetDays = i % 5 === 0 ? -30 : i % 4 === 0 ? 20 : 120 + i * 3;
    const expiryDate = new Date(today + expiryOffsetDays * 86400000);
    medicines.push({
      medicineName: name,
      brand: i % 3 === 0 ? "Generic" : "PharmCo",
      category: categories[i % categories.length],
      unit: units[i % units.length],
      batchNumber: `BATCH-${(1000 + i).toString(36).toUpperCase()}`,
      expiryDate,
      description: `${name} sample description for testing scenarios.`,
      purchasePrice,
      quantity,
      sellingPrice: +(purchasePrice * 1.25).toFixed(2),
      supplier: supplierIds[i % supplierIds.length],
      createdBy: "seed-script",
    });
  }

  try {
    const insertedMeds = await Medicine.insertMany(medicines, {
      ordered: false,
    });
    console.log(`Inserted ${insertedMeds.length} medicines.`);
  } catch (e) {
    console.warn(
      "Medicine insert encountered errors (some may already exist):",
      e.message
    );
  }

  await mongoose.disconnect();
  console.log("Seeding complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
