// models/ExecutionJob.js
import mongoose from "mongoose";

const executionJobSchema = new mongoose.Schema({
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Submission"
  },

  status: {
    type: String,
    enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"],
    default: "PENDING"
  },

  workerId: String,

  startedAt: Date,
  finishedAt: Date,

  error: String
});

export default mongoose.model("ExecutionJob", executionJobSchema);
