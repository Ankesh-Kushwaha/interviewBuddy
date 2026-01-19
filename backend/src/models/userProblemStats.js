import mongoose from "mongoose";

const userProblemStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },

  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    index: true
  },

  solvedAt: {
    type: Date,
    default: Date.now
  },

  language: {
    type: String // language of first AC
  },

  attempts: {
    type: Number,
    default: 1
  }
});

//prevent duplicate solved entries;
userProblemStatsSchema.index(
  { userId: 1, problemId: 1 },
  { unique: true }
);

export default mongoose.model(
  "UserProblemStats",
  userProblemStatsSchema
);
