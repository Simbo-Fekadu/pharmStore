import express from "express";
import { connect } from "mongoose";
import { config } from "dotenv";
import authRouter from "./routes/auth.route.js";
import medicineRouter from "./routes/medicine.route.js";
import inventoryRouter from "./routes/inventory.route.js";
import locationRouter from "./routes/location.route.js";
import locationCrudRouter from "./routes/location.crud.route.js";
import supplierRouter from "./routes/supplier.route.js";
import cookieParser from "cookie-parser";
import path from "path";

config();
connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MONGODB");
  })
  .catch((err) => {
    console.log(err);
  });

const __dirname = path.resolve();
const app = express();
app.use(express.json());
app.use(cookieParser());

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.use("/backend/auth", authRouter);
app.use("/backend/medicine", medicineRouter);
app.use("/backend/inventory", inventoryRouter);
app.use("/backend/location", locationRouter);
app.use("/backend/location-crud", locationCrudRouter);
app.use(
  "/backend/medicine-crud",
  (await import("./routes/medicine.crud.route.js")).default
);
import userRouter from "./routes/user.route.js";
app.use("/backend/user", userRouter);
app.use("/backend/supplier", supplierRouter);

// app.get("*", (req, res, next) => {
//   res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
// });

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});
