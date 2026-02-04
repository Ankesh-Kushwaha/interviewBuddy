import dotenv from 'dotenv';
dotenv.config();
import OpenAI from "openai";
import { GoogleGenAI } from '@google/genai'

const API_KEY = process.env.SAMBANOVA_API_KEY;

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: `${process.env.DEEPSEEK_API_KEY}`,
});

const googleGeminiAi = new GoogleGenAI({
  apiKey:`${process.env.GEMINI_API_KEY}`
});

export async function* GoogleGeminiAiLLMconnector(prompt) {
  try {
    const stream =
      await googleGeminiAi.models.generateContentStream({
        model: "Gemini 3 Flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt 
              }
            ]
          }
        ]
      });

    for await (const chunk of stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  } catch (err) {
    console.error("Error while connecting to Gemini LLM:", err);
    throw err;
  }
}

export const deepSeekLLMConnector = async (prompt) => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content:prompt }],
      model: "deepseek-chat",
    });

    return completion.choices[0].message.content.json();
  }
  catch (err) {
    console.error("error while connecting to deepseek LLM.",err.message)
  }
}

export async function* QubridAiLLMConnector(prompt) {
  const body = {
    model: "deepseek-ai/deepseek-r1-distill-llama-70b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
    stream: false,
    top_p: 1
  };

  try {
    const res = await fetch(
      "https://platform.qubrid.com/api/v1/qubridai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.QUIBRIDAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const result = await res.json();
    console.log("RAW RESULT:", result);
    let text = result?.content ?? "";

    if (typeof text !== "string") {
      text = String(text);
    }

    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    const chunks = text.match(/[\s\S]{1,80}/g) || [];
    console.log("CHUNKS:", chunks);

    for (const chunk of chunks) {
      yield chunk;
      await new Promise(r => setTimeout(r, 30));
    }
  } catch (err) {
    console.error("error while connecting to QubridAi LLM", err);
    throw err;
  }
}

export async function* sambolaAiConnector(prompt) {
  try {
    const res = await fetch("https://api.sambanova.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        stream: true,
        model: "gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!res.body) throw new Error("No response stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      yield decoder.decode(value, { stream: true });
    }

  } catch (error) {
    console.error("SambaNova stream error:", error);
    throw error;
  }
}

export async function* parseSambolaStream(streamGenerator) {
  let buffer = "";

  for await (const chunk of streamGenerator) {
    buffer += chunk;

    const events = buffer.split("\n\n");
    buffer = events.pop(); 

    for (const event of events) {
      if (!event.startsWith("data:")) continue;

      const payload = event.replace("data:", "").trim();
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload);
        const token = json.choices?.[0]?.delta?.content;

        if (token) yield token;
      } catch {
        console.log("error while parsing ai respone");
      }
    }
  }
}
