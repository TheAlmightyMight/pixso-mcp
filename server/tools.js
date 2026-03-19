import { z } from "zod";
import { callPlugin } from "./bridge.js";

const CONSTRAINT_TYPE = ["SCALE", "WIDTH", "HEIGHT"];
const DEFAULT_SELECTION_TIMEOUT_MS = 30000;
const DEFAULT_EXPORT_TIMEOUT_MS = 120000;

export const getSelectionDescription =
  "Use this tool first for layout and structure. It returns the selected design subtree optimized for JSX/Tailwind code generation. " +
  "If a returned node has `assetExport`, call `assetExport.preferredTool` with `nodeIds: [node.id]` to fetch the visual asset for that node. " +
  "Use `assetExport.kind`, `usageHint`, and `fit` to decide whether raster content should become an <img> or a background image. " +
  "For vector assets, prefer SVG export via `get_selection_svg`. " +
  "mainSize/crossSize: FIXED means use explicit w/h, AUTO means content-hugging (omit width/height in CSS). " +
  "constraints.h/constraints.v: MIN=pin left/top, MAX=pin right/bottom, CENTER=center, STRETCH=pin both, SCALE=scale with parent. When constraints absent, assume MIN/MIN (default top-left). " +
  "strokeAlign: INSIDE=border, OUTSIDE=outline/box-shadow, CENTER=split half inside/half outside. " +
  "fills[].handles: two [x,y] points in 0-1 space for gradient direction. " +
  "Pre-normalized values: layout=row/column, mainAlign=flex-start/flex-end/center/space-between, crossAlign=flex-start/flex-end/center, layoutAlign=stretch, textAlign=left/right/center/justify, textDecoration=underline/line-through, textCase=uppercase/lowercase/capitalize, overflow=x/y/both, padding=[top,right,bottom,left], gradient types=linear/radial/conic/diamond. " +
  "When fillStyleName, strokeStyleName, or textStyleName present, raw values (colors, fonts) are omitted so the model can map design tokens. " +
  "All spacing and dimension values (padding, gap, x, y, w, h, etc.) are in pixels.";

export const getSelectionPngDescription =
  "Use ids returned by `get_selection` to export raster assets or PNG fallbacks. " +
  "Prefer this tool for raster/image-backed assets, especially when `assetExport.preferredTool` is `get_selection_png`. " +
  "Respect `usageHint` and `fit` from `get_selection` so raster assets are implemented as <img> versus background-image correctly.";

export const getSelectionSvgDescription =
  "Use ids returned by `get_selection` to export vector assets. " +
  "Prefer this tool for vector assets because SVG preserves design fidelity better than PNG. " +
  "When `assetExport.preferredTool` is `get_selection_svg`, call this tool with `nodeIds: [node.id]`.";

export const pngInputSchema = {
  nodeIds: z.array(z.string()).min(1).optional().describe("Ids returned on exportable nodes by get_selection."),
  contentsOnly: z.boolean().optional().describe("Trim transparent padding and export only visible contents."),
  useAbsoluteBounds: z.boolean().optional().describe("Use absolute bounds for export instead of local bounds."),
  constraint: z.object({
    type: z.enum(CONSTRAINT_TYPE),
    value: z.number().positive(),
  }).optional().describe("PNG export size constraint."),
};

export const svgInputSchema = {
  nodeIds: z.array(z.string()).min(1).optional().describe("Ids returned on exportable nodes by get_selection."),
  contentsOnly: z.boolean().optional().describe("Trim transparent padding and export only visible contents."),
  useAbsoluteBounds: z.boolean().optional().describe("Use absolute bounds for export instead of local bounds."),
  svgIdAttribute: z.boolean().optional().describe("Include id attributes in the exported SVG."),
};

export const diagnoseExportDescription =
  "Diagnostic tool: exports current selection as PNG and SVG, validates data integrity, " +
  "and returns a report with timings, sizes, and validation results. " +
  "Use this when export tools produce errors, timeouts, or invalid images. " +
  "Does NOT return image data — only diagnostic metadata.";

export const diagnoseExportInputSchema = {
  nodeIds: z.array(z.string()).min(1).optional().describe("Specific node ids to diagnose. If omitted, uses current selection."),
};

function unwrapPluginPayload(payload) {
  if (payload && payload.error) {
    throw new Error(payload.error);
  }
  return payload;
}

function buildPngParams(args = {}) {
  const settings = {};

  if (typeof args.contentsOnly === "boolean") settings.contentsOnly = args.contentsOnly;
  if (typeof args.useAbsoluteBounds === "boolean") settings.useAbsoluteBounds = args.useAbsoluteBounds;
  if (args.constraint) settings.constraint = args.constraint;

  return {
    format: "PNG",
    nodeIds: args.nodeIds,
    settings,
  };
}

function buildSvgParams(args = {}) {
  const settings = {};

  if (typeof args.contentsOnly === "boolean") settings.contentsOnly = args.contentsOnly;
  if (typeof args.useAbsoluteBounds === "boolean") settings.useAbsoluteBounds = args.useAbsoluteBounds;
  if (typeof args.svgIdAttribute === "boolean") settings.svgIdAttribute = args.svgIdAttribute;

  return {
    format: "SVG",
    nodeIds: args.nodeIds,
    settings,
  };
}

function formatFailureLines(failures) {
  return failures
    .map((failure) => {
      const parts = [];
      if (failure.name) parts.push(failure.name);
      if (failure.id) parts.push(`#${failure.id}`);
      const label = parts.length > 0 ? parts.join(" ") : "asset";
      return `- ${label}: ${failure.error}`;
    })
    .join("\n");
}

export function buildExportToolResult(payload, fallbackMimeType) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const failures = Array.isArray(payload?.failures) ? payload.failures : [];
  const format = payload?.format || (fallbackMimeType === "image/svg+xml" ? "SVG" : "PNG");
  const content = [];

  content.push({
    type: "text",
    text: `Exported ${items.length} ${format} asset(s). Failures: ${failures.length}.`,
  });

  items.forEach((item) => {
    const details = [];
    if (item.w && item.h) details.push(`${item.w}x${item.h}`);
    if (item.usageHint) details.push(`usage: ${item.usageHint}`);
    if (item.fit) details.push(`fit: ${item.fit}`);

    content.push({
      type: "text",
      text: `${item.name || item.id || "asset"}${details.length > 0 ? ` (${details.join(", ")})` : ""}`,
    });

    if (format === "SVG" && item.data) {
      // SVG: decode base64 to text on server side so the LLM can read/use the vector source
      const svgText = Buffer.from(item.data, "base64").toString("utf-8");
      content.push({
        type: "text",
        text: svgText,
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

  if (failures.length > 0) {
    content.push({
      type: "text",
      text: `Failures:\n${formatFailureLines(failures)}`,
    });
  }

  return {
    content,
    isError: items.length === 0,
  };
}

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
      if (!item.data || item.data.length === 0) {
        summary.valid = false;
        summary.validationError = "empty base64 data";
        report.issues.push(`${label.toUpperCase()} ${item.name || item.id}: empty base64 data`);
      } else {
        summary.valid = true;
        summary.base64Len = item.data.length;
      }
      // For SVG, decode base64 to show a snippet in diagnostics
      if (label === "svg" && item.data && summary.valid) {
        try {
          const svgText = Buffer.from(item.data, "base64").toString("utf-8");
          summary.svgTextLen = svgText.length;
          summary.svgSnippet = svgText.substring(0, 200);
        } catch { /* ignore decode errors in diagnostics */ }
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

/**
 * Обрабатывает вызов MCP-инструмента.
 * @param {string} name
 * @param {Record<string, unknown>} [args]
 * @returns {Promise<any>}
 */
export async function handleToolCall(name, args = {}) {
  switch (name) {
    case "get_selection":
      return unwrapPluginPayload(
        await callPlugin("getSelection", {}, {
          timeoutMs: DEFAULT_SELECTION_TIMEOUT_MS,
        }),
      );
    case "get_selection_png":
      return unwrapPluginPayload(
        await callPlugin("exportNodes", buildPngParams(args), {
          lane: "export",
          timeoutMs: DEFAULT_EXPORT_TIMEOUT_MS,
          recoverOnTimeout: true,
        }),
      );
    case "get_selection_svg":
      return unwrapPluginPayload(
        await callPlugin("exportNodes", buildSvgParams(args), {
          lane: "export",
          timeoutMs: DEFAULT_EXPORT_TIMEOUT_MS,
          recoverOnTimeout: true,
        }),
      );
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
    default:
      throw new Error(`Неизвестный инструмент: ${name}`);
  }
}
