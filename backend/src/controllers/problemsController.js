import Problems from '../models/problems.js'

export const createProblem = async (req, res) => {
  try {
    //const userId = req.userId; to be implemting
    const { slug, title, description, difficulty, tags, constraints, inputFormat, outputFormat, timeLimit, memoryLimit } = req.body;

    //check user access here
    
    //check for the required field 
    if (!slug || !title || !description || !difficulty) {
      return res.status(400).json("slug , title ,description or difficulty is required");
    }
    
    //create the problem;
    const newProblem = await Problems.create({
      slug,
      title,
      description,
      difficulty,
      tags,
      constraints,
      inputFormat,
      outputFormat,
      timeLimit,
      memoryLimit,
    });

    if (!newProblem) {
      return res.status(400).json({
        success: false,
        message:"problem creation got failed.try again."
      })
    }
    else {
      return res.status(200).json({
      success: true,
      message:"Problem created Successfully",
    })
    }
  }
  catch (err) {
    console.log("error while creating Problem:", err.message);
    res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
}

export const getASingleProblem = async (req, res) => {
  try {
    const { problemId } = req.params;
    if (!problemId) return res.status(400).json("problemId is required");
    const problem = await Problems.findOne({_id:problemId});
    return res.status(200).json({
      success: true,
      message: "problem fetched successfully",
      problem
    });
  }
  catch (err) {
    console.error("error while getting a problem", err.message);
    return res.status(500).json({
      success: false,
      message:"internal server error.try after sometime."
    })
  }
}

export const getAllProblem = async (req, res) => {
  try {
    const problems = await Problems.find();
    return res.status(200).json({
      success: false,
      message: "problems fetched successfully",
      problems,
    })
  }
  catch (err) {
    console.error("error while getting all problem", err.message);
    return res.status(500).json({
      success: false,
      message:"internal server error.try after sometime."
    })
  }
}

export const deleteAProblem = async (req, res) => {
  
}

export const updateAProblem = async (req, res) => {
  
}