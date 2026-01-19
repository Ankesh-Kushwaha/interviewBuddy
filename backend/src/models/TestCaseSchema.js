import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    index: true
  },

  input: {
    type: String,
    required: true
  },

  output: {
    type: String,
    required: true
  },

  isSample: {
    type: Boolean,
    default: false
  },

  weight: {
    type: Number,
    default: 1 
  }
});



const TestCase = mongoose.model("TestCase", testCaseSchema);
export default TestCase;
