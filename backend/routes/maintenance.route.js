import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import { requireSuperAdmin } from "../middleware/authz.js";
import { recreateSuperAdmin } from "../bootstrap/superadmin.js";

const router = express.Router();

// POST /backend/maintenance/recreate-superadmin { removeOthers?: boolean }
router.post(
  "/recreate-superadmin",
  verifyToken,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const removeOthers = !!req.body?.removeOthers;
      const user = await recreateSuperAdmin({ removeOthers });
      res.json({
        success: true,
        user: { id: user._id, email: user.email, role: user.role },
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
