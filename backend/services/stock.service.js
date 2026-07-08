import { StockLedger, StockBalance } from "../models/inventory.model.js";

/**
 * Atomically decrement StockBalance.onHandQty with a sufficiency guard.
 * Uses findOneAndUpdate with a filter condition so concurrent readers
 * cannot race past each other (TOCTOU prevention).
 * Throws with statusCode 409 if stock is insufficient.
 */
export async function safeDecrement({ medicineId, locationId, quantity, ledgerId, session, batchId }) {
  const absQty = Math.abs(quantity);
  const filter = { medicineId, locationId };
  if (batchId) filter.batchId = batchId;
  filter.onHandQty = { $gte: absQty };

  const result = await StockBalance.findOneAndUpdate(
    filter,
    {
      $inc: { onHandQty: -absQty },
      $set: { lastTxnAt: new Date(), lastTxnId: ledgerId },
    },
    { session }
  );
  if (!result) {
    const bal = await StockBalance.findOne({ medicineId, locationId }).session(session || null);
    throw Object.assign(
      new Error(`Insufficient stock: have ${bal?.onHandQty ?? 0}, need ${absQty}`),
      { statusCode: 409 }
    );
  }
}

export async function postLedgerEntry(entry, session) {
  const [ledger] = await StockLedger.create([entry], { session });

  const quantity = Number(entry.quantity);
  if (quantity < 0) {
    // Use the atomic guard for decrements
    await safeDecrement({
      medicineId: entry.medicineId,
      locationId: entry.locationId,
      quantity: -quantity,
      ledgerId: ledger._id,
      session,
      batchId: entry.batchId,
    });
  } else {
    // For positive entries (adds), upsert is safe
    await StockBalance.updateOne(
      {
        medicineId: entry.medicineId,
        batchId: entry.batchId,
        locationId: entry.locationId,
      },
      {
        $inc: { onHandQty: quantity },
        $set: { lastTxnAt: new Date(), lastTxnId: ledger._id },
      },
      { upsert: true, session }
    );
  }
  return ledger;
}

export async function getBalance(medicineId, locationId, session) {
  return StockBalance.findOne({ medicineId, locationId }).session(session || null);
}

export async function checkSufficientStock(medicineId, locationId, requiredQty, session) {
  const bal = await StockBalance.findOne({ medicineId, locationId }).session(session || null);
  return (bal?.onHandQty || 0) >= requiredQty;
}

export async function checkIdempotency(idempotencyKey, session) {
  if (!idempotencyKey) return null;
  return StockLedger.findOne({ idempotencyKey }).session(session || null);
}
