import mongoose from "mongoose";

// Simple global / room-based chat message storage
// room: e.g., 'global', 'admins', 'branch:<branchId>' etc (we'll start with 'global')
const chatMessageSchema = new mongoose.Schema(
  {
    room: { type: String, index: true, default: "global" },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderHandle: { type: String, required: true }, // username.branchName or username
    text: { type: String, required: true },
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
