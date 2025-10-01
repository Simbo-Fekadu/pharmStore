import Pharmacy from "../models/pharmacy.model.js";
import errorHandler from "../utils/error.js";

// Attach req.pharmacyId based on user role / query
export async function attachPharmacyContext(req, _res, next) {
  if (req.user?.role === "super_admin") {
    if (req.query.pharmacyId) req.pharmacyId = req.query.pharmacyId;
    return next();
  }
  if (req.user?.pharmacy) req.pharmacyId = req.user.pharmacy;
  next();
}

// Ensure the active pharmacy exists (when provided)
export async function validatePharmacyIfSpecified(req, _res, next) {
  if (!req.pharmacyId) return next();
  try {
    const exists = await Pharmacy.exists({ _id: req.pharmacyId });
    if (!exists) return next(errorHandler(404, "Pharmacy not found"));
    next();
  } catch (e) {
    next(errorHandler(400, e.message));
  }
}

// Filter helper for controllers
export function scopedFilter(base = {}) {
  return (req, _res, next) => {
    req.scopedFilter = {
      ...base,
      ...(req.pharmacyId ? { pharmacy: req.pharmacyId } : {}),
    };
    next();
  };
}
