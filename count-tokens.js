import { WebSocketServer } from "ws";

/**
 * Connects to the Pixso plugin via WebSocket, fetches the current selection,
 * and reports the token count.
 *
 * Usage: node count-tokens.js
 * (Make sure index.js is NOT running — this script uses the same port)
 */

const PORT = 3667;
const wss = new WebSocketServer({ port: PORT });

console.log(`Waiting for Pixso plugin to connect on ws://localhost:${PORT}...`);

wss.on("connection", (ws) => {
  console.log("Plugin connected. Requesting selection...\n");

  const id = "token-count-" + Date.now();

  ws.send(JSON.stringify({ id, type: "request", command: "getSelection", params: {} }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "response" && msg.id === id) {
        const json = JSON.stringify(msg.payload);
        const jsonPretty = JSON.stringify(msg.payload, null, 2);

        // Count nodes
        const nodeCount = (json.match(/"id":/g) || []).length;

        // Token estimation: ~4 chars per token for JSON (conservative)
        const estimatedTokens = Math.ceil(json.length / 4);

        console.log("=== Token Report ===");
        console.log(`Nodes:            ${nodeCount}`);
        console.log(`JSON chars:       ${json.length.toLocaleString()}`);
        console.log(`Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
        console.log(`Pretty chars:     ${jsonPretty.length.toLocaleString()} (if using indent)`);
        console.log(`Pretty tokens:    ~${Math.ceil(jsonPretty.length / 4).toLocaleString()} (if using indent)`);
        console.log("");

        // Show first 2000 chars of compact JSON
        if (json.length > 2000) {
          console.log("=== Preview (first 2000 chars) ===");
          console.log(json.slice(0, 2000) + "...");
        } else {
          console.log("=== Full Output ===");
          console.log(jsonPretty);
        }

        ws.close();
        wss.close();
        process.exit(0);
      }
    } catch (err) {
      console.error("Error parsing response:", err);
    }
  });

  ws.on("close", () => {
    console.log("Plugin disconnected.");
    wss.close();
    process.exit(1);
  });
});

// Timeout after 15s
setTimeout(() => {
  console.error("Timeout: no plugin connected within 15 seconds.");
  wss.close();
  process.exit(1);
}, 15000);
