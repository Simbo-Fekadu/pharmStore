import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

// Ensures required super admin (static credential per user request)
// NOTE: This hardcoding is less secure; prefer env variables in production.
export async function ensureSuperAdmin() {
  const TARGET_EMAIL = process.env.SUPERADMIN_EMAIL || "simboadmin@gmail.com";
  const TARGET_PASSWORD = process.env.SUPERADMIN_PASSWORD || "ih3ba3so";
  let user = await User.findOne({ email: TARGET_EMAIL });
  if (user) {
    if (user.role !== "super_admin") {
      user.role = "super_admin";
      await user.save();
      console.log(
        `[SuperAdmin] Elevated existing ${TARGET_EMAIL} to super_admin`
      );
    }
    return user;
  }
  // If another super admin exists with different email, leave it but also create this one for explicit credential.
  const existingSuper = await User.findOne({ role: "super_admin" });
  const hashed = bcrypt.hashSync(TARGET_PASSWORD, 10);
  user = new User({
    username: TARGET_EMAIL.split("@")[0],
    email: TARGET_EMAIL,
    password: hashed,
    role: "super_admin",
  });
  await user.save();
  console.log(`[SuperAdmin] Created super admin user: ${TARGET_EMAIL}`);
  if (existingSuper && existingSuper.email !== TARGET_EMAIL) {
    console.log(
      `[SuperAdmin] Warning: multiple super_admin accounts exist (${existingSuper.email}, ${TARGET_EMAIL}).`
    );
  }
  return user;
}

// Forcefully recreate the super admin account (dangerous in production):
// - Deletes any user with TARGET_EMAIL
// - Optionally demotes other super_admin users (leave them intact for audit)
// - Creates a fresh super_admin with the configured credentials
export async function recreateSuperAdmin(options = {}) {
  const TARGET_EMAIL = process.env.SUPERADMIN_EMAIL || "simboadmin@gmail.com";
  const TARGET_PASSWORD = process.env.SUPERADMIN_PASSWORD || "ih3ba3so";
  const { removeOthers = false } = options;
  // Delete primary target if exists
  await User.deleteOne({ email: TARGET_EMAIL });
  if (removeOthers) {
    // Demote others to admin (except target) rather than delete to preserve history
    await User.updateMany(
      { role: "super_admin", email: { $ne: TARGET_EMAIL } },
      { $set: { role: "admin" } }
    );
  }
  const hashed = bcrypt.hashSync(TARGET_PASSWORD, 10);
  const fresh = new User({
    username: TARGET_EMAIL.split("@")[0],
    email: TARGET_EMAIL,
    password: hashed,
    role: "super_admin",
  });
  await fresh.save();
  console.log(
    `[SuperAdmin] Recreated super admin ${TARGET_EMAIL} (removeOthers=${removeOthers})`
  );
  return fresh;
}
