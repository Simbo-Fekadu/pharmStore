import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env") });

process.env.NODE_ENV = "test";
if (!process.env.SECRET) {
  process.env.SECRET = "test-secret-key-do-not-use-in-prod";
}

const TEST_DB = process.env.MONGO_TEST_URL || "mongodb://localhost:27017/pharmstore_test";
process.env.MONGO_URL = TEST_DB;

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});
