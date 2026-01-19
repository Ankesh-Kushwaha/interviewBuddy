// models/Problem.js
import mongoose from "mongoose";

const problemSchema = new mongoose.Schema({
  slug: {
    type: String,
    unique: true,
    required: true // two-sum
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  difficulty: {
    type: String,
    enum: ["EASY", "MEDIUM", "HARD"],
    required: true
  },

  tags: [String], // array, dp, graph, etc.

  constraints: String,

  inputFormat: String,
  outputFormat: String,

  timeLimit: {
    type: Number,
    default: 2000
  },

  memoryLimit: {
    type: Number,
    default: 256
  },

  supportedLanguages: [String], // ["cpp", "python"]

  isPublished: {
    type: Boolean,
    default: false
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Problems = mongoose.model("Problem", problemSchema);
export default Problems;
