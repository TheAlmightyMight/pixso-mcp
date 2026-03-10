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
        const jsonPretty = JSON.stringify(msg.payload, null, 2);

        // Write JSON to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `selection-${timestamp}.json`;
        const filepath = `${testResultsDir}/${filename}`;
        fs.writeFileSync(filepath, jsonPretty);
        console.log(`Selection saved to ${filepath}`);

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
