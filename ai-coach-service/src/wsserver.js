import dotenv from 'dotenv';
dotenv.config();
import { WebSocketServer } from "ws";
import { routePrompt } from "./promptRouter.js";
import { GoogleGeminiAiLLMconnector,deepSeekLLMConnector,QubridAiLLMConnector,sambolaAiConnector,parseSambolaStream } from "./LLMconnector.js";
const wss = new WebSocketServer({ port: 8081 });

function startServer() {
  try {
    wss.on("connection", (ws) => {
      console.log("Client connected");

      ws.on("message", async (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }

        if (msg.type !== "AI_REQUEST") return;

        const { payload } = msg;
        if (payload.attemptCount === 0 && payload.timeSpent < 60) {
          ws.send(JSON.stringify({
            type: "AI_MESSAGE",
            content: "Try solving a bit before using AI."
          }));
          return;
        }

        let prompt;
        try {
          prompt = await routePrompt(payload);
        } catch (err) {
          ws.send(JSON.stringify({
            type: "AI_ERROR",
            content: err.message
          }));
          return;
        }

        if (!prompt) {
          ws.send(JSON.stringify({
            type: "AI_ERROR",
            content: "Prompt routing failed"
          }));
          return;
        }

        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "THINKING_START" }));
        }

        try {
          for await (const chunk of parseSambolaStream(sambolaAiConnector(prompt))) {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: "AI_MESSAGE",
                content: chunk
              }));
            }
          }
        } catch (err) {
          console.error("LLM streaming error:", err);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: "AI_ERROR",
              content: "Something went wrong while generating the AI response"
            }));
          }
        } finally {
          // 🧠 Thinking end
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "THINKING_END" }));
          }
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected");
      });
    });

    console.log("✅ Agent is running on port: 8081");
  } catch (err) {
    console.error("Error while starting server:", err.message);
  }
}

startServer();





//client -> request server =>
//   {
//   "type": "AI_REQUEST",
//   "payload": {
//     "action": "hint" | "debug" | "explain",
//     "problemId": "two-sum",
//     "code": "user code here",
//     "language": "cpp",
//     "verdict": "WA",
//     "hintLevel": 1,
//     "attemptCount": 1,
//     "timeSpent": 120
//   }
// }

//server -> stream to the client 
// { "type": "THINKING_START" }
// { "type": "AI_MESSAGE", "content": "Observation…" }
// { "type": "AI_MESSAGE", "content": "Another thought…" }
// { "type": "THINKING_END" }

