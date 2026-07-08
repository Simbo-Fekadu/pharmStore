import { ceilCurrency } from "./number";

export const sortByRecent = (arr) =>
  (arr || []).slice().sort((a, b) => {
    const aT = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
    const bT = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
    return bT - aT;
  });

export const formatBirr = (v) => ceilCurrency(v);

export const sellingValue = (m) => {
  const pp = Number(m.purchasePrice);
  const sp = Number(m.sellingPrice);
  if (!isFinite(pp)) return sp;
  if (!isFinite(sp) || sp <= 3) {
    const factor =
      isFinite(sp) && sp >= 1 ? sp : m.category === "COSMETICS" ? 1.35 : 1.25;
    return Math.round(pp * factor * 100) / 100;
  }
  return sp;
};

export const displayQuantity = (m) => {
  const total =
    m.remainingQuantity ??
    m.initialQuantity ??
    m.liveQuantity ??
    m.centralNetQuantity ??
    m.quantity ??
    0;
  return m.packSize ? Math.floor(total / m.packSize) : total;
};
