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
// Support either MONGO_URL or MONGO_URI; fall back to a sensible local default for
// developer convenience. In production you should set MONGO_URL / MONGO_URI.
const MONGO_URL =
  process.env.MONGO_URL ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/pharmstore";
const JWT_SECRET = process.env.SECRET;
if (!process.env.MONGO_URL && !process.env.MONGO_URI) {
  console.warn(
    "[WARN] No MONGO_URL / MONGO_URI set; defaulting to local MongoDB at mongodb://localhost:27017/pharmstore"
  );
}
// JWT secret is required; fail fast if missing.
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
    const PharmacyModel = (await import("./models/pharmacy.model.js")).default;
    let pharmacy = await PharmacyModel.findOne({ code: "ZELALEM" });
    if (!pharmacy) {
      pharmacy = await PharmacyModel.create({
        name: "Zelalem Pharmacy",
        code: "ZELALEM",
      });
    }
    const pid = pharmacy._id;
    const count = await Branch.countDocuments({ pharmacy: pid });
    if (count === 0) {
      await Branch.insertMany([
        { name: "Branch Ayat", address: "Ayat", pharmacy: pid },
        { name: "Branch Tafo", address: "Tafo", pharmacy: pid },
        { name: "Branch Kazanchis", address: "Kazanchis", pharmacy: pid },
      ]);
      console.log("Seeded default branches");
    }
  } catch (seedErr) {
    console.warn("Branch seeding failed:", seedErr.message);
  }
  try {
    const PharmacyModel = (await import("./models/pharmacy.model.js")).default;
    let pharmacy = await PharmacyModel.findOne({ code: "ZELALEM" });
    if (!pharmacy) {
      pharmacy = await PharmacyModel.create({
        name: "Zelalem Pharmacy",
        code: "ZELALEM",
      });
    }
    const pid = pharmacy._id;
    const storeCount = await Store.countDocuments({ pharmacy: pid });
    if (storeCount === 0) {
      await Store.create({
        name: "Central Store",
        address: "Head Office",
        pharmacy: pid,
      });
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
import { ensureDefaultPharmacyAndBackfill } from "./bootstrap/pharmacy.js";

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
  // Ensure default pharmacy and legacy backfill
  try {
    await ensureDefaultPharmacyAndBackfill();
  } catch (e) {
    console.warn("[PharmacyBootstrap] ensure failed:", e.message);
  }
  await runMigrationsAndSeeding();
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });

  // Optional Atlas background sync
  try {
    const enableBg = process.env.ATLAS_SYNC_BACKGROUND === "1";
    const atlasUri = process.env.MONGO_ATLAS_URL;
    const intervalMs = Number(process.env.ATLAS_SYNC_INTERVAL_MS || 300000); // default 5 min
    if (enableBg && atlasUri) {
      const { connectAtlas, getAtlasConnection, runAtlasSync } = await import(
        "./services/atlasSync.service.js"
      );
      // Small helper to ensure atlas connection, retry if offline
      const ensureAtlas = async () => {
        try {
          const conn = getAtlasConnection();
          if (!conn || conn.readyState !== 1) {
            await connectAtlas(atlasUri);
            console.log("[AtlasSync] Connected to Atlas");
          }
        } catch (e) {
          console.warn("[AtlasSync] connect retry failed:", e.message);
        }
      };
      // Try initial connect but don't crash if offline
      await ensureAtlas();
      setInterval(async () => {
        await ensureAtlas();
        try {
          const res = await runAtlasSync({ logger: console });
          console.log(
            "[AtlasSync] background run result:",
            JSON.stringify(res)
          );
        } catch (e) {
          console.warn("[AtlasSync] background run error:", e.message);
        }
      }, intervalMs);
      console.log(
        `[AtlasSync] Background sync enabled every ${intervalMs}ms (MONGO_ATLAS_URL present)`
      );
    } else {
      if (enableBg && !atlasUri) {
        console.warn(
          "[AtlasSync] ATLAS_SYNC_BACKGROUND=1 but MONGO_ATLAS_URL is not set"
        );
      }
    }
  } catch (e) {
    console.warn("[AtlasSync] scheduler init failed:", e.message);
  }
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
import Pharmacy from "./models/pharmacy.model.js";
import exportRouter from "./routes/export.route.js";
app.use("/backend/export", exportRouter);
import syncRouter from "./routes/sync.route.js";
app.use("/backend/sync", syncRouter);

// Temporary migration route (super admin only) to backfill pharmacy
app.post("/backend/maintenance/backfill-pharmacy", async (req, res) => {
  try {
    // Minimal auth: ensure token + super admin
    const authHeader = req.headers.authorization || "";
    if (
      !req.cookies.access_token &&
      !authHeader.toLowerCase().startsWith("bearer")
    ) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // Lazy decode to read role without full verify (reuse verifyToken ideally, but keeping isolated)
    // eslint-disable-next-line global-require
    const jwt = await import("jsonwebtoken");
    let token = req.cookies.access_token;
    if (!token && authHeader.toLowerCase().startsWith("bearer "))
      token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.default.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (payload.role !== "super_admin")
      return res.status(403).json({ success: false, message: "Forbidden" });

    let pharmacy = await Pharmacy.findOne({ code: "ZELALEM" });
    if (!pharmacy) {
      pharmacy = await Pharmacy.create({
        name: "Zelalem Pharmacy",
        code: "ZELALEM",
        address: "",
      });
    }
    const pid = pharmacy._id;
    const User = (await import("./models/user.model.js")).default;
    const Branch = (await import("./models/branch.model.js")).default;
    const Medicine = (await import("./models/medicine.model.js")).default;
    const Supplier = (await import("./models/supplier.model.js")).default;
    const Request = (await import("./models/request.model.js")).default;

    const ops = await Promise.all([
      User.updateMany(
        { role: { $ne: "super_admin" }, pharmacy: { $exists: false } },
        { $set: { pharmacy: pid } }
      ),
      Branch.updateMany(
        { pharmacy: { $exists: false } },
        { $set: { pharmacy: pid } }
      ),
      Medicine.updateMany(
        { pharmacy: { $exists: false } },
        { $set: { pharmacy: pid } }
      ),
      Supplier.updateMany(
        { pharmacy: { $exists: false } },
        { $set: { pharmacy: pid } }
      ),
      Request.updateMany(
        { pharmacy: { $exists: false } },
        { $set: { pharmacy: pid } }
      ).catch(() => ({ modifiedCount: 0 })),
    ]);
    res.json({
      success: true,
      message: "Backfill complete",
      modified: ops.map((o) => o.modifiedCount),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

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

// Lightweight health endpoint (some legacy builds call /backend/health/ping)
app.get("/backend/health/ping", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Placeholder bulk sync endpoint to satisfy legacy offline sync callers.
// Query: /backend/sync/bulk/changes?models=a,b,c&limit=400
// Returns: { success:true, changes: { model: [] } }
app.get("/backend/sync/bulk/changes", (req, res) => {
  try {
    const modelsParam = req.query.models || "";
    const list = String(modelsParam)
      .split(/[,\s]/)
      .map((m) => m.trim())
      .filter(Boolean);
    const changes = {};
    list.forEach((m) => (changes[m] = []));
    res.json({ success: true, changes, lastCursor: null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
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
      const all = walk(app._router.stack).filter((r) =>
        r.path?.startsWith("/backend")
      );
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
