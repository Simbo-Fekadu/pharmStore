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
    res
      .status(201)
      .json({
        success: true,
        message: "User created successfully",
        user: userSafe,
      });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, "User not found!"));
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, "Incorrect password"));
    const token = jwt.sign(
      { id: validUser._id, role: validUser.role },
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
