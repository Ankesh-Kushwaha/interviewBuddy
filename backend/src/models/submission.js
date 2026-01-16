import mongoose from 'mongoose';

// models/Submission.js
const submissionSchema = new mongoose.Schema({
  userId: String,
  problemId: mongoose.Schema.Types.ObjectId,
  language: String,
  sourceCode: String,

  status: {
    type: String,
    enum: ["QUEUED", "RUNNING", "AC", "WA", "TLE", "RE", "CE", "SYSTEM_ERROR"],
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
  ]
});


const testCaseSchema = new mongoose.Schema({
  problemId: mongoose.Schema.Types.ObjectId,
  input: String,
  output: String,
  isSample: Boolean
});

const TestCase= mongoose.model("TestCase", testCaseSchema);
const Submission = mongoose.model("Submission", submissionSchema);

export {
  TestCase,
  Submission
}

