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
