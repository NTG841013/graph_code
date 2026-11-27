# LangChain Agent

A standalone service for repository wide graph analysis. It uses Managed Deep Agents to provide a streaming chat interface with tool use.

## Stack

LangChain, OpenAI, Managed Deep Agents runtime, TypeScript.

## How it works

The agent is scoped to a single analysis and organization through a signed JWT credential. It never sees the analysis ID directly in its prompt to prevent injection attacks.

## Tools

- `summary`: High level overview of the analysis.
- `search_files`: Find files by path fragments.
- `list_by_role`: List files grouped by their architectural role.
- `neighbors`: Direct imports and dependents of a file.
- `walk`: Transitive dependency walk in either direction.
- `routes`: The complete route table for the application.

## Commands

- `pnpm dev`: Start the agent service locally on port 3001.
- `pnpm build`: Compile the TypeScript source.

_Drafted by /sync from the introducing change, worth a quick human pass._
