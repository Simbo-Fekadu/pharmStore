// Number formatting helpers for consistent UI rounding
// All floats are rounded up to the nearest whole number for display.

export function ceilNumber(value) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  return Math.ceil(n);
}

export function ceilCurrency(value, prefix = "Br ") {
  const n = Number(value);
  if (!isFinite(n)) return "—";
  return `${prefix}${Math.ceil(n)}`;
}

export function ceilOrDash(value) {
  const n = Number(value);
  if (!isFinite(n)) return "—";
  return `${Math.ceil(n)}`;
}
