import errorHandler from "./error.js";
import jwt from "jsonwebtoken";
export const verifyToken = (req, res, next) => {
  let token = req.cookies.access_token;
  // Fallback: allow Authorization: Bearer <token>
  if (!token && req.headers.authorization) {
    const auth = req.headers.authorization;
    if (auth.toLowerCase().startsWith("bearer ")) {
      token = auth.slice(7);
    }
  }
  if (!token) return next(errorHandler(401, "Unauthorized"));
  jwt.verify(token, process.env.SECRET, (err, user) => {
    if (err) return next(errorHandler(403, "Forbidden"));
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, _res, next) => {
  if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
    return next(errorHandler(403, "Admin only"));
  }
  next();
};

export const requireInventoryAccess = (req, _res, next) => {
  if (
    !req.user ||
    !["super_admin", "admin", "inventory_manager"].includes(req.user.role)
  ) {
    return next(errorHandler(403, "Inventory access required"));
  }
  next();
};
