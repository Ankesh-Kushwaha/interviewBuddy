import User from "../models/userSchema.js";
import { verifyUserSignUp,verifySignin } from "../utils/userVerification.js";
import logger from '../config/logger.js'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { environment } from "../utils/env.js";
import { ROLE_LEVEL } from "../utils/promotionRule.js";
import crypto from 'crypto';
import mongoose from "mongoose";
//import {sendEmail} from '../utils/SendEmail.js'

// user sign up api

export const userSignup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json("missing fields");
    }

    const verify = verifyUserSignUp.safeParse({ username, email, password });
    if (!verify.success) {
      return res.status(400).json("zod validation failed");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json("user already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "user" 
    });

    // await sendEmail({
    //   to: newUser.email,
    //   subject: "Welcome to TalentIq",
    //   html: `
    //     <h2>Welcome to TalentIq</h2>
    //     <p>we hope you enjoy the experience of our platform.</p>
    //   `
    // });

    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      environment.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      success: true,
      message: "signup successful",
      user: {
        name: newUser.username,
        email: newUser.email,
        role: newUser.role,
        userId:newUser._id,
      },
      token
    });

  } catch (err) {
    logger.error(err);
    return res.status(500).json("internal error");
  }
};

//user sign in api

export const userSignIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("required fields are missing");
    }

    //  Correct Zod usage
    const verify = verifySignin.safeParse({ email, password });
    if (!verify.success) {
      return res.status(400).json({
        success: false,
        message: "zod validation failed",
        errors: verify.error.errors
      });
    }

    // Must select password explicitly
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "user does not exist"
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      environment.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const loginUser = {
      name: user.username,
      email: user.email,
      role: user.role,
      userId:user._id
    }

    return res.status(200).json({
      success: true,
      message: "user login successful",
      user:loginUser,
      token
    });

  } catch (err) {
    console.error("error while signin:", err);
    logger.error("error while user sign in");
    return res.status(500).json({
      success: false,
      message: "internal server error"
    });
  }
};


//promote User api

export const promoteUser = async (req, res) => {
  try {
    const { userId, targetRole } = req.body;
    const userIdObjectType = new mongoose.Types.ObjectId(userId);

    const actor = await User.findById(req.user.userId);
    if (!actor || actor.role !== "super_admin") {
      return res.status(403).json("only super_admin can promote users");
    }

    const targetUser = await User.findById(userIdObjectType);
    if (!targetUser) return res.status(404).json("user not found");

    if (ROLE_LEVEL[targetRole] <= ROLE_LEVEL[targetUser.role]) {
      return res.status(400).json("invalid promotion");
    }

    targetUser.role = targetRole;
    await targetUser.save();
    console.log(targetUser.role);
    
    return res.status(200).json({
      success: true,
      message: `user promoted to ${targetRole}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json("internal server error");
  }
};

//demote user api

export const demoteUser = async (req, res) => {
  try {
    const { userId, targetRole } = req.body;

    if (!userId || !targetRole) {
      return res.status(400).json("missing fields");
    }

    // Only these roles are valid demotion targets
    const allowedRoles = ["admin", "user"];
    if (!allowedRoles.includes(targetRole)) {
      return res.status(400).json("invalid target role");
    }

    // Fetch target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json("user not found");
    }

    const actorRole = req.user.role;

    /* ---------------- ROLE RULE ENFORCEMENT ---------------- */

    // Only super_admin can demote
    if (actorRole !== "super_admin") {
      return res.status(403).json("only super_admin can demote users");
    }

    //  Prevent self-demotion
    if (targetUser._id.toString() === req.user.userId) {
      return res.status(403).json("cannot demote yourself");
    }

    //  Cannot demote to same or higher role
    if (ROLE_LEVEL[targetRole] >= ROLE_LEVEL[targetUser.role]) {
      return res.status(400).json("invalid demotion");
    }

    //  Enforce step-by-step demotion (NO SKIP)
    if (
      targetUser.role === "super_admin" &&
      targetRole !== "admin"
    ) {
      return res.status(400).json("super_admin can only be demoted to admin");
    }

    if (
      targetUser.role === "admin" &&
      targetRole !== "user"
    ) {
      return res.status(400).json("admin can only be demoted to user");
    }

    //  Cannot demote user further
    if (targetUser.role === "user") {
      return res.status(400).json("user cannot be demoted further");
    }

    /* ---------------- APPLY DEMOTION ---------------- */

    targetUser.role = targetRole;
    await targetUser.save();
    
    logger.info("user demoted successfully");
    return res.status(200).json({
      success: true,
      message: `user demoted to ${targetRole}`
    });

  } catch (err) {
    console.error(err);
    logger.error("error while demoting user")
    return res.status(500).json("internal server error");
  }
};

//get user profile api

export const getUserProfile = async (req, res) => {
  try {
    logger.info("getUserProfile endpoint hit.")
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json("userId required");
    }

    const user = await User.findOne({_id:userId});
    if (!user) {
      return res.status(404).json("user does not exist");
    }
    return res.status(200).json(user);
  }
  catch (err) {
    console.error("error while getting user Profile", err.message);
    logger.error("error while getting user Profile.");
    res.status(500).json({
      success: false,
      message:"internal server error."
    })
  }
}

//get all user api

export const getAllUser = async (req, res) => {
  try {
    logger.info("get all user endpoints hit..");
    const users = await User.find();
    return res.status(200).json(users);
  }
  catch (err) {
    console.error("error while getting all user");
    logger.error("error while getting all user");
    return res.status(500).json({
      success: false,
      message:"internal server error",
    })
  }
}

//forget password api
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json("email required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json("if account exists, email sent");
    }

    //  Generate secure token
    const resetToken = crypto.randomBytes(32).toString("hex");

    //  Hash token before storing
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    //  Save token + expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

     const resetLink = `${environment.FRONTEND_URL}/reset-password/${resetToken}`;

    // await sendEmail({
    //   to: user.email,
    //   subject: "Reset your password",
    //   html: `
    //     <h2>Password Reset</h2>
    //     <p>Click the link below:</p>
    //     <a href="${resetLink}">${resetLink}</a>
    //     <p>This link expires in 15 minutes.</p>
    //   `
    // });

    return res.status(200).json("password reset link sent");

  } catch (err) {
    return res.status(500).json("internal error");
  }
};


//reset password api
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json("password required");
    }

    // Hash incoming token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    //  Find valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select("+password");

    if (!user) {
      return res.status(400).json("invalid or expired token");
    }

    //  Hash new password
    user.password = await bcrypt.hash(newPassword, 12);

    //  Cleanup
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json("password reset successful");

  } catch (err) {
    return res.status(500).json("internal error");
  }
};


//to be implemented when cloudinary set up done
export const deleteUserProfile = async (req,res) => {
  
}

//to be implemented when cloudinary setup done;
export const updateUserProfile = async (req, res) => {
  
}
