import { StockLedger, StockBalance } from "../models/inventory.model.js";

export async function postLedgerEntry(entry, session) {
  const [ledger] = await StockLedger.create([entry], { session });
  await StockBalance.updateOne(
    {
      medicineId: entry.medicineId,
      batchId: entry.batchId,
      locationId: entry.locationId,
    },
    {
      $inc: { onHandQty: entry.quantity },
      $set: { lastTxnAt: new Date(), lastTxnId: ledger._id },
    },
    { upsert: true, session }
  );
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
