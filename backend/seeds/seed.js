import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Supplier from "../models/supplier.model.js";
import Medicine from "../models/medicine.model.js";
import Branch from "../models/branch.model.js";
import Store from "../models/store.model.js";
import { StockLedger, StockBalance } from "../models/inventory.model.js";
import Sale from "../models/sale.model.js";
import Request from "../models/request.model.js";

dotenv.config();

// Allow MONGO_URL or MONGO_URI; default to local for developer convenience
const MONGO_URL =
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/pharmstore";
if (!process.env.MONGO_URL && !process.env.MONGO_URI) {
  console.warn(
    "[seed] No MONGO_URL/MONGO_URI provided; defaulting to mongodb://localhost:27017/pharmstore"
  );
}

const round2 = (n) => Math.round(n * 100) / 100;
const ceil2 = (n) => Math.ceil(n * 100) / 100;

import Pharmacy from "../models/pharmacy.model.js";

async function ensureCoreOrgs() {
  // Use or create a default pharmacy for seed data
  let pharmacy = await Pharmacy.findOne({ code: "ZELALEM" });
  if (!pharmacy) {
    pharmacy = await Pharmacy.create({
      name: "Zelalem Pharmacy",
      code: "ZELALEM",
    });
  }
  // Ensure 3 branches and a central store
  let branches = await Branch.find({ pharmacy: pharmacy._id });
  if (branches.length === 0) {
    branches = await Branch.insertMany([
      { name: "Branch Ayat", address: "Ayat", pharmacy: pharmacy._id },
      { name: "Branch Tafo", address: "Tafo", pharmacy: pharmacy._id },
      {
        name: "Branch Kazanchis",
        address: "Kazanchis",
        pharmacy: pharmacy._id,
      },
    ]);
    console.log("Seeded branches");
  }
  let store = await Store.findOne({ pharmacy: pharmacy._id });
  if (!store) {
    store = await Store.create({
      name: "Central Store",
      address: "Head Office",
      pharmacy: pharmacy._id,
    });
    console.log("Seeded central store");
  }
  return { branches, store, pharmacy };
}

async function ensureAdmin() {
  const adminUsername = "simbo";
  const adminEmail = "simbo@gmail.com";
  const adminPassword = "simbo";
  let admin = await User.findOne({ username: adminUsername });
  if (!admin) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    admin = await User.create({
      username: adminUsername,
      email: adminEmail,
      password: hashed,
      role: "admin",
    });
    console.log("Created admin user:", admin.username);
  }
  return admin;
}

async function ensureSuppliers() {
  const supplierSeeds = [
    {
      supplierName: "HealthSource Ltd",
      phoneNumber: "+251900000001",
      address: "Addis Ababa",
    },
    {
      supplierName: "MediCore Distributors",
      phoneNumber: "+251900000002",
      address: "Bole",
    },
    {
      supplierName: "PharmaBridge",
      phoneNumber: "+251900000003",
      address: "Kazanchis",
    },
    {
      supplierName: "VitalPlus Supply",
      phoneNumber: "+251900000004",
      address: "CMC",
    },
    {
      supplierName: "PrimeCare Labs",
      phoneNumber: "+251900000005",
      address: "Sarbet",
    },
  ];
  for (const s of supplierSeeds) {
    const exists = await Supplier.findOne({ supplierName: s.supplierName });
    if (!exists) await Supplier.create(s);
  }
  const suppliers = await Supplier.find();
  return suppliers.map((s) => s._id);
}

function buildMedicineCatalog(supplierIds) {
  // Common generic medicine names (no brand variants)
  const items = [
    {
      name: "Paracetamol 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Ibuprofen 400mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Amoxicillin 500mg",
      category: "Capsule",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Azithromycin 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 6,
    },
    {
      name: "Metformin 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Lisinopril 10mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Omeprazole 20mg",
      category: "Capsule",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Cetirizine 10mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Amlodipine 5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Losartan 50mg", category: "Tablet", unit: "Packet", packSize: 10 },
    {
      name: "Atorvastatin 20mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Clopidogrel 75mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Hydrochlorothiazide 25mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Diclofenac 50mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Doxycycline 100mg",
      category: "Capsule",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Ciprofloxacin 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Co-trimoxazole 960mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Fluconazole 150mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 2,
    },
    {
      name: "Prednisolone 5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Glibenclamide 5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Insulin Regular",
      category: "Injection",
      unit: "Box",
      packSize: 10,
    },
    {
      name: "Vitamin B Complex",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Calcium + Vitamin D3",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Ferrous Sulfate 200mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Folic Acid 5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "ORS Sachet", category: "Others", unit: "Packet", packSize: 20 },
    {
      name: "Amoxicillin Suspension 125mg/5ml",
      category: "Syrup",
      unit: "Bottle",
    },
    { name: "Dextromethorphan Syrup", category: "Syrup", unit: "Bottle" },
    { name: "Paracetamol Syrup 120mg/5ml", category: "Syrup", unit: "Bottle" },
    {
      name: "Oral Rehydration Solution 500ml",
      category: "Others",
      unit: "Bottle",
    },
    { name: "Hydrocortisone 1% Cream", category: "Cream/Oint", unit: "Tube" },
    { name: "Clotrimazole 1% Cream", category: "Cream/Oint", unit: "Tube" },
    { name: "Gentamicin Eye Drops", category: "Others", unit: "Bottle" },
    {
      name: "Sodium Chloride 0.9% 1L",
      category: "Injection",
      unit: "Box",
      packSize: 10,
    },
    {
      name: "Adrenaline 1mg/ml Ampule",
      category: "Injection",
      unit: "Box",
      packSize: 10,
    },
    { name: "Diazepam 10mg", category: "Tablet", unit: "Packet", packSize: 10 },
    {
      name: "Omeprazole 40mg Injection",
      category: "Injection",
      unit: "Box",
      packSize: 10,
    },
    { name: "Povidone Iodine Solution", category: "Others", unit: "Bottle" },
    { name: "Chlorhexidine Solution", category: "Others", unit: "Bottle" },
    { name: "Multivitamin Syrup", category: "Syrup", unit: "Bottle" },
    {
      name: "Vitamin C 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Zinc 20mg", category: "Tablet", unit: "Packet", packSize: 10 },
    {
      name: "Amoxicillin/Clavulanate 625mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Azithromycin 200mg/5ml", category: "Syrup", unit: "Bottle" },
    {
      name: "Acyclovir 800mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Nystatin Oral Suspension", category: "Syrup", unit: "Bottle" },
    {
      name: "Levothyroxine 50mcg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Salbutamol Inhaler 100mcg", category: "Others", unit: "Others" },
    {
      name: "Beclomethasone Inhaler 250mcg",
      category: "Others",
      unit: "Others",
    },
    {
      name: "Montelukast 10mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Erythromycin 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Nitrofurantoin 100mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Metronidazole 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Tinidazole 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Artemether/Lumefantrine 20/120",
      category: "Tablet",
      unit: "Packet",
      packSize: 6,
    },
    {
      name: "Albendazole 400mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 1,
    },
    {
      name: "Mebendazole 100mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 6,
    },
    {
      name: "Ivermectin 12mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 4,
    },
    {
      name: "Praziquantel 600mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 4,
    },
    {
      name: "Fluoxetine 20mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Sertraline 50mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Amitriptyline 25mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Haloperidol 5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Risperidone 2mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Olanzapine 5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Tramadol 50mg", category: "Tablet", unit: "Packet", packSize: 10 },
    {
      name: "Morphine Sulfate 10mg/ml",
      category: "Injection",
      unit: "Box",
      packSize: 10,
    },
    {
      name: "Furosemide 40mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Spironolactone 25mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    { name: "Enalapril 5mg", category: "Tablet", unit: "Packet", packSize: 10 },
    { name: "Ramipril 5mg", category: "Tablet", unit: "Packet", packSize: 10 },
    { name: "Warfarin 5mg", category: "Tablet", unit: "Packet", packSize: 10 },
    {
      name: "Heparin 5000 IU/ml",
      category: "Injection",
      unit: "Box",
      packSize: 10,
    },
    { name: "Aspirin 81mg", category: "Tablet", unit: "Packet", packSize: 10 },
    { name: "Aspirin 300mg", category: "Tablet", unit: "Packet", packSize: 10 },
    {
      name: "Naproxen 500mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Meloxicam 7.5mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Pantoprazole 40mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
    {
      name: "Esomeprazole 40mg",
      category: "Tablet",
      unit: "Packet",
      packSize: 10,
    },
  ];
  // Build docs with pricing and units
  const meds = items.map((it, idx) => {
    const supplier = supplierIds[idx % supplierIds.length];
    const purchase = 8 + (idx % 12) * 3; // vary purchase
    const factor = it.category === "Cosmetics" ? 1.35 : 1.25;
    const batchNumber = "BATCH-" + String(2000 + idx);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 6 + (idx % 18));
    const base = {
      medicineName: it.name,
      category: it.category,
      unit: it.unit,
      batchNumber,
      expiryDate: expiry,
      description: `${it.name} auto-seeded for testing`,
      purchasePrice: purchase,
      supplier,
      createdBy: "seed",
    };

    if (it.unit === "Packet") {
      const packSize = it.packSize || 10;
      const spPack = round2(purchase * factor);
      const spBase = ceil2(spPack / packSize);
      return {
        ...base,
        baseUnit: "Strip",
        packUnit: "Packet",
        packSize,
        sellingPrice: spPack,
        sellingPricePack: spPack,
        sellingPriceBase: spBase,
      };
    } else if (it.unit === "Box") {
      const packSize = it.packSize || 10;
      const spPack = round2(purchase * factor);
      const spBase = ceil2(spPack / packSize);
      return {
        ...base,
        baseUnit: "Ampule",
        packUnit: "Box",
        packSize,
        sellingPrice: spPack,
        sellingPricePack: spPack,
        sellingPriceBase: spBase,
      };
    } else {
      const spBase = round2(purchase * factor);
      return {
        ...base,
        baseUnit: it.unit,
        sellingPrice: spBase,
        sellingPriceBase: spBase,
      };
    }
  });
  return meds;
}

async function wipeData() {
  await Promise.all([
    StockLedger.deleteMany({}),
    StockBalance.deleteMany({}),
    Sale.deleteMany({}),
    Request.deleteMany({}),
  ]);
  await mongoose.connection
    .collection("inventories")
    .deleteMany({})
    .catch(() => {});
  await Medicine.deleteMany({});
  console.log(
    "Wiped ledgers, balances, inventories, sales, requests, and medicines"
  );
}

async function seedStock(meds, store, branches) {
  for (let i = 0; i < meds.length; i++) {
    const m = await Medicine.create(meds[i]);
    // Central GRN in base units
    let baseQty;
    if (m.packUnit && m.packSize > 0) {
      const packs = 20 + ((i * 7) % 40); // 20..59 packs
      baseQty = packs * m.packSize;
    } else {
      baseQty = 80 + ((i * 11) % 120); // 80..199 units
    }
    const grn = await StockLedger.create({
      medicineId: m._id,
      locationId: store._id,
      quantity: baseQty,
      transactionType: "GRN",
      sourceDocType: "SEED",
      sourceDocId: `SEED-${m._id}`,
      unitCost: m.purchasePrice,
      expiryDate: m.expiryDate,
    });
    await StockBalance.updateOne(
      { medicineId: m._id, locationId: store._id },
      {
        $inc: { onHandQty: baseQty },
        $set: { lastTxnAt: new Date(), lastTxnId: grn._id },
      },
      { upsert: true }
    );
    // Distribute to branches: send 30-50% of stock
    const sendTotal = Math.floor(baseQty * (0.3 + (i % 3) * 0.1));
    if (sendTotal > 0 && branches.length) {
      let remaining = sendTotal;
      for (let b = 0; b < branches.length; b++) {
        const portion = Math.floor(
          sendTotal / branches.length +
            (b === 0 ? sendTotal % branches.length : 0)
        );
        if (portion <= 0) continue;
        const out = await StockLedger.create({
          medicineId: m._id,
          locationId: store._id,
          quantity: -portion,
          transactionType: "TRANSFER_OUT",
          sourceDocType: "SEED_XFER",
          sourceDocId: `SEED-${m._id}`,
          createdByUserId: null,
        });
        const inn = await StockLedger.create({
          medicineId: m._id,
          locationId: branches[b]._id,
          quantity: portion,
          transactionType: "TRANSFER_IN",
          sourceDocType: "SEED_XFER",
          sourceDocId: `SEED-${m._id}`,
          createdByUserId: null,
        });
        await StockBalance.updateOne(
          { medicineId: m._id, locationId: store._id },
          {
            $inc: { onHandQty: -portion },
            $set: { lastTxnAt: new Date(), lastTxnId: out._id },
          },
          { upsert: true }
        );
        await StockBalance.updateOne(
          { medicineId: m._id, locationId: branches[b]._id },
          {
            $inc: { onHandQty: portion },
            $set: { lastTxnAt: new Date(), lastTxnId: inn._id },
          },
          { upsert: true }
        );
        remaining -= portion;
        if (remaining <= 0) break;
      }
    }
  }
}

async function run() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB");

  const admin = await ensureAdmin();
  const { branches, store, pharmacy } = await ensureCoreOrgs();
  const supplierIds = await ensureSuppliers();

  console.log("Wiping existing stock and medicines...");
  await wipeData();

  console.log("Building medicine catalog (~50)...");
  const meds = buildMedicineCatalog(supplierIds);

  console.log("Seeding medicines and stock movements...");
  await seedStock(meds, store, branches);

  console.log("Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
