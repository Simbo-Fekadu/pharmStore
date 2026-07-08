import ChatMessage from "../models/chat.model.js";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";
import errorHandler from "../utils/error.js";

async function buildHandle(user) {
  if (!user) return "unknown";
  let handle = user.username || "user";
  if (user.role === "admin") return `${handle}.admin`;
  if (user.branch) {
    try {
      const branch = await Branch.findById(user.branch).select("name").lean();
      if (branch?.name) {
        const norm = branch.name.replace(/\s+/g, "").toLowerCase();
        handle = `${handle}.${norm}`;
      }
    } catch { /* ignore */ }
  }
  return handle;
}

export const listMessages = async (req, res, next) => {
  try {
    const { room = "global", limit = 200 } = req.query;
    const filter = { room };
    if (req.pharmacyId) filter.pharmacy = req.pharmacyId;
    const msgs = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 500))
      .lean();
    res.json({ success: true, count: msgs.length, messages: msgs.reverse() });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};

export const postMessage = async (req, res, next) => {
  try {
    const { text, room = "global" } = req.body;
    if (!text || !text.trim()) return next(errorHandler(400, "text required"));
    const user = req.user?.id ? await User.findById(req.user.id) : null;
    const senderHandle = await buildHandle(user);
    const msg = await ChatMessage.create({
      room,
      text: text.trim().slice(0, 1000),
      senderId: user?._id,
      senderHandle,
      pharmacy: req.pharmacyId || undefined,
    });
    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    next(errorHandler(400, e.message));
  }
};
