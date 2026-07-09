import request from "supertest";
import app from "../index.js";
import Request from "../models/request.model.js";
import { StockBalance, StockLedger } from "../models/inventory.model.js";
import { createPharmacy, createStore, createBranch, createMedicine, seedStock, createUser, signToken, toCookie } from "./helpers.js";
import mongoose from "mongoose";

describe("Issue #2 — Request lifecycle (Shipped → Received / Reversed)", () => {
  let pharmacy, store, branch, medicine, admin, token, branchUser, branchToken;

  beforeAll(async () => {
    pharmacy = await createPharmacy();
    store = await createStore(pharmacy._id);
    branch = await createBranch(pharmacy._id);
    medicine = await createMedicine(pharmacy._id);
    admin = await createUser({ email: "req-admin@example.com", role: "admin", pharmacy: pharmacy._id });
    token = signToken(admin);
    branchUser = await createUser({ email: "req-branch@example.com", role: "employee", pharmacy: pharmacy._id, branch: branch._id });
    branchToken = signToken(branchUser);
  });

  beforeEach(async () => {
    await Request.deleteMany({});
    await StockBalance.deleteMany({});
    await StockLedger.deleteMany({});
  });

  async function createPendingRequest() {
    const res = await request(app)
      .post("/backend/inventory/request")
      .set("Cookie", toCookie(branchToken))
      .send({ medicineId: medicine._id, quantity: 10, branchId: branch._id })
      .expect(201);
    return res.body.request;
  }

  describe("approveRequest (Pending → Shipped)", () => {
    it("should decrement central stock and increment branch reservedQty", async () => {
      await seedStock(medicine._id, store._id, 50);
      const reqDoc = await createPendingRequest();

      await request(app)
        .post(`/backend/inventory/request/${reqDoc._id}/approve`)
        .set("Cookie", toCookie(token))
        .expect(200);

      const centralBal = await StockBalance.findOne({ medicineId: medicine._id, locationId: store._id });
      expect(Number(centralBal.onHandQty)).toBe(40);

      const branchBal = await StockBalance.findOne({ medicineId: medicine._id, locationId: branch._id });
      expect(Number(branchBal.reservedQty)).toBe(10);
    });

    it("should fail with 400 if central stock is insufficient", async () => {
      await seedStock(medicine._id, store._id, 10);
      const reqDoc = await createPendingRequest();

      // Deplete central stock so approveRequest's safeDecrement fails
      await StockBalance.updateOne(
        { medicineId: medicine._id, locationId: store._id },
        { $set: { onHandQty: 0 } }
      );

      await request(app)
        .post(`/backend/inventory/request/${reqDoc._id}/approve`)
        .set("Cookie", toCookie(token))
        .expect(400);
    });
  });

  describe("confirmReceipt (Shipped → Received)", () => {
    it("should move reservedQty to onHandQty", async () => {
      await seedStock(medicine._id, store._id, 50);
      const reqDoc = await createPendingRequest();

      await request(app)
        .post(`/backend/inventory/request/${reqDoc._id}/approve`)
        .set("Cookie", toCookie(token))
        .expect(200);

      await request(app)
        .post(`/backend/inventory/request/${reqDoc._id}/confirm-receipt`)
        .set("Cookie", toCookie(token))
        .expect(200);

      const branchBal = await StockBalance.findOne({ medicineId: medicine._id, locationId: branch._id });
      expect(Number(branchBal.reservedQty)).toBe(0);
      expect(Number(branchBal.onHandQty)).toBe(10);
    });
  });

  describe("reverseShipment (Shipped → Reversed)", () => {
    it("should restore central stock and clear branch reservedQty", async () => {
      await seedStock(medicine._id, store._id, 50);
      const reqDoc = await createPendingRequest();

      await request(app)
        .post(`/backend/inventory/request/${reqDoc._id}/approve`)
        .set("Cookie", toCookie(token))
        .expect(200);

      await request(app)
        .post(`/backend/inventory/request/${reqDoc._id}/reverse`)
        .set("Cookie", toCookie(token))
        .expect(200);

      const centralBal = await StockBalance.findOne({ medicineId: medicine._id, locationId: store._id });
      expect(Number(centralBal.onHandQty)).toBe(50);

      const branchBal = await StockBalance.findOne({ medicineId: medicine._id, locationId: branch._id });
      expect(Number(branchBal.reservedQty)).toBe(0);
    });
  });
});
