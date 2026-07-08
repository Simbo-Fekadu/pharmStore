export async function attachPharmacyContext(req, _res, next) {
  if (req.user?.role === "super_admin") {
    if (req.query.pharmacyId) req.pharmacyId = req.query.pharmacyId;
    return next();
  }
  if (req.user?.pharmacy) req.pharmacyId = req.user.pharmacy;
  next();
}
