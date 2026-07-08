import mongoose from "mongoose";
import Store from "../models/store.model.js";
import Branch from "../models/branch.model.js";
import Medicine from "../models/medicine.model.js";
import { postLedgerEntry, getBalance } from "./stock.service.js";

export async function transferStock({ fromLocationId, toLocationId, medicineId, quantity, sourceDocType, correlationId, userId, session }) {
  const qty = Math.abs(Number(quantity));
  if (!qty || Number.isNaN(qty)) {
    throw Object.assign(new Error("Invalid quantity"), { statusCode: 400 });
  }

  const [fromLoc, toLoc, med] = await Promise.all([
    Store.findById(fromLocationId).session(session),
    Branch.findById(toLocationId).session(session),
    Medicine.findById(medicineId).session(session),
  ]);
  if (!fromLoc || !toLoc || !med) {
    throw Object.assign(new Error("Invalid store, branch, or medicine"), { statusCode: 400 });
  }

  const sourceBal = await getBalance(medicineId, fromLocationId, session);
  if (!sourceBal || (sourceBal.onHandQty || 0) < qty) {
    throw Object.assign(new Error("Insufficient stock at source"), { statusCode: 409 });
  }

  const cid = correlationId || `XFER-${Date.now()}`;

  await postLedgerEntry(
    {
      medicineId,
      locationId: fromLocationId,
      quantity: -qty,
      transactionType: "TRANSFER_OUT",
      sourceDocType: sourceDocType || "TRANSFER",
      sourceDocId: cid,
      correlationId: cid,
      createdByUserId: userId,
    },
    session
  );

  await postLedgerEntry(
    {
      medicineId,
      locationId: toLocationId,
      quantity: qty,
      transactionType: "TRANSFER_IN",
      sourceDocType: sourceDocType || "TRANSFER",
      sourceDocId: cid,
      correlationId: cid,
      createdByUserId: userId,
    },
    session
  );

  return cid;
}
