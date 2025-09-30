/*
 Migration: Wrap legacy single-tenant data into default Pharmacy "Zelalem Pharmacy".
 Idempotent: safe to run multiple times. It will:
 1. Ensure Pharmacy { code: 'ZELALEM' } exists.
 2. Assign its _id to any User (non super_admin) / Branch / Medicine / Supplier / Request / ChatMessage missing pharmacy.
 3. Backfill ChatMessage.pharmacy (new field) by inferring via senderId's pharmacy if available; otherwise sets to default pharmacy.

 Usage (from backend folder):
   node scripts/migrate_wrap_zelalem.js
 Make sure MONGO connection env vars are loaded (.env) or set MONGO before running.
*/
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Pharmacy from "../models/pharmacy.model.js";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";
import Medicine from "../models/medicine.model.js";
import Supplier from "../models/supplier.model.js";
import Request from "../models/request.model.js";
import ChatMessage from "../models/chat.model.js";

async function run() {
  const uri =
    process.env.MONGO_URL ||
    process.env.MONGO ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/pharmstore";
  await mongoose.connect(uri);
  console.log("[migrate] Connected");
  let pharmacy = await Pharmacy.findOne({ code: "ZELALEM" });
  if (!pharmacy) {
    pharmacy = await Pharmacy.create({
      name: "Zelalem Pharmacy",
      code: "ZELALEM",
      address: "",
    });
    console.log("[migrate] Created pharmacy ZELALEM");
  } else {
    console.log("[migrate] Pharmacy already exists");
  }
  const pid = pharmacy._id;
  const ops = [];
  ops.push(
    User.updateMany(
      {
        role: { $ne: "super_admin" },
        $or: [{ pharmacy: { $exists: false } }, { pharmacy: null }],
      },
      { $set: { pharmacy: pid } }
    )
  );
  ops.push(
    Branch.updateMany(
      { $or: [{ pharmacy: { $exists: false } }, { pharmacy: null }] },
      { $set: { pharmacy: pid } }
    )
  );
  ops.push(
    Medicine.updateMany(
      { $or: [{ pharmacy: { $exists: false } }, { pharmacy: null }] },
      { $set: { pharmacy: pid } }
    )
  );
  ops.push(
    Supplier.updateMany(
      { $or: [{ pharmacy: { $exists: false } }, { pharmacy: null }] },
      { $set: { pharmacy: pid } }
    )
  );
  ops.push(
    Request.updateMany(
      { $or: [{ pharmacy: { $exists: false } }, { pharmacy: null }] },
      { $set: { pharmacy: pid } }
    )
  );
  const results = await Promise.all(ops);
  const labels = ["users", "branches", "medicines", "suppliers", "requests"];
  labels.forEach((l, i) =>
    console.log(`[migrate] ${l} modified:`, results[i].modifiedCount)
  );

  // Chat messages: assign pharmacy if missing
  const chatNoPharmacy = await ChatMessage.find({
    $or: [{ pharmacy: { $exists: false } }, { pharmacy: null }],
  })
    .limit(2000)
    .lean();
  if (chatNoPharmacy.length) {
    const senderIds = [
      ...new Set(chatNoPharmacy.map((c) => c.senderId).filter(Boolean)),
    ];
    const senders = await User.find({ _id: { $in: senderIds } })
      .select("_id pharmacy")
      .lean();
    const senderMap = senders.reduce((a, u) => {
      a[u._id.toString()] = u.pharmacy || pid;
      return a;
    }, {});
    const bulk = ChatMessage.collection.initializeUnorderedBulkOp();
    chatNoPharmacy.forEach((m) => {
      const targetPid = senderMap[m.senderId?.toString()] || pid;
      bulk.find({ _id: m._id }).updateOne({ $set: { pharmacy: targetPid } });
    });
    const bulkRes = await bulk.execute();
    console.log(
      "[migrate] chat messages updated:",
      bulkRes.nModified || bulkRes.modifiedCount || 0
    );
  } else {
    console.log("[migrate] no chat messages missing pharmacy");
  }

  await mongoose.disconnect();
  console.log("[migrate] Done");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
