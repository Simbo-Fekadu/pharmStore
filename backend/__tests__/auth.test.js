import request from "supertest";
import app from "../index.js";
import User from "../models/user.model.js";
import Supplier from "../models/supplier.model.js";
import { createUser, signToken, createPharmacy, toCookie } from "./helpers.js";

describe("Issue #5 — Auth hardening", () => {
  let pharmacy;
  beforeAll(async () => {
    pharmacy = await createPharmacy();
  });

  describe("signin response", () => {
    it("should NOT return a token in the JSON body", async () => {
      const user = await createUser({ email: "signin-test@example.com", role: "admin", pharmacy: pharmacy._id });
      const res = await request(app)
        .post("/backend/auth/signin")
        .send({ email: "signin-test@example.com", password: "password123" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeUndefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("signin-test@example.com");
    });

    it("should set an httpOnly cookie", async () => {
      const user = await createUser({ email: "cookie-test@example.com", role: "admin", pharmacy: pharmacy._id });
      const res = await request(app)
        .post("/backend/auth/signin")
        .send({ email: "cookie-test@example.com", password: "password123" });

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith("access_token="));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain("HttpOnly");
    });
  });

  describe("POST /auth/refresh", () => {
    it("should issue a new cookie when given a valid token", async () => {
      const user = await createUser({ email: "refresh-test@example.com", role: "employee", pharmacy: pharmacy._id });
      const token = signToken(user);

      const res = await request(app)
        .post("/backend/auth/refresh")
        .set("Cookie", toCookie(token))
        .expect(200);

      expect(res.body.success).toBe(true);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const newCookie = cookies.find((c) => c.startsWith("access_token="));
      expect(newCookie).toBeDefined();
      expect(newCookie).not.toBe(token);
    });

    it("should return 401 when no cookie is sent", async () => {
      await request(app)
        .post("/backend/auth/refresh")
        .expect(401);
    });
  });

  describe("requireAdmin middleware on supplier routes", () => {
    it("should allow admin to create a supplier", async () => {
      const user = await createUser({ email: "admin-supplier@example.com", role: "admin", pharmacy: pharmacy._id });
      const token = signToken(user);

      const res = await request(app)
        .post("/backend/supplier")
        .set("Cookie", toCookie(token))
        .send({ supplierName: "Test Supplier", phoneNumber: "123" })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it("should reject employee creating a supplier with 403", async () => {
      const user = await createUser({ email: "emp-supplier@example.com", role: "employee", pharmacy: pharmacy._id });
      const token = signToken(user);

      await request(app)
        .post("/backend/supplier")
        .set("Cookie", toCookie(token))
        .send({ name: "Should Fail", contact: "000" })
        .expect(403);
    });
  });

  describe("requireAdmin middleware on export route", () => {
    it("should allow admin to access export", async () => {
      const user = await createUser({ email: "admin-export@example.com", role: "admin", pharmacy: pharmacy._id });
      const token = signToken(user);

      const res = await request(app)
        .get("/backend/export/data?type=users&preview=true")
        .set("Cookie", toCookie(token))
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("should reject employee accessing export with 403", async () => {
      const user = await createUser({ email: "emp-export@example.com", role: "employee", pharmacy: pharmacy._id });
      const token = signToken(user);

      await request(app)
        .get("/backend/export/data")
        .set("Cookie", toCookie(token))
        .expect(403);
    });
  });
});
