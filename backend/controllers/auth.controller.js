import bcryptjs from "bcryptjs";
import User from "../models/user.model.js";
import errorHandler from "../utils/error.js";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
export const signup = async (req, res, next) => {
  const { username, email, password, role } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  // Allow only 'admin' (explicit) or fallback to model default 'employee'.
  // Never allow creating or spoofing super_admin via public API.
  const cleanedRole = role === "admin" ? "admin" : "employee";
  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    role: cleanedRole,
  });
  try {
    await newUser.save();
    const { password: _p, ...userSafe } = newUser._doc;
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userSafe,
    });
  } catch (error) {
    // Duplicate key error (Mongo / Mongoose)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: `${field} already exists`,
      });
    }
    // Mongoose validation error
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = (email || "").toLowerCase().trim();
    const validUser = await User.findOne({ email: normalizedEmail }).populate(
      "branch"
    );
    if (!validUser) return next(errorHandler(404, "User not found!"));
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, "Incorrect password"));
    // Legacy migration: if no branch but single-element branches array, promote it
    if (
      !validUser.branch &&
      Array.isArray(validUser.branches) &&
      validUser.branches.length === 1
    ) {
      validUser.branch = validUser.branches[0];
      try {
        await validUser.save();
      } catch {
        /* ignore */
      }
      validUser = await User.findById(validUser._id).populate("branch");
    }
    const token = jwt.sign(
      {
        id: validUser._id,
        role: validUser.role,
        branch: validUser.branch?._id || validUser.branch,
        pharmacy: validUser.pharmacy || undefined,
      },
      process.env.SECRET,
      {
        expiresIn: "3d",
      }
    );
    const { password: pass, ...rest } = validUser._doc;
    const isProd = process.env.NODE_ENV === "production";
    // Harden cookie: secure in prod, sameSite 'lax' for CSRF mitigation, httpOnly always
    // Optionally allow overriding domain via COOKIE_DOMAIN env variable
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd, // only over HTTPS in production
      path: "/",
      // Max-Age aligned with JWT expiry (~3 days)
      maxAge: 3 * 24 * 60 * 60 * 1000,
    };
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    res
      .cookie("access_token", token, cookieOptions)
      .status(200)
      .json({ success: true, token, user: rest });
  } catch (error) {
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    res.clearCookie("access_token");
    res.status(200).json("User has logged out!");
  } catch (error) {
    next(error);
  }
};

// Return the authenticated user's profile (including branch)
export const me = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User.findById(userId).populate("branch");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const { password: _p, ...safe } = user._doc;
    res.status(200).json({ success: true, user: safe });
  } catch (error) {
    next(error);
  }
};
