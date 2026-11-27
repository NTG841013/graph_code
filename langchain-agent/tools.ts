import { tool, RunnableConfig } from "langchain";
import { z } from "zod";

async function callTool(toolName: string, args: Record<string, unknown>, config: RunnableConfig) {
  const credential = config.configurable?.agent_credential;
  if (!credential) {
    throw new Error("No agent credential provided in config. Check your entry point.");
  }

  const surfaceUrl = process.env.AGENT_TOOL_SURFACE_URL || "http://localhost:3000/api/agent/tools";
  
  const response = await fetch(surfaceUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credential}`,
    },
    body: JSON.stringify({ tool: toolName, args }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tool call failed: ${text} (Status: ${response.status})`);
  }

  return await response.json();
}

export const getSummary = tool(async (_, config) => {
  return await callTool("get_summary", {}, config);
}, {
  name: "get_summary",
  description: "Get a high-level summary of the repository analysis, including stats and key insights.",
  schema: z.object({}),
});

export const searchFiles = tool(async ({ query }, config) => {
  return await callTool("search_files", { query }, config);
}, {
  name: "search_files",
  description: "Search for files in the repository by part of their path.",
  schema: z.object({
    query: z.string().describe("The string to search for in file paths"),
  }),
});

export const listByRole = tool(async ({ role }, config) => {
  return await callTool("list_by_role", { role }, config);
}, {
  name: "list_by_role",
  description: "List all files in the repository that have a specific role (e.g., 'Page routes', 'Components').",
  schema: z.object({
    role: z.string().describe("The role to filter files by"),
  }),
});

export const getNeighbors = tool(async ({ file_path }, config) => {
  return await callTool("get_neighbors", { file_path }, config);
}, {
  name: "get_neighbors",
  description: "Get the direct neighbors of a file: what it imports and what imports it.",
  schema: z.object({
    file_path: z.string().describe("The path of the file to get neighbors for"),
  }),
});

export const transitiveWalk = tool(async ({ file_path, direction, depth = 2 }, config) => {
  return await callTool("transitive_walk", { file_path, direction, depth }, config);
}, {
  name: "transitive_walk",
  description: "Perform a transitive walk from a file to find everything it depends on (down) or everything that depends on it (up).",
  schema: z.object({
    file_path: z.string().describe("The starting file path"),
    direction: z.enum(["up", "down"]).describe("Direction of the walk: 'up' for dependants, 'down' for dependencies"),
    depth: z.number().optional().describe("Maximum depth of the walk (default: 2)"),
  }),
});

export const getRoutes = tool(async (_, config) => {
  return await callTool("get_routes", {}, config);
}, {
  name: "get_routes",
  description: "Get the route table of the application (e.g., Next.js pages and API routes).",
  schema: z.object({}),
});

export const tools = [getSummary, searchFiles, listByRole, getNeighbors, transitiveWalk, getRoutes];
