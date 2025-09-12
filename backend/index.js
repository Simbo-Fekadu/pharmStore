import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import medicineRouter from "./routes/medicine.route.js";
import inventoryRouter from "./routes/inventory.route.js";
import locationRouter from "./routes/location.route.js";
import supplierRouter from "./routes/supplier.route.js";
import branchRouter from "./routes/branch.route.js";
import chatRouter from "./routes/chat.route.js";
import cookieParser from "cookie-parser";
import path from "path";
import Branch from "./models/branch.model.js";
import Store from "./models/store.model.js";
import Medicine from "./models/medicine.model.js"; // for migration / index maintenance

config();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const JWT_SECRET = process.env.SECRET;
if (!MONGO_URL) {
  console.error("[FATAL] MONGO_URL is not defined in environment (.env)");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error(
    "[FATAL] SECRET (JWT secret) is not defined in environment (.env)"
  );
  process.exit(1);
}

mongoose.connection.on("error", (err) => {
  console.error("[MongoDB] connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] disconnected");
});

async function runMigrationsAndSeeding() {
  try {
    const count = await Branch.countDocuments();
    if (count === 0) {
      await Branch.insertMany([
        { name: "Branch Ayat", address: "Ayat" },
        { name: "Branch Tafo", address: "Tafo" },
        { name: "Branch Kazanchis", address: "Kazanchis" },
      ]);
      console.log("Seeded default branches");
    }
  } catch (seedErr) {
    console.warn("Branch seeding failed:", seedErr.message);
  }
  try {
    const storeCount = await Store.countDocuments();
    if (storeCount === 0) {
      await Store.create({ name: "Central Store", address: "Head Office" });
      console.log("Seeded central store");
    }
  } catch (storeErr) {
    console.warn("Store seeding failed", storeErr.message);
  }
  try {
    const coll = Medicine.collection;
    const indexes = await coll.indexes();
    for (const idx of indexes) {
      if (
        idx.name.includes("batchNo") ||
        idx.name === "barcode_1" ||
        idx.name === "batchNumber_1" ||
        idx.name === "batchNumber_1_isDeleted_1" ||
        idx.name === "uniq_active_batchNumber"
      ) {
        try {
          await coll.dropIndex(idx.name);
          console.log("Dropped legacy medicine index:", idx.name);
        } catch (e) {
          console.warn("Failed dropping legacy index", idx.name, e.message);
        }
      }
    }
    const legacyCount = await coll.countDocuments({
      batchNo: { $exists: true },
    });
    if (legacyCount > 0) {
      const cursor = coll.find({ batchNo: { $exists: true } });
      let migrated = 0;
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const bn = doc.batchNo;
        const update = { $unset: { batchNo: "" } };
        if (!doc.batchNumber && typeof bn === "string" && bn.trim()) {
          update.$set = { batchNumber: bn.trim() };
        }
        await coll.updateOne({ _id: doc._id }, update);
        migrated++;
      }
      console.log(
        `Migrated ${migrated} medicine docs from batchNo -> batchNumber`
      );
    }
    const flagged = await coll.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    );
    if (flagged.modifiedCount) {
      console.log(
        `Backfilled isDeleted=false on ${flagged.modifiedCount} medicine docs`
      );
    }
    await coll
      .createIndex(
        { batchNumber: 1, supplier: 1, isDeleted: 1 },
        {
          name: "uniq_batch_per_supplier",
          unique: true,
          partialFilterExpression: {
            batchNumber: { $type: "string", $ne: "" },
            supplier: { $type: "objectId" },
            isDeleted: false,
          },
        }
      )
      .catch(() => {});
    const removedBarcodes = await coll.updateMany(
      { barcode: { $exists: true } },
      { $unset: { barcode: "" } }
    );
    if (removedBarcodes.modifiedCount) {
      console.log(
        `Removed barcode field from ${removedBarcodes.modifiedCount} medicines`
      );
    }
  } catch (migErr) {
    console.warn("Medicine migration skipped:", migErr.message);
  }
}

async function start() {
  console.log("Connecting to MongoDB ...");
  try {
    await mongoose.connect(MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      // You can uncomment the next line to immediately error instead of buffering if disconnected:
      // bufferCommands: false,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("[FATAL] Could not connect to MongoDB:", err.message);
    return process.exit(1);
  }

  await runMigrationsAndSeeding();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
const __dirname = path.resolve();
const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_ORIGIN].filter(
      Boolean
    ),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

if (process.env.DEBUG_REQ === "1") {
  app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    next();
  });
}

import userRouter from "./routes/user.route.js";
app.use("/backend/auth", authRouter);
app.use("/backend/medicine", medicineRouter);
app.use("/backend/inventory", inventoryRouter);
app.use("/backend/location", locationRouter);
app.use("/backend/user", userRouter);
app.use("/backend/supplier", supplierRouter);
app.use("/backend/branch", branchRouter);
app.use("/backend/chat", chatRouter);

app.get("/backend/ping", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/backend/_routes", (_req, res) => {
  const walk = (stack, prefix = "") => {
    const acc = [];
    stack.forEach((l) => {
      if (l.route) {
        const p = prefix + l.route.path;
        const methods = Object.keys(l.route.methods)
          .filter((m) => l.route.methods[m])
          .map((m) => m.toUpperCase());
        acc.push({ path: p, methods });
      } else if (l.name === "router" && l.handle?.stack) {
        let segment = "";
        if (l.regexp && l.regexp.source) {
          const src = l.regexp.source;
          const m = src.match(/\^\\\\\/(backend[^\\]*)/);
          if (m && m[1]) segment = "/" + m[1].replace(/\\\\\//g, "/");
        }
        acc.push(...walk(l.handle.stack, prefix + segment));
      }
    });
    return acc;
  };
  try {
    const all = walk(app._router.stack).filter((r) =>
      r.path.startsWith("/backend")
    );
    res.json({ count: all.length, routes: all });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

start();
