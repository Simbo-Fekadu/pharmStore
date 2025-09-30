import mongoose from "mongoose";

let didConnect = false;
let connectingPromise = null;

export async function connectDB(uri) {
  if (didConnect && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectingPromise) return connectingPromise;
  if (!uri) throw new Error("MongoDB connection URI missing");
  connectingPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 10000,
      // bufferCommands left default so initial queries during startup queue until ready
    })
    .then((conn) => {
      didConnect = true;
      return conn;
    })
    .catch((err) => {
      connectingPromise = null; // allow retry
      throw err;
    });
  return connectingPromise;
}

export function getDB() {
  return mongoose.connection;
}

// Optional graceful shutdown helper
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    didConnect = false;
    connectingPromise = null;
  }
}
