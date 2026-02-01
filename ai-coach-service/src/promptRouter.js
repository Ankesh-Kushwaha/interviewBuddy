import {baseDebuggerPrompt,timeLimitPrompt,wrongAnswerPrompt,memoryLimitPrompt} from '../prompts/debugPrompts.js';
import { hintPrompts } from '../prompts/hintPrompts.js';
import { explainPrompt } from '../prompts/explainCodePrompts.js';
import { optimizationPrompt } from '../prompts/optimisationPrompts.js';

export async function routePrompt(payload) {
  if (!payload) throw new Error("Payload missing");

  const action = payload.action?.toLowerCase();
  const verdict = payload.verdict?.toUpperCase();
  const code = payload.code;

  console.log("ACTION:", action);
  console.log("VERDICT:", verdict);
  console.log("CODE PRESENT:", !!code);

  if (!code) throw new Error("Code missing in payload");

  if (action === "hint") {
    return hintPrompts({
      code,
      hintlevel: payload.hintLevel
    });
  }

  if (action === "analysis") {
    return optimizationPrompt({ code });
  }

  if (action === "debug") {
    if (verdict === "TLE") return timeLimitPrompt({ code });
    if (verdict === "WA") return wrongAnswerPrompt({ code });
    if (verdict === "MLE") return memoryLimitPrompt({ code });
    return baseDebuggerPrompt({ code });
  }

  if (action === "explain") {
    return explainPrompt({ code });
  }

  throw new Error(`Unknown action: ${payload.action}`);
}

