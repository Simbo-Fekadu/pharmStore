import errorHandler from "../utils/error.js";

export const requireSuperAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return next(errorHandler(403, "Super admin only"));
  }
  next();
};
