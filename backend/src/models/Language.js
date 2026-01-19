import mongoose from "mongoose";

const languageSchema = new mongoose.Schema({
  // Stable identifier used in API (cpp, python, java)
  key: {
    type: String,
    required: true,
    unique: true
  },

  // Display name
  name: {
    type: String,
    required: true
  },

  // Docker image to execute code
  dockerImage: {
    type: String,
    required: true
  },

  // Filename inside container
  sourceFile: {
    type: String,
    required: true
  },

  // Compilation command (empty for interpreted langs)
  compileCmd: {
    type: String,
    default: ""
  },

  // Execution command
  runCmd: {
    type: String,
    required: true
  },

  // Limits (future-proof)
  timeLimit: {
    type: Number,
    default: 2000 // ms
  },

  memoryLimit: {
    type: Number,
    default: 256 // MB
  }
});

export default mongoose.model("Language", languageSchema);

