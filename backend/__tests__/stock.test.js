import request from "supertest";
import app from "../index.js";
import { StockBalance, StockLedger } from "../models/inventory.model.js";
import { createPharmacy, createStore, createBranch, createMedicine, seedStock, createUser, signToken, toCookie } from "./helpers.js";
import { safeDecrement } from "../services/stock.service.js";
import mongoose from "mongoose";

describe("Issue #1 + #6 — Stock single source of truth & atomic decrement", () => {
  let pharmacy, store, branch, medicine, admin, token;

  beforeAll(async () => {
    pharmacy = await createPharmacy();
    store = await createStore(pharmacy._id);
    branch = await createBranch(pharmacy._id);
    medicine = await createMedicine(pharmacy._id);
    admin = await createUser({ email: "stock-admin@example.com", role: "admin", pharmacy: pharmacy._id, branch: branch._id });
    token = signToken(admin);
  });

  beforeEach(async () => {
    await StockBalance.deleteMany({});
    await StockLedger.deleteMany({});
  });

  describe("safeDecrement — atomic sufficiency guard", () => {
    it("should decrement when stock is sufficient", async () => {
      await seedStock(medicine._id, store._id, 100);

      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await safeDecrement({ medicineId: medicine._id, locationId: store._id, quantity: 30, ledgerId: new mongoose.Types.ObjectId(), session });
        await session.commitTransaction();
      } finally {
        session.endSession();
      }

      const bal = await StockBalance.findOne({ medicineId: medicine._id, locationId: store._id });
      expect(bal.onHandQty).toBe(70);
    });

    it("should throw when stock is insufficient", async () => {
      await seedStock(medicine._id, store._id, 10);

      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await expect(
          safeDecrement({ medicineId: medicine._id, locationId: store._id, quantity: 20, ledgerId: new mongoose.Types.ObjectId(), session })
        ).rejects.toThrow(/Insufficient stock/);
      } finally {
        session.endSession();
      }

      const bal = await StockBalance.findOne({ medicineId: medicine._id, locationId: store._id });
      expect(bal.onHandQty).toBe(10);
    });

    it("should prevent overselling under concurrent requests", async () => {
      await seedStock(medicine._id, store._id, 50);

      const ledgerId1 = new mongoose.Types.ObjectId();
      const ledgerId2 = new mongoose.Types.ObjectId();

      const session1 = await mongoose.startSession();
      const session2 = await mongoose.startSession();

      session1.startTransaction();
      session2.startTransaction();

      const p1 = safeDecrement({ medicineId: medicine._id, locationId: store._id, quantity: 40, ledgerId: ledgerId1, session: session1 })
        .then(() => session1.commitTransaction())
        .catch(() => session1.abortTransaction());

      const p2 = safeDecrement({ medicineId: medicine._id, locationId: store._id, quantity: 20, ledgerId: ledgerId2, session: session2 })
        .then(() => session2.commitTransaction())
        .catch(() => session2.abortTransaction());

      await Promise.allSettled([p1, p2]);

      session1.endSession();
      session2.endSession();

      const bal = await StockBalance.findOne({ medicineId: medicine._id, locationId: store._id });
      expect(bal.onHandQty).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Issue #1 — single source of truth", () => {
    it("getStock endpoint should reflect StockBalance only", async () => {
      await seedStock(medicine._id, store._id, 75);

      const res = await request(app)
        .get(`/backend/inventory/stock?locationId=${store._id}`)
        .set("Cookie", toCookie(token))
        .expect(200);

      expect(res.body.success).toBe(true);
      const match = res.body.balances.find((s) => String(s.medicineId?._id || s.medicineId) === String(medicine._id));
      expect(match).toBeDefined();
      expect(Number(match.onHandQty)).toBe(75);
    });
  });
});
