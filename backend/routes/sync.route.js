import express from "express";
import mongoose from "mongoose";
import {
  connectAtlas,
  getAtlasConnection,
  runAtlasSync,
} from "../services/atlasSync.service.js";

const router = express.Router();

router.get("/atlas/status", async (_req, res) => {
  try {
    const atlas = getAtlasConnection();
    const status =
      atlas && atlas.readyState === 1
        ? "connected"
        : atlas
        ? "connecting"
        : "disconnected";
    const stateCol = mongoose.connection.db.collection("sync_state");
    const states = await stateCol
      .find({})
      .toArray()
      .catch(() => []);
    res.json({ ok: true, status, states });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

router.post("/atlas/run", async (req, res) => {
  try {
    const uri = process.env.MONGO_ATLAS_URL;
    if (!uri)
      return res
        .status(400)
        .json({ ok: false, message: "MONGO_ATLAS_URL not set" });
    await connectAtlas(uri);
    const opts = {
      collections: req.body?.collections,
      batchSize: req.body?.batchSize,
      deleteWhenFlagged: req.body?.deleteWhenFlagged,
      logger: console,
    };
    const out = await runAtlasSync(opts);
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

export default router;
