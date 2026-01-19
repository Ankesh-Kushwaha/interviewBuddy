// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },

  email: {
    type: String,
    unique: true,
    required: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER"
  },

  rating: {
    type: Number,
    default:1200
  },

  solvedCount: {
    type: Number,
    default: 0
  },

  solvedEasy: {
    type: Number,
    default: 0
  },
  
  solvedMedium: {
    type: Number,
    default: 0
  },

  solvedHard: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("User", userSchema);
