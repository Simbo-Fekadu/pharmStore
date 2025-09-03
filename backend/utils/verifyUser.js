import errorHandler from "./error.js";
import jwt from "jsonwebtoken";
export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return next(errorHandler(401, "Unauthorized"));
  jwt.verify(token, process.env.SECRET, (err, user) => {
    if (err) return next(errorHandler(403, "Forbidden"));

    req.user = user;
    next();
  });
};

export const requireAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(errorHandler(403, "Admin only"));
  }
  next();
};

export const requireInventoryAccess = (req, _res, next) => {
  if (!req.user || !["admin", "inventory_manager"].includes(req.user.role)) {
    return next(errorHandler(403, "Inventory access required"));
  }
  next();
};