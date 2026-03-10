import { WebSocketServer } from "ws";
import fs from "fs";

/**
 * Connects to the Pixso plugin via WebSocket, fetches the current selection,
 * and reports the token count. Outputs the result to test_results folder.
 *
 * Usage: node count-tokens.js
 * (Make sure index.js is NOT running — this script uses the same port)
 */

const PORT = 3667;
const wss = new WebSocketServer({ port: PORT });
const testResultsDir = "test_results";

// Create test_results directory if it doesn't exist
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

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

        // Build report
        const lines = [];
        lines.push("=== Token Report ===");
        lines.push(`Nodes:            ${nodeCount}`);
        lines.push(`JSON chars:       ${json.length.toLocaleString()}`);
        lines.push(`Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
        lines.push(`Pretty chars:     ${jsonPretty.length.toLocaleString()} (if using indent)`);
        lines.push(`Pretty tokens:    ~${Math.ceil(jsonPretty.length / 4).toLocaleString()} (if using indent)`);

        // Log to console
        lines.forEach(line => console.log(line));

        // Write to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `token-report-${timestamp}.txt`;
        const filepath = `${testResultsDir}/${filename}`;
        fs.writeFileSync(filepath, lines.join("\n"));
        console.log(`\nResults saved to ${filepath}`);

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
