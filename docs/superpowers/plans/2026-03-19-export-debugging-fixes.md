# Export Tools Debugging & Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix image export tools (get_selection_png, get_selection_svg) that timeout and produce invalid images, and create a reusable debugging system for future sessions.

**Architecture:** Fix five identified bugs in the export pipeline (plugin → ui → bridge → MCP response), add a `diagnose_export` MCP tool for LLM-callable diagnostics, and create a `debug-export.js` CLI script for manual verification. All changes are in plain JS, no new dependencies.

**Tech Stack:** Node.js, ES modules, `@modelcontextprotocol/sdk` (client + server), WebSocket (`ws`), Pixso plugin API

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `plugin/main.js` | Fix `uint8ToBase64` perf, add export validation, add size/timing metadata, add SVG text decode |
| Modify | `plugin/ui.html` | Forward `command` field in WebSocket response |
| Modify | `server/tools.js` | Fix SVG result building, add `diagnose_export` tool definition + handler |
| Modify | `server/index.js` | Register `diagnose_export` tool |
| Modify | `server/bridge.js` | Log inbound response payload sizes |
| Create | `debug-export.js` | Standalone MCP client script: exercises export tools, validates results, saves to disk |
| Modify | `package.json` | Add `debug-export` npm script |

---

## Task 1: Fix `uint8ToBase64` performance in plugin

**Files:**
- Modify: `plugin/main.js:364-381` (the `uint8ToBase64` function)

The current implementation uses string concatenation character-by-character. For a 1MB PNG (~1.37MB base64), this means ~1.3M string concatenation operations which is O(n²) in some JS engines. This is the most likely cause of timeouts.

- [ ] **Step 1: Replace `uint8ToBase64` with array-based implementation**

Replace the existing function at line 364 with:

```javascript
function uint8ToBase64(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const len = bytes.length;
  const remainder = len % 3;
  const mainLen = len - remainder;
  const resultLen = Math.ceil(len / 3) * 4;
  const parts = new Array(resultLen);
  let p = 0;

  for (let i = 0; i < mainLen; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    parts[p++] = alphabet[(chunk >> 18) & 63];
    parts[p++] = alphabet[(chunk >> 12) & 63];
    parts[p++] = alphabet[(chunk >> 6) & 63];
    parts[p++] = alphabet[chunk & 63];
  }

  if (remainder === 1) {
    const chunk = bytes[mainLen] << 16;
    parts[p++] = alphabet[(chunk >> 18) & 63];
    parts[p++] = alphabet[(chunk >> 12) & 63];
    parts[p++] = "=";
    parts[p++] = "=";
  } else if (remainder === 2) {
    const chunk = (bytes[mainLen] << 16) | (bytes[mainLen + 1] << 8);
    parts[p++] = alphabet[(chunk >> 18) & 63];
    parts[p++] = alphabet[(chunk >> 12) & 63];
    parts[p++] = alphabet[(chunk >> 6) & 63];
    parts[p++] = "=";
  }

  return parts.join("");
}
```

Key improvement: pre-allocated array with `.join("")` at the end — single allocation instead of O(n) concatenations. Also separates the main loop (no bounds checks) from the remainder handling.

- [ ] **Step 2: Commit**

```bash
git add plugin/main.js
git commit -m "perf: replace string-concat base64 with array-join in plugin"
```

---

## Task 2: Add export data validation in plugin

**Files:**
- Modify: `plugin/main.js:797-860` (the `exportNodes` function)

Currently there is no validation that `exportAsync` returned valid data. Empty or corrupt bytes pass through silently, producing invalid images.

- [ ] **Step 1: Add validation helpers above `exportNodes`**

Add before the `exportNodes` function:

```javascript
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47]; // \x89PNG

function validateExportBytes(bytes, format) {
  if (!bytes || bytes.length === 0) {
    return "exportAsync returned empty data";
  }

  if (format === "PNG") {
    if (bytes.length < 8) {
      return `PNG too small: ${bytes.length} bytes`;
    }
    for (let i = 0; i < 4; i++) {
      if (bytes[i] !== PNG_MAGIC[i]) {
        return `Invalid PNG header: expected 89504E47, got ${Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
      }
    }
  }

  if (format === "SVG") {
    // SVG is XML text — first non-whitespace byte should be '<'
    let firstNonWS = 0;
    while (firstNonWS < bytes.length && (bytes[firstNonWS] === 0x20 || bytes[firstNonWS] === 0x0A || bytes[firstNonWS] === 0x0D || bytes[firstNonWS] === 0x09)) {
      firstNonWS++;
    }
    if (firstNonWS >= bytes.length || bytes[firstNonWS] !== 0x3C) {
      return `SVG does not start with '<': first byte 0x${bytes[firstNonWS]?.toString(16) || "??"}`;
    }
  }

  return null; // valid
}
```

- [ ] **Step 2: Use validation in `exportNodes`, add size/timing metadata to items**

In the `exportNodes` function, after `const bytes = await node.exportAsync(settings);` (line ~832), add validation and timing. Replace the try block inside the for loop:

```javascript
    try {
      if (typeof node.getIsExportSizeExceeded === "function" && node.getIsExportSizeExceeded(settings)) {
        throw new Error("Export size exceeds Pixso limit");
      }

      const exportStart = nowMs();
      const bytes = await node.exportAsync(settings);
      const exportMs = nowMs() - exportStart;

      const validationError = validateExportBytes(bytes, format);
      if (validationError) {
        throw new Error(validationError);
      }

      const encodeStart = nowMs();
      const base64 = uint8ToBase64(bytes);
      const encodeMs = nowMs() - encodeStart;

      const info = analyzeNode(node);
      const assetExport = buildAssetExport(info);
      const item = {
        id: node.id,
        name: node.name,
        mimeType: MIME_TYPE[format],
        data: base64,
        _debug: {
          rawBytes: bytes.length,
          base64Len: base64.length,
          exportMs,
          encodeMs,
        },
      };

      if ("width" in node) item.w = r1(node.width);
      if ("height" in node) item.h = r1(node.height);
      if (assetExport && assetExport.kind === "raster") {
        item.usageHint = assetExport.usageHint;
        if (assetExport.fit) item.fit = assetExport.fit;
      }

      items.push(item);
    } catch (err) {
      failures.push({
        id: node.id,
        name: node.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
```

- [ ] **Step 3: For SVG, also include the raw text in the item**

SVG bytes are UTF-8 text. Add the decoded text so the server can return it as a text block instead of (or in addition to) a base64 image. After `data: base64,` inside the SVG branch, add:

In the `exportNodes` function, after building the item, add:

```javascript
      // For SVG, include the raw text so server can return it as text content
      if (format === "SVG") {
        // Decode UTF-8 bytes to string
        let svgText = "";
        for (let i = 0; i < bytes.length; i++) {
          svgText += String.fromCharCode(bytes[i]);
        }
        item.svgText = svgText;
      }
```

Note: This simple decode works because SVG exported by Pixso is ASCII-safe XML. If non-ASCII chars appear, they'll be in the base64 fallback.

- [ ] **Step 4: Commit**

```bash
git add plugin/main.js
git commit -m "fix: add export data validation, timing, and SVG text decode"
```

---

## Task 3: Fix SVG result building on server side

**Files:**
- Modify: `server/tools.js:95-134` (the `buildExportToolResult` function)

Currently SVG data is returned as an MCP `image` content block with base64 data. Many MCP clients cannot render SVG in image blocks. More importantly, the LLM cannot read or use the SVG source code. SVG should be returned as `text` content.

- [ ] **Step 1: Update `buildExportToolResult` to handle SVG as text**

Replace the `items.forEach` loop:

```javascript
  items.forEach((item) => {
    const details = [];
    if (item.w && item.h) details.push(`${item.w}x${item.h}`);
    if (item.usageHint) details.push(`usage: ${item.usageHint}`);
    if (item.fit) details.push(`fit: ${item.fit}`);

    content.push({
      type: "text",
      text: `${item.name || item.id || "asset"}${details.length > 0 ? ` (${details.join(", ")})` : ""}`,
    });

    if (item.svgText) {
      // SVG: return as text so the LLM can read/use the vector source
      content.push({
        type: "text",
        text: item.svgText,
      });
    } else {
      // PNG and other binary formats: return as base64 image
      content.push({
        type: "image",
        data: item.data,
        mimeType: item.mimeType || fallbackMimeType,
      });
    }
  });
```

- [ ] **Step 2: Commit**

```bash
git add server/tools.js
git commit -m "fix: return SVG exports as text content instead of base64 image"
```

---

## Task 4: Forward `command` field in ui.html and add payload size logging to bridge

**Files:**
- Modify: `plugin/ui.html:391-399` (WebSocket send in `window.onmessage`)
- Modify: `server/bridge.js:347-367` (message handler in `ws.on("message")`)

Two small fixes: (a) ui.html drops the `command` field when forwarding responses, breaking bridge log diagnostics; (b) bridge doesn't log response payload sizes, making it impossible to diagnose large-payload issues.

- [ ] **Step 1: Forward `command` in ui.html response**

In `plugin/ui.html`, in the `window.onmessage` handler, update the `socket.send` call to include `command`:

```javascript
            socket.send(
              JSON.stringify({
                id: message.id,
                type: "response",
                command: message.command,
                payload: message.payload,
              }),
            );
```

- [ ] **Step 2: Add payload size logging in bridge response handler**

In `server/bridge.js`, in the `ws.on("message")` handler, after `const message = JSON.parse(data.toString());`, add size logging. Update the block:

```javascript
        if (message.type === "response" && message.id) {
          const rawSize = data.length || Buffer.byteLength(data.toString());
          const entry = pendingRequests.get(message.id);
          if (!entry) {
            logBridge("late_response_ignored", {
              requestId: message.id,
              command: message.command,
              rawSize,
            });
            return;
          }

          settleRequest(entry, message.payload, "resolved", {
            responseType: message.payload && message.payload.error ? "error" : "ok",
            responseError: message.payload && message.payload.error ? message.payload.error : undefined,
            rawSize,
          });

          drainLane(entry.lane);
        }
```

- [ ] **Step 3: Commit**

```bash
git add plugin/ui.html server/bridge.js
git commit -m "fix: forward command in ui.html response, add payload size logging in bridge"
```

---

## Task 5: Add `diagnose_export` MCP tool

**Files:**
- Modify: `server/tools.js` — add tool definition, description, input schema, handler
- Modify: `server/index.js` — register the new tool

This tool lets any LLM diagnose export issues by calling it. It exports the current selection (or specified nodes) as both PNG and SVG, validates the results, and returns a diagnostic report instead of images.

- [ ] **Step 1: Add tool definition and description in `server/tools.js`**

Add after the `svgInputSchema` definition:

```javascript
export const diagnoseExportDescription =
  "Diagnostic tool: exports current selection as PNG and SVG, validates data integrity, " +
  "and returns a report with timings, sizes, and validation results. " +
  "Use this when export tools produce errors, timeouts, or invalid images. " +
  "Does NOT return image data — only diagnostic metadata.";

export const diagnoseExportInputSchema = {
  nodeIds: z.array(z.string()).min(1).optional().describe("Specific node ids to diagnose. If omitted, uses current selection."),
};
```

- [ ] **Step 2: Add `buildDiagnosticResult` helper in `server/tools.js`**

Add after `buildExportToolResult`:

```javascript
export function buildDiagnosticResult(pngPayload, svgPayload) {
  const report = { png: null, svg: null, issues: [] };

  for (const [label, payload] of [["png", pngPayload], ["svg", svgPayload]]) {
    if (!payload) {
      report[label] = { status: "skipped" };
      continue;
    }

    if (payload.error) {
      report[label] = { status: "error", error: payload.error };
      report.issues.push(`${label.toUpperCase()}: ${payload.error}`);
      continue;
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    const failures = Array.isArray(payload.failures) ? payload.failures : [];

    const itemSummaries = items.map((item) => {
      const summary = {
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        w: item.w,
        h: item.h,
      };
      if (item._debug) {
        summary.rawBytes = item._debug.rawBytes;
        summary.base64Len = item._debug.base64Len;
        summary.exportMs = item._debug.exportMs;
        summary.encodeMs = item._debug.encodeMs;
      }
      // Validate base64 is non-empty
      if (!item.data || item.data.length === 0) {
        summary.valid = false;
        summary.validationError = "empty base64 data";
        report.issues.push(`${label.toUpperCase()} ${item.name || item.id}: empty base64 data`);
      } else {
        summary.valid = true;
        summary.base64Len = item.data.length;
      }
      if (item.svgText) {
        summary.svgTextLen = item.svgText.length;
        summary.svgSnippet = item.svgText.substring(0, 200);
      }
      return summary;
    });

    report[label] = {
      status: failures.length > 0 && items.length === 0 ? "failed" : items.length > 0 ? "ok" : "empty",
      itemCount: items.length,
      failureCount: failures.length,
      items: itemSummaries,
      failures,
    };

    failures.forEach((f) => {
      report.issues.push(`${label.toUpperCase()} ${f.name || f.id}: ${f.error}`);
    });
  }

  const text = JSON.stringify(report, null, 2);
  return {
    content: [{ type: "text", text }],
    isError: report.issues.length > 0 && (!report.png?.itemCount) && (!report.svg?.itemCount),
  };
}
```

- [ ] **Step 3: Add handler case in `handleToolCall`**

In the `switch` block inside `handleToolCall`, add before the `default` case:

```javascript
    case "diagnose_export": {
      let pngPayload = null;
      let svgPayload = null;
      try {
        pngPayload = await callPlugin("exportNodes", buildPngParams(args), {
          lane: "export",
          timeoutMs: DEFAULT_EXPORT_TIMEOUT_MS,
          recoverOnTimeout: true,
        });
      } catch (error) {
        pngPayload = { error: error instanceof Error ? error.message : String(error) };
      }
      try {
        svgPayload = await callPlugin("exportNodes", buildSvgParams(args), {
          lane: "export",
          timeoutMs: DEFAULT_EXPORT_TIMEOUT_MS,
          recoverOnTimeout: true,
        });
      } catch (error) {
        svgPayload = { error: error instanceof Error ? error.message : String(error) };
      }
      return { _diagnostic: true, pngPayload, svgPayload };
    }
```

- [ ] **Step 4: Register the tool in `server/index.js`**

Add import of `diagnoseExportDescription`, `diagnoseExportInputSchema`, and `buildDiagnosticResult` to the import block. Then register the tool in `createPixsoServer`:

```javascript
  server.registerTool("diagnose_export", {
    description: diagnoseExportDescription,
    inputSchema: diagnoseExportInputSchema,
  }, async (args) => {
    try {
      const data = await handleToolCall("diagnose_export", args);
      return buildDiagnosticResult(data.pngPayload, data.svgPayload);
    } catch (error) {
      return formatToolError(error);
    }
  });
```

- [ ] **Step 5: Commit**

```bash
git add server/tools.js server/index.js
git commit -m "feat: add diagnose_export MCP tool for LLM-callable export diagnostics"
```

---

## Task 6: Create `debug-export.js` CLI diagnostic script

**Files:**
- Create: `debug-export.js`
- Modify: `package.json` — add `"debug-export"` script

Standalone script modeled after `count-tokens.js`. Connects as an MCP client, calls `diagnose_export`, then calls `get_selection_png` and `get_selection_svg` individually. Saves exported files to `__tests__/test_results/` and prints a diagnostic report.

- [ ] **Step 1: Create `debug-export.js`**

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import fs from "fs";
import path from "path";

/**
 * Диагностика экспорта: подключается к MCP серверу, вызывает diagnose_export,
 * затем экспортирует PNG и SVG, валидирует результаты и сохраняет на диск.
 *
 * Использование: node debug-export.js [nodeId1 nodeId2 ...]
 * (Убедитесь, что сервер index.js ЗАПУЩЕН и в Pixso выделены нужные элементы)
 */

const SERVER_URL = "http://localhost:3668/mcp";
const RESULTS_DIR = "__tests__/test_results";

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const nodeIds = process.argv.slice(2);
const toolArgs = nodeIds.length > 0 ? { nodeIds } : {};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function validateBase64(data, format) {
  const issues = [];

  if (!data || data.length === 0) {
    issues.push("base64 data is empty");
    return issues;
  }

  // Check base64 is valid (only valid chars + padding)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    issues.push("base64 contains invalid characters");
  }

  if (data.length % 4 !== 0) {
    issues.push(`base64 length ${data.length} is not a multiple of 4`);
  }

  // Decode and check magic numbers
  try {
    const binary = Buffer.from(data, "base64");

    if (format === "PNG") {
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      if (binary.length < 8) {
        issues.push(`PNG too small: ${binary.length} bytes`);
      } else if (!binary.subarray(0, 4).equals(pngMagic)) {
        issues.push(`Invalid PNG magic: ${binary.subarray(0, 4).toString("hex")}`);
      }
    }

    if (format === "SVG") {
      const text = binary.toString("utf-8").trimStart();
      if (!text.startsWith("<")) {
        issues.push(`SVG does not start with '<': starts with ${JSON.stringify(text.substring(0, 20))}`);
      }
    }
  } catch (e) {
    issues.push(`base64 decode failed: ${e.message}`);
  }

  return issues;
}

function saveExport(item, format, ts) {
  const ext = format === "PNG" ? "png" : "svg";
  const safeName = (item.name || item.id || "export").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeName}-${ts}.${ext}`;
  const filepath = path.join(RESULTS_DIR, filename);

  if (item.svgText) {
    fs.writeFileSync(filepath, item.svgText, "utf-8");
  } else if (item.data) {
    fs.writeFileSync(filepath, Buffer.from(item.data, "base64"));
  }

  return filepath;
}

async function run() {
  console.log(`\n=== Pixso Export Diagnostic ===`);
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Node IDs: ${nodeIds.length > 0 ? nodeIds.join(", ") : "(current selection)"}\n`);

  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
  const client = new Client(
    { name: "export-diagnostic-client", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    console.log("Connected to server.\n");

    // Phase 1: Run diagnose_export
    console.log("--- Phase 1: diagnose_export ---");
    const diagStart = Date.now();
    try {
      const diagResponse = await client.callTool({
        name: "diagnose_export",
        arguments: toolArgs,
      });
      const diagMs = Date.now() - diagStart;
      console.log(`Completed in ${diagMs}ms`);

      if (diagResponse.isError) {
        console.log("ERROR:", diagResponse.content[0]?.text);
      } else {
        const report = JSON.parse(diagResponse.content[0]?.text || "{}");
        console.log(`PNG: ${report.png?.status || "?"} (${report.png?.itemCount || 0} items, ${report.png?.failureCount || 0} failures)`);
        console.log(`SVG: ${report.svg?.status || "?"} (${report.svg?.itemCount || 0} items, ${report.svg?.failureCount || 0} failures)`);
        if (report.issues?.length > 0) {
          console.log("Issues:");
          report.issues.forEach((issue) => console.log(`  - ${issue}`));
        }

        // Print debug metadata per item
        for (const [fmt, section] of [["PNG", report.png], ["SVG", report.svg]]) {
          if (section?.items) {
            section.items.forEach((item) => {
              console.log(`  ${fmt} ${item.name || item.id}: valid=${item.valid} rawBytes=${item.rawBytes || "?"} base64Len=${item.base64Len || "?"} exportMs=${item.exportMs ?? "?"} encodeMs=${item.encodeMs ?? "?"}`);
            });
          }
        }

        // Save diagnostic report
        const ts = timestamp();
        const reportPath = path.join(RESULTS_DIR, `diagnostic-${ts}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`Report saved: ${reportPath}`);
      }
    } catch (error) {
      console.log(`diagnose_export failed (${Date.now() - diagStart}ms): ${error.message}`);
    }

    // Phase 2: Export PNG and validate
    console.log("\n--- Phase 2: get_selection_png ---");
    const pngStart = Date.now();
    try {
      const pngResponse = await client.callTool({
        name: "get_selection_png",
        arguments: toolArgs,
      });
      const pngMs = Date.now() - pngStart;
      console.log(`Completed in ${pngMs}ms`);

      if (pngResponse.isError) {
        console.log("ERROR:", pngResponse.content.map((c) => c.text || "(image)").join(" "));
      } else {
        const ts = timestamp();
        let imageIdx = 0;
        for (const block of pngResponse.content) {
          if (block.type === "image") {
            imageIdx++;
            const issues = validateBase64(block.data, "PNG");
            const decoded = Buffer.from(block.data || "", "base64");
            console.log(`  Image ${imageIdx}: ${decoded.length} bytes, mime=${block.mimeType}, issues=${issues.length === 0 ? "none" : issues.join("; ")}`);

            // Save to disk
            const filepath = path.join(RESULTS_DIR, `png-export-${imageIdx}-${ts}.png`);
            fs.writeFileSync(filepath, decoded);
            console.log(`  Saved: ${filepath}`);
          } else if (block.type === "text") {
            console.log(`  ${block.text}`);
          }
        }
      }
    } catch (error) {
      console.log(`get_selection_png failed (${Date.now() - pngStart}ms): ${error.message}`);
    }

    // Phase 3: Export SVG and validate
    console.log("\n--- Phase 3: get_selection_svg ---");
    const svgStart = Date.now();
    try {
      const svgResponse = await client.callTool({
        name: "get_selection_svg",
        arguments: toolArgs,
      });
      const svgMs = Date.now() - svgStart;
      console.log(`Completed in ${svgMs}ms`);

      if (svgResponse.isError) {
        console.log("ERROR:", svgResponse.content.map((c) => c.text || "(image)").join(" "));
      } else {
        const ts = timestamp();
        let svgIdx = 0;
        for (const block of svgResponse.content) {
          if (block.type === "text" && block.text?.trimStart().startsWith("<")) {
            svgIdx++;
            console.log(`  SVG ${svgIdx}: ${block.text.length} chars`);
            console.log(`  Snippet: ${block.text.substring(0, 120)}...`);

            const filepath = path.join(RESULTS_DIR, `svg-export-${svgIdx}-${ts}.svg`);
            fs.writeFileSync(filepath, block.text, "utf-8");
            console.log(`  Saved: ${filepath}`);
          } else if (block.type === "image") {
            svgIdx++;
            const issues = validateBase64(block.data, "SVG");
            console.log(`  SVG ${svgIdx} (as image): base64Len=${block.data?.length || 0}, issues=${issues.length === 0 ? "none" : issues.join("; ")}`);

            const decoded = Buffer.from(block.data || "", "base64");
            const filepath = path.join(RESULTS_DIR, `svg-export-${svgIdx}-${ts}.svg`);
            fs.writeFileSync(filepath, decoded);
            console.log(`  Saved: ${filepath}`);
          } else if (block.type === "text") {
            console.log(`  ${block.text}`);
          }
        }
      }
    } catch (error) {
      console.log(`get_selection_svg failed (${Date.now() - svgStart}ms): ${error.message}`);
    }

    console.log("\n=== Diagnostic complete ===\n");
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  }
}

run();
```

- [ ] **Step 2: Add npm script in `package.json`**

Add to `"scripts"`:

```json
"debug-export": "node debug-export.js"
```

- [ ] **Step 3: Commit**

```bash
git add debug-export.js package.json
git commit -m "feat: add debug-export.js CLI diagnostic script"
```

---

## Task 7: Verify with `debug-export.js`

**Files:** none (verification only)

- [ ] **Step 1: Start the MCP server**

```bash
npm start
```

(Ensure Pixso plugin is running and connected, with some elements selected.)

- [ ] **Step 2: Run the diagnostic script**

```bash
npm run debug-export
```

- [ ] **Step 3: Verify results**

Check the console output for:
- `diagnose_export`: both PNG and SVG status should be "ok", issues should be empty
- `get_selection_png`: images should have valid PNG magic bytes, no validation issues
- `get_selection_svg`: SVG should come back as text content (not image block), should start with `<`
- Check saved files in `__tests__/test_results/`: open PNG files (should be valid images), open SVG files (should render in browser)
- Check timing: `exportMs` and `encodeMs` in diagnostic report should be reasonable (under 10s for normal elements)

- [ ] **Step 4: If issues found, fix and re-run. If all passes, commit any final adjustments.**

---

## Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `diagnose_export` to MCP Tools table and add `debug-export` to Commands**

Add the tool to the table:

```markdown
| `diagnose_export` | `exportNodes` (x2) | Diagnostic: exports PNG+SVG, validates data, returns report (no images) |
```

Add to Commands:

```bash
npm run debug-export   # Diagnose export tools — validates PNG/SVG pipeline
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add diagnose_export tool and debug-export script to CLAUDE.md"
```
