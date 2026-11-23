export const v1Prompt = (targetPath: string, content: string, neighbors: { imports: string[], dependents: string[] }) => `
Explain this file: ${targetPath}
Imports: ${neighbors.imports.join(", ")}
Dependents: ${neighbors.dependents.join(", ")}
Content:
${content}
`.trim();
