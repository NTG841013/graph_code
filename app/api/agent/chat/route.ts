import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/data/supabase-admin";
import { mintAgentCredential } from "@/lib/ai/credentials";

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const analysisId = searchParams.get('analysisId');
  if (!analysisId) {
    return new NextResponse("Missing analysisId", { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: messages, error } = await (supabase as any)
    .from('chat_messages')
    .select('*')
    .eq('analysis_id', analysisId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json(messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    toolCalls: m.tool_calls || []
  })));
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { analysisId, messages } = await req.json();
  if (!analysisId) {
    return new NextResponse("Missing analysisId", { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Verify that the analysis belongs to the user's organization
  const { data: analysis, error } = await supabase
    .from('analyses')
    .select('id, organization_id')
    .eq('id', analysisId)
    .single();

  if (error || !analysis) {
    return new NextResponse("Analysis not found", { status: 404 });
  }

  if (analysis.organization_id !== orgId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Save the latest user message
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage && lastUserMessage.role === 'user') {
    await (supabase as any).from('chat_messages').insert({
      analysis_id: analysisId,
      organization_id: orgId,
      role: 'user',
      content: lastUserMessage.content,
    });
  }

  // Mint the short-lived credential
  const credential = await mintAgentCredential(analysisId, orgId);

  // Call the agent service (Managed Deep Agents runtime)
  const agentServiceUrl = process.env.AGENT_SERVICE_URL || "http://localhost:3001/run";
  
  try {
    const response = await fetch(agentServiceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        credential,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(`Agent service error: ${errorText}`, { status: response.status });
    }

    // Capture the assistant response to persist it
    const decoder = new TextDecoder();
    let assistantContent = '';
    const toolCallsMap = new Map<string, any>();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6));
              if (event.event === 'on_chat_model_stream') {
                const content = event.data?.chunk?.kwargs?.content || event.data?.chunk?.content;
                if (typeof content === 'string') {
                  assistantContent += content;
                } else if (Array.isArray(content)) {
                  content.forEach((c: any) => {
                    if (typeof c === 'string') assistantContent += c;
                    else if (c?.text) assistantContent += c.text;
                  });
                }
              } else if (event.event === 'on_tool_start') {
                toolCallsMap.set(event.run_id, {
                  id: event.run_id,
                  name: event.name,
                  input: event.data?.input,
                  status: 'done'
                });
              }
            } catch (e) {}
          }
        }
        controller.enqueue(chunk);
      },
      async flush() {
        if (assistantContent || toolCallsMap.size > 0) {
          await (supabase as any).from('chat_messages').insert({
            analysis_id: analysisId,
            organization_id: orgId,
            role: 'assistant',
            content: assistantContent,
            tool_calls: Array.from(toolCallsMap.values())
          });
        }
      }
    });

    return new NextResponse(response.body?.pipeThrough(transformStream), {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("Failed to connect to agent service:", e);
    return new NextResponse(`Agent service unreachable: ${error}`, { status: 503 });
  }
}
