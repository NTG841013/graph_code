import { createServer } from "node:http";
import { runAgent } from "./index";

const PORT = process.env.PORT || 3001;

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/run") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const { messages, credential } = JSON.parse(body);

        if (!messages || !credential) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing messages or credential");
          return;
        }

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        console.log(`[Agent] Running with ${messages.length} messages`);
        
        const eventStream = await runAgent(messages, credential);

        for await (const event of eventStream) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        res.end();
      } catch (error) {
        console.error("Agent error:", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end(error instanceof Error ? error.message : String(error));
        } else {
          // If headers were already sent, we can't change the status code, 
          // but we can send an error event in the stream
          res.write(`data: ${JSON.stringify({ event: "error", data: { error: String(error) } })}\n\n`);
          res.end();
        }
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Agent service listening on http://localhost:${PORT}`);
});
