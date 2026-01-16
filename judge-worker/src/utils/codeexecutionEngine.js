import fs from 'fs'
import path from 'path';
import os from 'os';
import redis from '../config/redisConfig.js'
import{ Submission} from '../models/Submission.js';
import Language from '../models/Language.js'
import { TestCase } from '../models/Submission.js'


const pulledImages = new Set(); // set for caching the pulled images

/**
 * Ensure docker image exists locally.
 * Pulls it once and caches it.
 */

export async function ensureDockerImage(image) {
  if (pulledImages.has(image)) return;

  await new Promise((resolve, reject) => {
    // Check if image exists
    execFile("docker", ["image", "inspect", image], (err) => {
      if (!err) {
        pulledImages.add(image);
        return resolve();
      }

      // Image not found → pull
      execFile(
        "docker",
        ["pull", image],
        { timeout: 5 * 60 * 1000 },
        (pullErr) => {
          if (pullErr) {
            return reject(
              new Error(`Failed to pull Docker image: ${image}`)
            );
          }

          pulledImages.add(image);
          resolve();
        }
      );
    });
  });
}

export async function startQueueConsumer() {
  console.log("queuing consumer stated.........");
  while (true) {
    const { element } = await redis.blPop("execution_queue", 0);
    const job = JSON.parse(element);
    
    //ensure the submission must be in dataabse;
    const submission = await Submission.findById(job.submissionId);
    if (!submission) continue;

    submission.status = "RUNNING";
    await submission.save(); //save submission to the database;

    await executeSubmission(job, submission);
  }
}

export async function executeSubmission(job, submission) {
  const language = await Language.findOne({ key: job.language });
  const testCases = await TestCase.find({ problemId: job.problemId });

  let finalVerdict = "AC";
  let totalTime = 0;
  const results = [];

  for (const tc of testCases) {
    const result = await runSingleTest(
      job.sourceCode,
      tc.input,
      tc.output,
      language
    );

    totalTime += result.time;
    results.push({
      testCaseId: tc._id,
      ...result
    });

    if (result.status !== "AC") {
      finalVerdict = result.status;
      break; //stop if the first test case failed
    }
  }

  submission.status = finalVerdict;
  submission.totalTime = totalTime;
  submission.testResults = results;
  await submission.save(); //save the status of the submission
  console.log(`summission resullt of:${submission._id}`, submission);
  //to-do
  //pass all the submission to another queue from where the websocket server take submission with
  //the problem id and return response to the user in real time 
}

function normalizeOutput(output) {
  return output.replace(/\s+/g, " ").trim();
}

async function runSingleTest(code, input, expectedOutput, language) {
  const MAX_OUTPUT_SIZE = 64 * 1024; // 64 KB

   try {
    await ensureDockerImage(language.dockerImage);
  } catch (err) {
    return {
      status: "SYSTEM_ERROR",
      stderr: "Docker image unavailable"
    };
  }

  return new Promise((resolve) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "judge-"));

    const sourcePath = path.join(tmpDir, language.sourceFile);
    const inputPath = path.join(tmpDir, "input.txt");

    fs.writeFileSync(sourcePath, code, { mode: 0o444 });
    fs.writeFileSync(inputPath, input, { mode: 0o444 });

    const dockerArgs = [
      "run",
      "--rm",
      "--network", "none",
      "--read-only",
      "--pids-limit", "64",
      "--memory", "256m",
      "--cpus", "0.5",
      "--security-opt", "no-new-privileges",
      "--cap-drop", "ALL",
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
      "-v", `${tmpDir}:/workspace:ro`,
      language.dockerImage,
      "bash",
      "-lc",
      language.compileCmd
        ? `${language.compileCmd} && ${language.runCmd} < input.txt`
        : `${language.runCmd} < input.txt`
    ];

    const start = Date.now();

    execFile(
      "docker",
      dockerArgs,
      { timeout: 2000, maxBuffer: MAX_OUTPUT_SIZE },
      (err, stdout = "", stderr = "") => {
        fs.rmSync(tmpDir, { recursive: true, force: true });

        const time = (Date.now() - start) / 1000;

        // ⛔ TLE
        if (err && err.killed) {
          return resolve({ status: "TLE", time });
        }

        // ⛔ Compilation Error
        if (stderr && /error|undefined reference/i.test(stderr)) {
          return resolve({ status: "CE", stderr });
        }

        // ⛔ Runtime Error
        if (err) {
          return resolve({ status: "RE", stderr });
        }

        // ❗ Wrong Answer (normalized comparison)
        if (
          normalizeOutput(stdout) !==
          normalizeOutput(expectedOutput)
        ) {
          return resolve({
            status: "WA",
            stdout,
            time
          });
        }

        // ✅ Accepted
        return resolve({
          status: "AC",
          stdout,
          time
        });
      }
    );
  });
}
