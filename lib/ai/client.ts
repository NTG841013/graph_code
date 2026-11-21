import { OpenAI } from "openai";
import { wrapOpenAI } from "langsmith/wrappers";

const apiKey = process.env.OPENAI_API_KEY;

// Use a dummy key if missing to avoid constructor error, but we'll check it before use.
const openai = new OpenAI({
  apiKey: apiKey || "unconfigured",
});

export const aiClient = wrapOpenAI(openai);

export const MODELS = {
  EXPLAINER: "gpt-4o-2024-08-06",
  CLASSIFIER: "gpt-4o-mini-2024-07-18",
} as const;

export function isAIConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

export function isTracingEnabled() {
  return process.env.LANGSMITH_TRACING === "true";
}
