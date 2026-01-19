import mongoose from 'mongoose';

// models/Submission.js

const submissionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required:true,
    // type: mongoose.Schema.Types.ObjectId,
    // ref: "User",
    // index: true
  },

  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    index: true
  },

  language: {
    type: String,
    required: true
  },

  sourceCode: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: [
      "QUEUED",
      "RUNNING",
      "AC",
      "WA",
      "TLE",
      "MLE",
      "RE",
      "CE",
      "SYSTEM_ERROR"
    ],
    default: "QUEUED"
  },

  totalTime: Number,
  memory: Number,

  testResults: [
    {
      testCaseId: mongoose.Schema.Types.ObjectId,
      status: String,
      time: Number,
      stdout: String,
      stderr: String
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;

