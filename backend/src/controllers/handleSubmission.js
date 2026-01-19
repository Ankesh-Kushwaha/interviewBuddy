import redis from "../config/redisConfig.js";
import Submission from "../models/Submission.js";
import Language from "../models/Language.js";
import TestCase from "../models/TestCaseSchema.js";


export const codeSubmission = async (req, res) => {
  try {
    const { codebody, language, userId, problemId } = req.body;

    if (!codebody || !language || !userId || !problemId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // ✅ Validate language
    const lang = await Language.findOne({ key: language });
    if (!lang) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language"
      });
    }

    // ✅ Ensure test cases exist
    const testCaseCount = await TestCase.countDocuments({ problemId });
    if (testCaseCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No test cases found for this problem"
      });
    }

    // ✅ Create submission
    const submission = await Submission.create({
      userId,
      problemId,
      language,
      sourceCode: codebody,
      status: "QUEUED",
      testResults: []
    });

    // ✅ Minimal job payload (IMPORTANT)
    const jobData = {
      submissionId: submission._id,
      problemId,
      language
    };

    // ✅ Push to execution queue
    await redis.lPush("execution_queue", JSON.stringify(jobData));

    return res.status(200).json({
      success: true,
      message: "Code submission successful",
      submissionId: submission._id
    });

  } catch (err) {
    console.error("Submission error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



