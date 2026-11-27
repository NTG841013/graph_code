import { loadEnv } from "../lib/env-loader";
loadEnv();

import { createAgent } from "langchain";
import { tools } from "./tools";
import { MODELS } from "../lib/ai/client";

const SYSTEM_PROMPT = `You are the Graphcode Repository Agent. Your job is to help developers understand the structure of a codebase by looking up facts in a dependency graph.

RULES:
1. NEVER infer or guess a relationship between files. If a tool doesn't show a connection, it doesn't exist.
2. ONLY answer structural questions about the code. If asked for qualitative opinions (e.g., "is this code good?", "how can I improve this?"), you MUST decline and explain that you can only answer questions about the repository's structure, dependencies, and routes.
3. Every answer you give MUST be backed by at least one tool call. If you don't need to look anything up, you probably shouldn't be answering.
4. When naming files, use the full paths provided by the tools.
5. You are reading a repository graph. All facts you need can be found by calling the available tools. Do not mention the mechanics of how you access the data (like credentials or IDs).

Example of refusal:
User: "Is this code well-written?"
Agent: "I cannot evaluate code quality. I can, however, tell you which files depend on this module or show you the application's route table."
`;

export const agent = createAgent({
  model: `openai:${MODELS.EXPLAINER}`,
  tools: tools,
  systemPrompt: SYSTEM_PROMPT,
});

/**
 * Entry point for the Managed Deep Agents runtime.
 * It expects a conversation history and a configurable credential.
 */
export async function runAgent(messages: unknown[], credential: string) {
  return await agent.streamEvents({
    messages,
  }, {
    version: "v2",
    configurable: {
      agent_credential: credential,
    },
  });
}
