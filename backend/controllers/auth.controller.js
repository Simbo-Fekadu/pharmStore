import bcryptjs from "bcryptjs";
import User from "../models/user.model.js";
import errorHandler from "../utils/error.js";
import jwt from "jsonwebtoken";
export const signup = async (req, res, next) => {
  const { username, email, password, role } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  // allow only 'admin' or 'employee'; fallback to default (model default is employee)
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
    let validUser = await User.findOne({ email }).populate("branch");
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
      },
      process.env.SECRET,
      {
        expiresIn: "3d",
      }
    );
    const { password: pass, ...rest } = validUser._doc;
    res
      .cookie("access_token", token, { httpOnly: true })
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
