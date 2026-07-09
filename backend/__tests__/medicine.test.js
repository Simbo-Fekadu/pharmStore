import request from "supertest";
import app from "../index.js";
import Medicine from "../models/medicine.model.js";
import { createPharmacy, createStore, createBranch, createUser, signToken, toCookie } from "./helpers.js";

describe("Issue #3 — Server-side expiry filtering", () => {
  let pharmacy, store, branch, user, token;
  const DAY = 24 * 60 * 60 * 1000;

  beforeAll(async () => {
    pharmacy = await createPharmacy();
    store = await createStore(pharmacy._id);
    branch = await createBranch(pharmacy._id);
    user = await createUser({ email: "med-test@example.com", role: "admin", pharmacy: pharmacy._id, branch: branch._id });
    token = signToken(user);
  });

  beforeEach(async () => {
    await Medicine.deleteMany({});
  });

  const baseMedicine = {
    category: "MISCELLANEOUS",
    unit: "Packet",
    baseUnit: "Strip",
    packUnit: "Packet",
    packSize: 10,
    purchasePrice: 100,
  };

  it("GET /medicine/near-expiry should only return medicines expiring within threshold", async () => {
    const farFuture = new Date(Date.now() + 365 * DAY);
    const nearFuture = new Date(Date.now() + 15 * DAY);
    const alreadyExpired = new Date(Date.now() - 5 * DAY);

    await Medicine.create([
      { medicineName: "Far Future", ...baseMedicine, batchNumber: "B1", expiryDate: farFuture, pharmacy: pharmacy._id },
      { medicineName: "Near Expiry", ...baseMedicine, batchNumber: "B2", expiryDate: nearFuture, pharmacy: pharmacy._id },
      { medicineName: "Expired One", ...baseMedicine, batchNumber: "B3", expiryDate: alreadyExpired, pharmacy: pharmacy._id },
    ]);

    const res = await request(app)
      .get("/backend/medicine/near-expiry")
      .set("Cookie", toCookie(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    const names = res.body.medicines.map((m) => m.medicineName);
    expect(names).not.toContain("Far Future");
    expect(names).toContain("Near Expiry");
  });

  it("GET /medicine/expired should only return expired medicines", async () => {
    const future = new Date(Date.now() + 100 * DAY);
    const expired = new Date(Date.now() - 10 * DAY);

    await Medicine.create([
      { medicineName: "Good Medicine", ...baseMedicine, batchNumber: "B4", expiryDate: future, pharmacy: pharmacy._id },
      { medicineName: "Bad Medicine", ...baseMedicine, batchNumber: "B5", expiryDate: expired, pharmacy: pharmacy._id },
    ]);

    const res = await request(app)
      .get("/backend/medicine/expired")
      .set("Cookie", toCookie(token))
      .expect(200);

    expect(res.body.success).toBe(true);
    const names = res.body.medicines.map((m) => m.medicineName);
    expect(names).not.toContain("Good Medicine");
    expect(names).toContain("Bad Medicine");
  });
});
