import Sale from "../models/sale.model.js";
import Medicine from "../models/medicine.model.js";
import User from "../models/user.model.js";
import { postLedgerEntry } from "./stock.service.js";

export function resolveUnitQuantity(quantity, unit, medicine) {
  const q = Math.abs(Number(quantity));
  if (!q || Number.isNaN(q)) {
    throw Object.assign(new Error("Invalid quantity"), { statusCode: 400 });
  }
  const packSize = Number(medicine.packSize) || 0;
  const isPack = unit && unit.toLowerCase() === (medicine.packUnit || "").toLowerCase();
  const qtyInBase = isPack && packSize > 0 ? q * packSize : q;
  return { saleQty: q, qtyInBase };
}

export async function createSaleRecord({ medicineId, quantity, price, employeeId, date, shift, unit, branchId, userId, session }) {
  const [medicine, employee] = await Promise.all([
    Medicine.findById(medicineId).session(session),
    User.findById(employeeId).session(session),
  ]);

  if (!medicine) {
    throw Object.assign(new Error("Medicine not found"), { statusCode: 404 });
  }
  if (!employee || employee.role !== "employee") {
    throw Object.assign(new Error("Employee not found"), { statusCode: 404 });
  }
  if (!branchId) {
    throw Object.assign(new Error("No branch associated with user"), { statusCode: 400 });
  }

  const { saleQty, qtyInBase } = resolveUnitQuantity(quantity, unit, medicine);

  const sale = await Sale.create(
    [{
      medicineId,
      medicineName: medicine.medicineName,
      quantity: saleQty,
      price,
      employeeId,
      employeeName: employee.username,
      branchId,
      date: date ? new Date(date) : new Date(),
      shift: shift || "morning",
      unit: unit || medicine.baseUnit || medicine.unit,
    }],
    { session }
  );

  await postLedgerEntry(
    {
      medicineId,
      locationId: branchId,
      quantity: -Math.abs(qtyInBase),
      transactionType: "SALE",
      sourceDocType: "SALE",
      sourceDocId: sale[0]._id.toString(),
      unitPrice: Number(price),
      createdByUserId: userId,
    },
    session
  );

  return sale[0];
}
