import express from "express";
import mongoose from "mongoose";
import { config } from "dotenv";
import cors from "cors";
import helmet from "helmet";
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

// Centralized connection logic ensuring single persistent connection
import { connectDB } from "./db.js";
import { ensureSuperAdmin } from "./bootstrap/superadmin.js";

async function start() {
  console.log(
    "[Startup] Initializing API server (API-only mode, no frontend rendering)"
  );
  try {
    await connectDB(MONGO_URL);
    console.log("[Startup] MongoDB connected (persistent single connection)");
  } catch (err) {
    console.error("[FATAL] Could not connect to MongoDB:", err.message);
    return process.exit(1);
  }
  // Ensure super admin exists (env based or fallback) BEFORE migrations (in case migrations rely on permissions later)
  try {
    await ensureSuperAdmin();
  } catch (e) {
    console.warn("[SuperAdmin] ensure failed:", e.message);
  }
  await runMigrationsAndSeeding();
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}
const __dirname = path.resolve();
const app = express();
// When sitting behind a proxy (e.g. reverse proxy / cloud), trust first hop for secure cookies
app.set("trust proxy", 1);

// Build dynamic list of allowed origins from env:
// FRONTEND_ORIGIN (single) or FRONTEND_ORIGINS (comma separated)
const origins = new Set();
if (process.env.FRONTEND_ORIGIN) origins.add(process.env.FRONTEND_ORIGIN);
if (process.env.FRONTEND_ORIGINS) {
  process.env.FRONTEND_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => origins.add(o));
}
// Always include localhost dev ports commonly used
origins.add("http://localhost:5173");
origins.add("http://127.0.0.1:5173");

const allowOrigins = Array.from(origins);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser or same-origin requests (no Origin header)
      if (!origin) return cb(null, true);
      // Allow Electron desktop apps (file://) which appear as Origin: null
      if (origin === "null") return cb(null, true);
      // Allow configured web origins
      if (allowOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS origin denied"));
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Security headers via helmet (disable CSP here because frontend sets meta CSP)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// JSON body parsing with limit
app.use(express.json({ limit: "1mb" }));
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
import saleRouter from "./routes/sale.route.js";
app.use("/backend/sales", saleRouter);
import superAdminRouter from "./routes/superadmin.route.js";
app.use("/backend/superadmin", superAdminRouter);
import maintenanceRouter from "./routes/maintenance.route.js";
app.use("/backend/maintenance", maintenanceRouter);

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

// Optional debug: list routes at startup if DEBUG_ROUTES=1
if (process.env.DEBUG_ROUTES === "1") {
  setTimeout(() => {
    try {
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
            acc.push(...walk(l.handle.stack, prefix));
          }
        });
        return acc;
      };
      const all = walk(app._router.stack).filter((r) => r.path?.startsWith("/backend"));
      console.log(`[Routes] Registered ${all.length} backend routes`);
    } catch (e) {
      console.warn("[Routes] Failed to enumerate routes:", e.message);
    }
  }, 500);
}

// JSON 404 for any /backend path not matched (avoid default HTML)
app.use("/backend", (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  // If we reached here no route matched under /backend
  if (!res.headersSent) {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      message: `Not found: ${req.originalUrl}`,
    });
  }
  next();
});

app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  // Provide a normalized error shape
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

start();
