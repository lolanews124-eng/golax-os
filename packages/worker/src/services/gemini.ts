import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, hasGemini } from "../config/env.js";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
}

// Generate JSON from Gemini. Returns parsed object of type T. Throws if no key.
export async function generateJson<T>(prompt: string): Promise<T> {
  if (!hasGemini) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

export { hasGemini };
