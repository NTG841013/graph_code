import { OpenAI } from "openai";
import { wrapOpenAI } from "langsmith/wrappers";
import { Client } from "langsmith";

const apiKey = process.env.OPENAI_API_KEY;

// Ensure LangSmith standard environment variables are set if our custom ones are
if (process.env.LANGSMITH_TRACING === "true") {
  process.env.LANGCHAIN_TRACING_V2 = "true";
  if (process.env.LANGSMITH_API_KEY && !process.env.LANGCHAIN_API_KEY) {
    process.env.LANGCHAIN_API_KEY = process.env.LANGSMITH_API_KEY;
  }
  if (process.env.LANGSMITH_ENDPOINT && !process.env.LANGCHAIN_ENDPOINT) {
    process.env.LANGCHAIN_ENDPOINT = process.env.LANGSMITH_ENDPOINT;
  }
  if (!process.env.LANGCHAIN_PROJECT) {
    process.env.LANGCHAIN_PROJECT = "graphcode";
  }
}

// Use a dummy key if missing to avoid constructor error, but we'll check it before use.
const openai = new OpenAI({
  apiKey: apiKey || "unconfigured",
});

export const lsClient = new Client();

export const aiClient = wrapOpenAI(openai, { client: lsClient });

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
