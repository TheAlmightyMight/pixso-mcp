import { z } from "zod";
import { callPlugin } from "./bridge.js";

const CONSTRAINT_TYPE = ["SCALE", "WIDTH", "HEIGHT"];

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
    content.push({
      type: "image",
      data: item.data,
      mimeType: item.mimeType || fallbackMimeType,
    });
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

/**
 * Обрабатывает вызов MCP-инструмента.
 * @param {string} name
 * @param {Record<string, unknown>} [args]
 * @returns {Promise<any>}
 */
export async function handleToolCall(name, args = {}) {
  switch (name) {
    case "get_selection":
      return unwrapPluginPayload(await callPlugin("getSelection"));
    case "get_selection_png":
      return unwrapPluginPayload(await callPlugin("exportNodes", buildPngParams(args)));
    case "get_selection_svg":
      return unwrapPluginPayload(await callPlugin("exportNodes", buildSvgParams(args)));
    default:
      throw new Error(`Неизвестный инструмент: ${name}`);
  }
}
