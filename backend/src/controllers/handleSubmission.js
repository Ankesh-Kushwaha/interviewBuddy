import redis from '../config/redisConfig.js'

const codeSubmission = async (req, res) => {
  console.log(req.body);
  const { codebody, language, input, expectedoutput, submissionId, userId ,problemId} = req.body;  
  try {
    if (!codebody || !submissionId || !userId || !language || !problemId) {
      return res.status(404).json({
        success: false,
        message: "all field required"
      });
    }

    //check user authentication first -> to-do
    
    //to-do submit the submission to the database 
    //also submit their test cases in the data base 

      //prepare the job to pass the job_queue
    const jobData= {
      code: codebody,
      language: language,
      problemId,
      input: input || [""],
      expectedoutput:expectedoutput || [""],
      submissionId: submissionId,
      userId: userId,
      submissionTime: new Date().toISOString()
    }
  
    //push job to the redis queue here

    const job= await redis.lPush(
            "execution_queue",
            JSON.stringify({
              submissionId,
              problemId,
              language,
              sourceCode: codebody
            })
    );

    //give user a response the the code is submitted and running

    if (job) {
      return res.status(200).json({
        success: true,
        message:"code processing start......."
       })
    }
    else {
      return res.status(200).json({
        success: false,
        message:"code execution got failed",
      })
    }
  }
  catch (err) {
    console.log(err);
    res.status(505).json({
      success: false,
      message: "internal server error",
     })
  }
}

export default codeSubmission;