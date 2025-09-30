import errorHandler from "../utils/error.js";

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(errorHandler(401, "Unauthorized"));
  next();
};

export const requireSuperAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== "super_admin") {
    return next(errorHandler(403, "Super admin only"));
  }
  next();
};

export const requireAdminOrSuper = (req, _res, next) => {
  if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
    return next(errorHandler(403, "Admin or super admin required"));
  }
  next();
};

export const forbidRoleChangeToSuper = (req, _res, next) => {
  if (req.body?.role === "super_admin") {
    return next(errorHandler(403, "Cannot assign super_admin role via API"));
  }
  next();
};
