import mongoose from "mongoose";

const contestSchema = new mongoose.Schema({
  name: String,

  problems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem"
    }
  ],

  startTime: Date,
  endTime: Date,

  isRated: Boolean
});

export default mongoose.model("Contest", contestSchema);
