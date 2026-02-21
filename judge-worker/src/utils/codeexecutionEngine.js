import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";

import redis from "../config/redisConfig.js";
import Submission from "../models/Submission.js";
import TestCase from "../models/TestCase.js";
import Language from "../models/Language.js";
import ExecutionJob from "../models/ExecutionJob.js";



const pulledImages = new Set();

function showCurrentState(submissionId, submissionStatus){
  console.log(`job with submission_id:${submissionId} and its stauts: ${submissionStatus}`);
}

async function ensureDockerImage(image) {
  if (pulledImages.has(image)) return;

  await new Promise((resolve, reject) => {
    execFile("docker", ["image", "inspect", image], (err) => {
      if (!err) {
        pulledImages.add(image);
        return resolve();
      }

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
  console.log("🚀 Judge worker started...");

  while (true) {
    try {
      const { element } = await redis.blPop("execution_queue", 0);
      const job = JSON.parse(element);

      const submission = await Submission.findById(job.submissionId);
      if (!submission) continue;

      submission.status = "RUNNING";
      await submission.save();
      showCurrentState(submission._id, submission.status);
      await ExecutionJob.create({
        submissionId: submission._id,
        status: "RUNNING",
        workerId: os.hostname(),
        startedAt: new Date()
      });

      await executeSubmission(submission);
    } catch (err) {
      console.error("❌ Worker loop error:", err);
    }
  }
}



async function executeSubmission(submission) {
  const language = await Language.findOne({ key: submission.language });
  if (!language) {
    submission.status = "SYSTEM_ERROR";
    showCurrentState(submission._id, submission.status);
    await submission.save();
    return;
  }

  const testCases = await TestCase.find({
    problemId: submission.problemId
  });

  let finalVerdict = "AC";
  let totalTime = 0;
  const results = [];

  for (const tc of testCases) {
    const result = await runSingleTest(
      submission.sourceCode, 
      tc.input,
      tc.output,
      language
    );

    totalTime += result.time || 0;

    results.push({
      testCaseId: tc._id,
      status: result.status,
      time: result.time,
      stdout: tc.isSample ? result.stdout : undefined,
      stderr: result.stderr
    });

    if (result.status !== "AC") {
      finalVerdict = result.status;
      showCurrentState(submission._id, result.status);
      break;
    }
  }

  submission.status = finalVerdict;
  submission.totalTime = totalTime;
  submission.testResults = results;
  await submission.save();
  showCurrentState(submission._id, submission.status);

  await ExecutionJob.updateOne(
    { submissionId: submission._id },
    { status: "COMPLETED", finishedAt: new Date() }
  );

  
  await redis.rPush(
    "result_queue",
    JSON.stringify({
      submissionId: submission._id,
      userId: submission.userId,
      problemId: submission.problemId,
      status: finalVerdict,
      totalTime,
      results
    })
  );

  console.log(
    `📤 Result pushed for submission ${submission._id} → ${finalVerdict}`
  );
}



function normalizeOutput(output) {
  return output.replace(/\s+/g, " ").trim();
}

async function runSingleTest(code, input, expectedOutput, language) {
  const MAX_OUTPUT_SIZE = 64 * 1024;

  if (!code) {
    return { status: "SYSTEM_ERROR", stderr: "Source code missing" };
  }

  try {
    await ensureDockerImage(language.dockerImage);
  } catch {
    return { status: "SYSTEM_ERROR", stderr: "Docker image unavailable" };
  }

  return new Promise((resolve) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "judge-"));

    const sourcePath = path.join(tmpDir, language.sourceFile);
    const inputPath = path.join(tmpDir, "input.txt");

    fs.writeFileSync(sourcePath, code);
    fs.writeFileSync(inputPath, input);

    const baseDockerArgs = [
      "run",
      "--rm",
      "--network", "none",
      "--read-only",
      "--pids-limit", "64",
      "--memory", `${language.memoryLimit}m`,
      "--cpus", "0.5",
      "--security-opt", "no-new-privileges",
      "--cap-drop", "ALL",
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
      "-v", `${tmpDir}:/workspace:rw`,
      "-w", "/workspace",
      language.dockerImage,
      "bash",
      "-lc"
    ];

 
    if (language.compileCmd) {
      execFile(
        "docker",
        [...baseDockerArgs, language.compileCmd],
        { maxBuffer: MAX_OUTPUT_SIZE },
        (compileErr, _stdout, compileErrOut) => {
          if (compileErr) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
            return resolve({
              status: "CE",
              stderr: compileErrOut || compileErr.message,
              time: 0
            });
          }

          /* ------------------ RUN STEP ------------------ */
          const start = Date.now();

          execFile(
            "docker",
            [...baseDockerArgs, `${language.runCmd} < input.txt`],
            {
              timeout: language.timeLimit,
              maxBuffer: MAX_OUTPUT_SIZE
            },
            (runErr, stdout = "", stderr = "") => {
              fs.rmSync(tmpDir, { recursive: true, force: true });

              const rawTime = Date.now() - start;
              const time = Math.min(rawTime, language.timeLimit);

              if (runErr?.killed) {
                return resolve({ status: "TLE", time });
              }

              if (runErr) {
                return resolve({ status: "RE", stderr, time });
              }

              if (
                normalizeOutput(stdout) !==
                normalizeOutput(expectedOutput)
              ) {
                return resolve({ status: "WA", stdout, time });
              }

              return resolve({ status: "AC", stdout, time });
            }
          );
        }
      );
      return;
    }

    /* ------------------ INTERPRETED LANG (Python) ------------------ */
    const start = Date.now();
    execFile(
      "docker",
      [...baseDockerArgs, `${language.runCmd} < input.txt`],
      {
        timeout: language.timeLimit,
        maxBuffer: MAX_OUTPUT_SIZE
      },
      (err, stdout = "", stderr = "") => {
        fs.rmSync(tmpDir, { recursive: true, force: true });

        const rawTime = Date.now() - start;
        const time = Math.min(rawTime, language.timeLimit);

        if (err?.killed) {
          return resolve({ status: "TLE", time });
        }

        if (err) {
          return resolve({ status: "RE", stderr, time });
        }

        if (
          normalizeOutput(stdout) !==
          normalizeOutput(expectedOutput)
        ) {
          return resolve({ status: "WA", stdout, time });
        }

        return resolve({ status: "AC", stdout, time });
      }
    );
  });
}

