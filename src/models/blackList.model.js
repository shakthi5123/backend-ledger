
import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is required to blacklist"],
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically delete blacklisted tokens after 3 days
tokenBlacklistSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 3,
  }
);

const tokenBlacklistModel = mongoose.model(
  "TokenBlacklist",
  tokenBlacklistSchema
);

export default tokenBlacklistModel;
