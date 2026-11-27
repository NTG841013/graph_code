import { NextRequest, NextResponse } from "next/server";
import { verifyAgentCredential } from "@/lib/ai/credentials";
import { fetchAnalysisResult } from "@/lib/data/agent-data";
import { getBlastRadius, getDependencyChain, findInsights } from "@/lib/parser/graph";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7);
  let analysisId: string;
  try {
    const creds = await verifyAgentCredential(token);
    analysisId = creds.analysisId;
  } catch {
    return new NextResponse("Invalid credential", { status: 401 });
  }

  const body = await req.json();
  const { tool, args } = body;

  try {
    const analysis = await fetchAnalysisResult(analysisId);

    switch (tool) {
      case "get_summary":
        const insights = findInsights(analysis);
        return NextResponse.json({
          stats: analysis.stats,
          framework: analysis.framework,
          insightCount: insights.length,
          insights: insights.slice(0, 10),
        });

      case "search_files":
        const { query } = args || {};
        const matches = analysis.nodes.filter(n => n.path.toLowerCase().includes((query || "").toLowerCase()));
        return NextResponse.json(matches.map(m => ({ path: m.path, role: m.role })));

      case "list_by_role":
        const { role } = args || {};
        const roleMatches = analysis.nodes.filter(n => n.role?.toLowerCase() === (role || "").toLowerCase());
        return NextResponse.json(roleMatches.map(m => m.path));

      case "get_neighbors":
        const { file_path } = args || {};
        const imports = analysis.edges.filter(e => e.from === file_path).map(e => e.to);
        const importedBy = analysis.edges.filter(e => e.to === file_path).map(e => e.from);
        return NextResponse.json({ file: file_path, imports, importedBy });

      case "transitive_walk":
        const { file_path: walkPath, direction, depth = 2 } = args || {};
        const results = direction === "up"
          ? getBlastRadius(analysis.edges, walkPath, depth)
          : getDependencyChain(analysis.edges, walkPath, depth);
        return NextResponse.json(results);

      case "get_routes":
        return NextResponse.json(analysis.routes);

      default:
        return new NextResponse(`Unknown tool: ${tool}`, { status: 400 });
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`Error in tool ${tool}:`, e);
    return new NextResponse(error, { status: 500 });
  }
}
