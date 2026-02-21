import mongoose from "mongoose";

const problemStatsSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    unique: true
  },

  submissions: {
    type: Number,
    default: 0
  },

  accepted: {
    type: Number,
    default: 0
  }
});

export default mongoose.model("ProblemStats", problemStatsSchema);
