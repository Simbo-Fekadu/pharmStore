import request from "supertest";
import app from "../index.js";
import Sale from "../models/sale.model.js";
import { StockBalance, StockLedger } from "../models/inventory.model.js";
import { createPharmacy, createStore, createBranch, createMedicine, seedStock, createUser, signToken, toCookie } from "./helpers.js";

describe("Issue #4 — Sales refund restores stock", () => {
  let pharmacy, store, branch, medicine, admin, token, employee, employeeToken;

  beforeAll(async () => {
    pharmacy = await createPharmacy();
    store = await createStore(pharmacy._id);
    branch = await createBranch(pharmacy._id);
    medicine = await createMedicine(pharmacy._id);
    admin = await createUser({ email: "sale-admin@example.com", role: "admin", pharmacy: pharmacy._id, branch: branch._id });
    token = signToken(admin);
    employee = await createUser({ email: "sale-emp@example.com", role: "employee", pharmacy: pharmacy._id, branch: branch._id });
    employeeToken = signToken(employee);
  });

  beforeEach(async () => {
    await Sale.deleteMany({});
    await StockBalance.deleteMany({});
    await StockLedger.deleteMany({});
  });

  async function createSale() {
    await seedStock(medicine._id, branch._id, 50);
    const res = await request(app)
      .post("/backend/sales")
      .set("Cookie", toCookie(employeeToken))
      .send({
        medicineId: medicine._id,
        quantity: 5,
        price: 100,
        unit: "tablet",
        employeeId: employee._id,
      })
      .expect(201);
    return res.body.sale;
  }

  describe("createSale", () => {
    it("should decrement branch stock", async () => {
      const sale = await createSale();
      expect(sale).toBeDefined();

      const bal = await StockBalance.findOne({ medicineId: medicine._id, locationId: branch._id });
      expect(Number(bal.onHandQty)).toBe(45);
    });

    it("should fail with 400 if branch stock is insufficient", async () => {
      await seedStock(medicine._id, branch._id, 2);

      await request(app)
        .post("/backend/sales")
        .set("Cookie", toCookie(employeeToken))
        .send({
          medicineId: medicine._id,
          quantity: 5,
          price: 100,
          unit: "tablet",
          employeeId: employee._id,
        })
        .expect(409);
    });
  });

  describe("refundSale", () => {
    it("should restore branch stock and mark sale as refunded", async () => {
      const sale = await createSale();

      const refundRes = await request(app)
        .post(`/backend/sales/${sale._id}/refund`)
        .set("Cookie", toCookie(token))
        .send({ note: "Customer returned" })
        .expect(200);

      expect(refundRes.body.success).toBe(true);

      const bal = await StockBalance.findOne({ medicineId: medicine._id, locationId: branch._id });
      expect(Number(bal.onHandQty)).toBe(50);

      const updatedSale = await Sale.findById(sale._id);
      expect(updatedSale.refundedAt).toBeDefined();
      expect(updatedSale.refundNote).toBe("Customer returned");
    });

    it("should reject refund by non-admin with 403", async () => {
      const sale = await createSale();

      await request(app)
        .post(`/backend/sales/${sale._id}/refund`)
        .set("Cookie", toCookie(employeeToken))
        .send({ note: "test" })
        .expect(403);
    });
  });
});
