import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Supplier from "../models/supplier.model.js";
import Medicine from "../models/medicine.model.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) {
  console.error("MONGO_URL not set in environment");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB");

  // 1. Ensure admin user
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
  } else {
    console.log("Admin user already exists:", admin.username);
  }

  // 2. Seed suppliers
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
  ];
  for (const s of supplierSeeds) {
    const exists = await Supplier.findOne({ supplierName: s.supplierName });
    if (!exists) {
      await Supplier.create(s);
      console.log("Added supplier:", s.supplierName);
    }
  }
  const suppliers = await Supplier.find();
  const supplierIds = suppliers.map((s) => s._id);

  // 3. Seed medicines (sample diverse data)
  const medSeeds = [];
  const categories = [
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Cream/Oint",
    "Cosmetics",
    "Others",
  ];
  const units = ["Packet", "Strip", "Tube", "Bottle"];
  for (let i = 1; i <= 40; i++) {
    const category = categories[i % categories.length];
    const unit = units[i % units.length];
    const supplier = supplierIds[i % supplierIds.length];
    const purchasePrice = 5 + (i % 10) * 2; // vary price
    const quantity = 50 + ((i * 3) % 200);
    const batchNumber = "BATCH-" + String(1000 + i);
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6 + (i % 12));
    medSeeds.push({
      medicineName: `Medicine ${i}`,
      brand: `Brand ${(i % 5) + 1}`,
      category,
      unit,
      batchNumber,
      expiryDate,
      purchasePrice,
      quantity,
      supplier,
      createdBy: "seed",
    });
  }

  // Insert only new batchNumbers to avoid duplicates
  for (const med of medSeeds) {
    const exists = await Medicine.findOne({
      batchNumber: med.batchNumber,
      supplier: med.supplier,
      isDeleted: false,
    });
    if (!exists) {
      try {
        await Medicine.create(med);
        console.log("Added medicine:", med.medicineName);
      } catch (e) {
        console.warn("Skip medicine", med.medicineName, e.message);
      }
    }
  }

  console.log("Seeding complete.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
