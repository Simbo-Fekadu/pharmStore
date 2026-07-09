import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Pharmacy from "../models/pharmacy.model.js";
import Store from "../models/store.model.js";
import Branch from "../models/branch.model.js";
import Medicine from "../models/medicine.model.js";
import { StockBalance } from "../models/inventory.model.js";
import bcryptjs from "bcryptjs";

const SECRET = process.env.SECRET || "test-secret";
let counter = 1;

function nextVal() {
  return counter++;
}

export async function createPharmacy(overrides = {}) {
  return Pharmacy.create({ name: "Test Pharmacy", code: `TEST${nextVal()}`, ...overrides });
}

export async function createStore(pharmacyId, overrides = {}) {
  return Store.create({ name: "Central Store", pharmacy: pharmacyId, ...overrides });
}

export async function createBranch(pharmacyId, overrides = {}) {
  return Branch.create({ name: "Test Branch", pharmacy: pharmacyId, ...overrides });
}

export async function createUser(overrides = {}) {
  const n = nextVal();
  const password = overrides.password || "password123";
  const hashed = bcryptjs.hashSync(password, 10);
  const user = await User.create({
    username: `testuser${n}`,
    email: `test${n}@example.com`,
    password: hashed,
    role: "employee",
    ...overrides,
    username: overrides.username || `testuser${n}`,
    email: overrides.email || `test${n}@example.com`,
  });
  return user;
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      branch: user.branch || undefined,
      pharmacy: user.pharmacy || undefined,
    },
    SECRET,
    { expiresIn: "3d" }
  );
}

export async function createMedicine(pharmacyId, overrides = {}) {
  const n = nextVal();
  return Medicine.create({
    medicineName: `Test Medicine ${n}`,
    category: "MISCELLANEOUS",
    unit: "Packet",
    baseUnit: "Strip",
    packUnit: "Packet",
    packSize: 10,
    batchNumber: `BATCH${n}`,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    purchasePrice: 50,
    pharmacy: pharmacyId,
    ...overrides,
  });
}

export async function seedStock(medicineId, locationId, onHandQty, overrides = {}) {
  return StockBalance.create({
    medicineId,
    locationId,
    onHandQty,
    reservedQty: 0,
    ...overrides,
  });
}

export function toCookie(token) {
  return `access_token=${token}`;
}
