import TestCase from '../models/TestCaseSchema.js'
import Problems from '../models/problems.js'

export const createTestCases = async (req, res) => {
  try {
    const testCases = req.body;

    // 1. Validate request body
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array of test cases",
      });
    }

    // 2. Validate fields & collect problemId
    const { problemId } = testCases[0];

    if (!problemId) {
      return res.status(400).json({
        success: false,
        message: "problemId is required",
      });
    }

    for (let i = 0; i < testCases.length; i++) {
      const { input, output } = testCases[i];
      if (!input || !output) {
        return res.status(400).json({
          success: false,
          message: `input and output are required at index ${i}`,
        });
      }
    }

    // 3. Check if problem exists
    const problem = await Problems.findById(problemId);
    if (!problem) {
      return res.status(400).json({
        success: false,
        message: "Problem does not exist",
      });
    }

    // 4. Prepare data for bulk insert
    const formattedTestCases = testCases.map(tc => ({
      problemId: tc.problemId,
      input: tc.input,
      output: tc.output,
      isSample: tc.isSample ?? true,
    }));

    // 5. Bulk insert
    const createdTestCases = await TestCase.insertMany(formattedTestCases);

    return res.status(201).json({
      success: true,
      message: "Test cases created successfully",
      count: createdTestCases.length,
      testCaseIds: createdTestCases.map(tc => tc._id),
    });

  } catch (err) {
    console.error("Create test cases error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating test cases",
    });
  }
};


export const findTestCases = async (req,res) => {
  const { problemId } = req.body;
  try {
    const testCases = await TestCase.find({ problemId: problemId });
    if (testCases.length() == 0) {
       return res.status(200).json("no test case exist problem.")
    }
    return res.status(200).json({
      sucess: true,
      message: "testcases fetched successfully",
      testCases:testCases,
    })
  }
  catch(err){
    return res.status(500).json({
      success: false,
      message:"something went wrong.try after sometime."
    })
  }
}

export const deleteTestCase = async (req, res) => {
    
}

export const updateTestCase = async (req, res) => {
  
}
