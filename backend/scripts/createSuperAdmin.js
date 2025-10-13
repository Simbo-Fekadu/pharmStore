#!/usr/bin/env node
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { connectDB } from "../db.js";

dotenv.config();

async function run() {
  const email = process.env.SUPERADMIN_EMAIL || "simboadmin@gmail.com";
  const password = process.env.SUPERADMIN_PASSWORD || "ih3ba3so";
  const mongo =
    process.env.MONGO_URL ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/pharmstore";
  if (!process.env.MONGO_URL && !process.env.MONGO_URI) {
    console.warn(
      "[superadmin] No MONGO_URL/MONGO_URI set; defaulting to mongodb://localhost:27017/pharmstore"
    );
  }
  try {
    await connectDB(mongo);
    let user = await User.findOne({ email });
    const hash = bcrypt.hashSync(password, 10);
    if (user) {
      user.password = hash;
      user.role = "super_admin";
      await user.save();
      console.log(
        `[SuperAdmin Script] Updated existing user to super_admin: ${email}`
      );
    } else {
      user = new User({
        username: email.split("@")[0],
        email,
        password: hash,
        role: "super_admin",
      });
      await user.save();
      console.log(`[SuperAdmin Script] Created super_admin: ${email}`);
    }
  } catch (e) {
    console.error("Failed:", e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
run();
