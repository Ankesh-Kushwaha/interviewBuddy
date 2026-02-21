import redis from "../config/redisConfig.js";
import Submission from "../models/Submission.js";
import Language from "../models/Language.js";
import TestCase from "../models/TestCaseSchema.js";
import logger from "../config/logger.js";
import mongoose from "mongoose";


export const codeSubmission = async (req, res) => {
  try {
    const { codebody, language, userId, problemId } = req.body;

    if (!codebody || !language || !userId || !problemId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }
    
    //Validate language
    const lang = await Language.findOne({ key: language });
    if (!lang) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language"
      });
    }

    //Ensure test cases exist
    const testCaseCount = await TestCase.countDocuments({ problemId });
    if (testCaseCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No test cases found for this problem"
      });
    }

    //Create submission
    const submission = await Submission.create({
      userId,
      problemId,
      language,
      sourceCode: codebody,
      status: "QUEUED",
      testResults: []
    });

    // Minimal job payload (IMPORTANT)
    const jobData = {
      submissionId: submission._id,
      problemId,
      language
    };

    //Push to execution queue
    await redis.lPush("execution_queue", JSON.stringify(jobData));

    return res.status(200).json({
      success: true,
      message: "Code submission successful",
      submissionId: submission._id
    });

  } catch (err) {
    console.error("Submission error:", err);
    logger.error(`submission error:${err.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


export const getASingleSubmission = async (req, res) => {
  try {
    const {submissionId} = req.params;
    const submissionIdObjectType =  new mongoose.Types.ObjectId(submissionId);
    if (!submissionIdObjectType) return res.status(404).json("submissionId is required");
    const submission = await Submission.findById(submissionIdObjectType).populate(
      {
        path: "problemId",
        select:"slug title"
      }
    );
    if (!submission) return res.status(400).json("no submission");
    return res.status(200).json({
      success: true,
      message: "submission fetched successfully",
      submission:submission,
    })
  }
  catch (err) {
    console.log("error while getting a single submission", err.message);
    logger.error(`error while getting submission :${err.message}`);
    return res.status(500).json({
      success: false,
      message:'internal server error',
    })
  }
}

export const getAllUserSubmission = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
   
    //get pagination info from the url
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * 10;

    //query the database
  const submissions = await Submission.find(
      { userId },
      {
        sourceCode: 0,         
        testResults: 0,
      }
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "problemId",
        select: "slug title", // only needed fields
      })
      .lean();


     const totalSubmissions = await Submission.countDocuments({ userId });

    return res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        total: totalSubmissions,
        page,
        limit,
        totalPages: Math.ceil(totalSubmissions / limit),
      },
    });

  } catch (err) {
    console.error("error while getting all user submission:", err.message);
    logger.error("error while getting all user submission");

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const countParticularQuestionSubmissionStats = async (req, res) => {
  try {
    const { problemId } = req.body;
    const problemObjectId = new mongoose.Types.ObjectId(problemId)

    if (!problemObjectId) {
      return res.status(400).json({
        success: false,
        message: "problemId is required",
      });
    }

    const stats = await Submission.aggregate([
      {
        $match: { problemId:problemObjectId }
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          submissionAccepted: {
            $sum: {
              $cond: [{ $eq: ["$status", "AC"] }, 1, 0]
            }
          },
          submissionFailed: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["WA", "TLE", "MLE", "RE", "CE", "SYSTEM_ERROR"]
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalSubmissions: 1,
          submissionAccepted: 1,
          submissionFailed: 1,
          acceptanceRate: {
            $cond: [
              { $gt: ["$totalSubmissions", 0] },
              {
                $multiply: [
                  { $divide: ["$submissionAccepted", "$totalSubmissions"] },
                  100
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalSubmissions: 0,
      submissionAccepted: 0,
      submissionFailed: 0,
      acceptanceRate: 0
    };

    return res.status(200).json({
      success: true,
      message: "problem stats fetched successfully",
      ...result
    });

  } catch (err) {
    console.error("error while getting question stats", err.message);
    logger.error(`error while getting question stats: ${err.message}`);

    return res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
};

export const getAllSubmissionOfAProblem = async (req, res) => {
  try {
    const { problemId } = req.body;
    if (!problemId) return res.status(400).json("problemId required");
    const submissions= await Submission.find({ problemId: problemId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "submission found",
      submissions: submissions,
    });
  }
  catch (err) {
    console.log("error while getting problem submission");
    logger.error(`error while getting problem submission :${err.message}`);
    res.status(200).json({
      success: true,
      message:"internal server error",
    })
  }
}




