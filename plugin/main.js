// Показываем UI для работы WebSocket-моста
pixso.showUI(__html__, {
  title: "Pixso MCP Bridge",
  width: 280,
  height: 420,
});

// --- Таблицы нормализации ---

const LAYOUT_DIR = { HORIZONTAL: "row", VERTICAL: "column" };

const MAIN_ALIGN = {
  MIN: "flex-start", MAX: "flex-end",
  CENTER: "center", SPACE_BETWEEN: "space-between",
};

const CROSS_ALIGN = {
  MIN: "flex-start", MAX: "flex-end", CENTER: "center",
};

const LAYOUT_ALIGN_MAP = { INHERIT: "auto", STRETCH: "stretch" };

const TEXT_ALIGN_H = {
  LEFT: "left", RIGHT: "right", CENTER: "center", JUSTIFIED: "justify",
};

const TEXT_ALIGN_V = { TOP: "top", CENTER: "center", BOTTOM: "bottom" };

const TEXT_DECORATION_MAP = { UNDERLINE: "underline", STRIKETHROUGH: "line-through" };

const TEXT_CASE_MAP = { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" };

const OVERFLOW_DIR = { HORIZONTAL: "x", VERTICAL: "y", BOTH: "both" };

const GRADIENT_TYPE = {
  GRADIENT_LINEAR: "linear-gradient", GRADIENT_RADIAL: "radial-gradient",
  GRADIENT_ANGULAR: "conic-gradient", GRADIENT_DIAMOND: "diamond-gradient",
};

const FONT_WEIGHT = {
  thin: 100, hairline: 100,
  extralight: 200, ultralight: 200,
  light: 300,
  regular: 400, normal: 400,
  medium: 500,
  semibold: 600, demibold: 600,
  bold: 700,
  extrabold: 800, ultrabold: 800,
  black: 900, heavy: 900,
};

const VECTOR_NODE_TYPES = new Set([
  "VECTOR",
  "BOOLEAN_OPERATION",
  "STAR",
  "POLYGON",
  "ELLIPSE",
  "LINE",
  "RECTANGLE",
]);

const MIME_TYPE = {
  PNG: "image/png",
  SVG: "image/svg+xml",
};

// --- Утилиты ---


const REQUEST_STATE = {
  RECEIVED: "received",
  QUEUED: "queued",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
};

const EXPORT_COMMAND = "exportNodes";

const requestRecords = new Map();
const exportQueue = [];
let exportQueueRunning = false;

function nowMs() {
  return Date.now();
}

function formatLogValue(value) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function logRequestEvent(event, request, extra = {}) {
  const parts = [
    `event=${formatLogValue(event)}`,
    `state=${formatLogValue(request.state)}`,
    `id=${formatLogValue(request.id)}`,
    `command=${formatLogValue(request.command)}`,
  ];

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined) {
      parts.push(`${key}=${formatLogValue(value)}`);
    }
  });

  console.error(`[pixso-mcp] ${parts.join(" ")}`);
}

function createRequestRecord(id, command) {
  const record = {
    id,
    command,
    state: REQUEST_STATE.RECEIVED,
    receivedAt: nowMs(),
    queuedAt: null,
    startedAt: null,
    finishedAt: null,
  };

  requestRecords.set(id, record);
  logRequestEvent(REQUEST_STATE.RECEIVED, record);
  return record;
}

function getRequestTimings(record) {
  const finishedAt = record.finishedAt || nowMs();
  return {
    queuedMs: record.queuedAt && record.startedAt ? record.startedAt - record.queuedAt : 0,
    runMs: record.startedAt ? finishedAt - record.startedAt : 0,
    totalMs: finishedAt - record.receivedAt,
  };
}

function finishRequestRecord(record) {
  requestRecords.delete(record.id);
}

function markQueued(record, queueDepth) {
  record.state = REQUEST_STATE.QUEUED;
  if (!record.queuedAt) {
    record.queuedAt = nowMs();
  }
  logRequestEvent(REQUEST_STATE.QUEUED, record, { queueDepth });
}

function markRunning(record, queueDepth) {
  record.state = REQUEST_STATE.RUNNING;
  if (!record.startedAt) {
    record.startedAt = nowMs();
  }
  const timings = getRequestTimings(record);
  logRequestEvent(REQUEST_STATE.RUNNING, record, {
    queueDepth,
    queuedMs: timings.queuedMs,
  });
}

function markDone(record, extra = {}) {
  record.state = REQUEST_STATE.DONE;
  record.finishedAt = nowMs();
  const timings = getRequestTimings(record);
  logRequestEvent(REQUEST_STATE.DONE, record, {
    queuedMs: timings.queuedMs,
    runMs: timings.runMs,
    totalMs: timings.totalMs,
    ...extra,
  });
  finishRequestRecord(record);
}

function markFailed(record, error, extra = {}) {
  record.state = REQUEST_STATE.FAILED;
  record.finishedAt = nowMs();
  const timings = getRequestTimings(record);
  logRequestEvent(REQUEST_STATE.FAILED, record, {
    queuedMs: timings.queuedMs,
    runMs: timings.runMs,
    totalMs: timings.totalMs,
    error: error instanceof Error ? error.message : String(error),
    ...extra,
  });
  finishRequestRecord(record);
}

function createResponsePayload(error) {
  return {
    error: error instanceof Error ? error.message : String(error),
  };
}

function postResponse(request, payload) {
  pixso.ui.postMessage({
    type: "mcp-response",
    id: request.id,
    command: request.command,
    payload,
  });
}

function enqueueExportRequest(request, params) {
  exportQueue.push({
    request,
    params,
  });

  markQueued(request, exportQueue.length);
  void drainExportQueue();
}

async function drainExportQueue() {
  if (exportQueueRunning) return;

  exportQueueRunning = true;

  try {
    while (exportQueue.length > 0) {
      const job = exportQueue.shift();
      const { request, params } = job;

      markRunning(request, exportQueue.length);

      try {
        const payload = await exportNodes(params || {});
        markDone(request, {
          itemCount: Array.isArray(payload?.items) ? payload.items.length : 0,
          failureCount: Array.isArray(payload?.failures) ? payload.failures.length : 0,
        });
        postResponse(request, payload);
      } catch (error) {
        markFailed(request, error);
        postResponse(request, createResponsePayload(error));
      }
    }
  } finally {
    exportQueueRunning = false;
  }
}
function r1(v) { return Math.round(v * 10) / 10; }
function r3(v) { return Math.round(v * 1000) / 1000; }

function toHex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1);
}

function stripStylePrefix(name) {
  return name.replace(/^(light|dark)\//i, "");
}

function resolveStyle(id) {
  if (!id || id === pixso.mixed) return null;
  const style = pixso.getStyleById(id);
  return style ? stripStylePrefix(style.name) : null;
}

function resolveLineHeight(lh) {
  if (!lh || lh === pixso.mixed) return null;
  if (lh.unit === "AUTO") return "normal";
  if (lh.unit === "PIXELS") return lh.value + "px";
  if (lh.unit === "PERCENT") return lh.value + "%";
  return null;
}

function resolveLetterSpacing(ls) {
  if (!ls || ls === pixso.mixed) return null;
  if (ls.unit === "PIXELS") return ls.value === 0 ? null : ls.value + "px";
  if (ls.unit === "PERCENT") return ls.value === 0 ? null : ls.value + "%";
  return null;
}

function resolveFontWeight(fontName) {
  if (!fontName || fontName === pixso.mixed) return null;
  const style = fontName.style || "";
  const lower = style.toLowerCase();
  const isItalic = lower.includes("italic");
  const weightKey = lower.replace(/italic/g, "").trim().replace(/[\s-]+/g, "");
  const weight = FONT_WEIGHT[weightKey] || 400;
  return { fontWeight: weight, fontStyle: isItalic ? "italic" : "normal" };
}

function getVisibleChildren(node) {
  if (!("children" in node) || !Array.isArray(node.children)) return [];
  return node.children.filter((child) => child.visible !== false);
}

function getVisibleFills(node) {
  if (!("fills" in node) || !Array.isArray(node.fills)) return [];
  return node.fills.filter((fill) => fill && fill.visible !== false);
}

function getVisibleStrokes(node) {
  if (!("strokes" in node) || !Array.isArray(node.strokes)) return [];
  return node.strokes.filter((stroke) => stroke && stroke.visible !== false);
}

function getBounds(node) {
  return {
    x: "x" in node ? node.x : 0,
    y: "y" in node ? node.y : 0,
    w: "width" in node ? node.width : 0,
    h: "height" in node ? node.height : 0,
  };
}

function boundsOverlapOrNear(a, b, gap) {
  return (
    a.x - gap <= b.x + b.w &&
    a.x + a.w + gap >= b.x &&
    a.y - gap <= b.y + b.h &&
    a.y + a.h + gap >= b.y
  );
}

function countGraphicClusters(node, childInfos) {
  if (childInfos.length <= 1) return childInfos.length;

  const nodeBounds = getBounds(node);
  const gap = Math.max(4, Math.min(nodeBounds.w || 0, nodeBounds.h || 0) * 0.05);
  const visited = new Set();
  let clusters = 0;

  function visit(startIndex) {
    const queue = [startIndex];
    visited.add(startIndex);

    while (queue.length > 0) {
      const index = queue.shift();
      const current = childInfos[index];

      for (let i = 0; i < childInfos.length; i += 1) {
        if (visited.has(i)) continue;
        if (boundsOverlapOrNear(current.bounds, childInfos[i].bounds, gap)) {
          visited.add(i);
          queue.push(i);
        }
      }
    }
  }

  for (let i = 0; i < childInfos.length; i += 1) {
    if (visited.has(i)) continue;
    visit(i);
    clusters += 1;
  }

  return clusters;
}

function mapImageFit(scaleMode) {
  switch (scaleMode) {
    case "FIT":
      return "contain";
    case "TILE":
      return "tile";
    case "FILL":
    case "CROP":
      return "cover";
    default:
      return null;
  }
}

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

// --- Сериализация заливок ---

function serializeFill(fill) {
  if (fill.visible === false || fill.type === "IMAGE") return null;

  if (fill.type === "SOLID") {
    const data = { color: toHex(fill.color.r, fill.color.g, fill.color.b) };
    if (fill.opacity !== undefined && fill.opacity < 1) data.opacity = fill.opacity;
    return data;
  }

  const gradType = GRADIENT_TYPE[fill.type];
  if (gradType) {
    const result = {
      type: gradType,
      stops: fill.gradientStops.map((stop) => {
        const item = { pos: stop.position, color: toHex(stop.color.r, stop.color.g, stop.color.b) };
        if (stop.color.a < 1) item.opacity = stop.color.a;
        return item;
      }),
    };
    if (fill.gradientTransform) {
      const [[a, , tx], [c, , ty]] = fill.gradientTransform;
      result.handles = [
        [r3(tx), r3(ty)],
        [r3(tx + a), r3(ty + c)],
      ];
    }
    return result;
  }

  return null;
}

// --- Экстракторы свойств ---

// extractStyles ДОЛЖЕН быть первым - заполняет ctx для остальных экстракторов
function extractStyles(node, ctx) {
  const data = {};

  const fillStyle = resolveStyle("fillStyleId" in node ? node.fillStyleId : null);
  if (fillStyle) { data.fillStyleName = fillStyle; ctx.hasFillStyle = true; }

  const strokeStyle = resolveStyle("strokeStyleId" in node ? node.strokeStyleId : null);
  if (strokeStyle) { data.strokeStyleName = strokeStyle; ctx.hasStrokeStyle = true; }

  if (node.type === "TEXT") {
    const textStyle = resolveStyle("textStyleId" in node ? node.textStyleId : null);
    if (textStyle) { data.textStyleName = textStyle; ctx.hasTextStyle = true; }
  }

  return Object.keys(data).length > 0 ? data : null;
}

function extractBase(node) {
  const data = { name: node.name, type: node.type };
  if ("x" in node) data.x = r1(node.x);
  if ("y" in node) data.y = r1(node.y);
  if ("width" in node) data.w = r1(node.width);
  if ("height" in node) data.h = r1(node.height);
  return data;
}

function extractFills(node, ctx) {
  if (ctx.hasFillStyle) return null;
  const fills = getVisibleFills(node).map(serializeFill).filter(Boolean);
  return fills.length > 0 ? { fills } : null;
}

function extractStrokes(node, ctx) {
  const strokes = getVisibleStrokes(node);
  if (strokes.length === 0) return null;
  const data = {};

  if (!ctx.hasStrokeStyle) {
    const colors = strokes
      .filter((stroke) => stroke.type === "SOLID")
      .map((stroke) => toHex(stroke.color.r, stroke.color.g, stroke.color.b));
    if (colors.length > 0) {
      data.stroke = colors.length === 1 ? colors[0] : colors;
    }
  }

  if ("strokeTopWeight" in node) {
    const t = node.strokeTopWeight;
    const r = node.strokeRightWeight;
    const b = node.strokeBottomWeight;
    const l = node.strokeLeftWeight;
    const uniform = "strokeWeight" in node && t === node.strokeWeight && r === node.strokeWeight && b === node.strokeWeight && l === node.strokeWeight;
    if (uniform) {
      data.strokeW = node.strokeWeight;
    } else {
      data.strokeWeights = [t, r, b, l];
    }
  } else if ("strokeWeight" in node) {
    data.strokeW = node.strokeWeight;
  }

  if ("strokeAlign" in node) data.strokeAlign = node.strokeAlign;

  return Object.keys(data).length > 0 ? data : null;
}

function extractText(node, ctx) {
  if (node.type !== "TEXT") return null;
  const data = { text: node.characters };

  if (!ctx.hasTextStyle) {
    if ("fontSize" in node && node.fontSize !== pixso.mixed) {
      data.fontSize = node.fontSize;
    }
    if ("fontName" in node && node.fontName !== pixso.mixed) {
      data.fontFamily = node.fontName.family;
      const weight = resolveFontWeight(node.fontName);
      if (weight) {
        data.fontWeight = weight.fontWeight;
        if (weight.fontStyle !== "normal") data.fontStyle = weight.fontStyle;
      }
    }
    if ("lineHeight" in node) {
      const lineHeight = resolveLineHeight(node.lineHeight);
      if (lineHeight) data.lineHeight = lineHeight;
    }
    if ("letterSpacing" in node) {
      const letterSpacing = resolveLetterSpacing(node.letterSpacing);
      if (letterSpacing) data.letterSpacing = letterSpacing;
    }
  }

  if ("textAlignHorizontal" in node && node.textAlignHorizontal !== pixso.mixed) {
    const value = TEXT_ALIGN_H[node.textAlignHorizontal];
    if (value && value !== "left") data.textAlign = value;
  }
  if ("textAlignVertical" in node && node.textAlignVertical !== pixso.mixed) {
    const value = TEXT_ALIGN_V[node.textAlignVertical];
    if (value && value !== "top") data.verticalAlign = value;
  }
  if ("textDecoration" in node && node.textDecoration !== pixso.mixed) {
    const value = TEXT_DECORATION_MAP[node.textDecoration];
    if (value) data.textDecoration = value;
  }
  if ("textCase" in node && node.textCase !== pixso.mixed) {
    const value = TEXT_CASE_MAP[node.textCase];
    if (value) data.textCase = value;
  }
  if ("textAutoResize" in node && node.textAutoResize === "TRUNCATE") {
    data.truncate = true;
  }

  return data;
}

function extractEffects(node) {
  if (!("effects" in node) || !Array.isArray(node.effects)) return null;
  const effects = node.effects
    .filter((effect) => effect.visible !== false)
    .map((effect) => {
      if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
        const data = {
          type: effect.type,
          x: effect.offset.x,
          y: effect.offset.y,
          blur: effect.radius,
          color: toHex(effect.color.r, effect.color.g, effect.color.b),
        };
        if (effect.spread) data.spread = effect.spread;
        if (effect.color.a < 1) data.opacity = effect.color.a;
        return data;
      }
      if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
        return { type: effect.type, blur: effect.radius };
      }
      return null;
    })
    .filter(Boolean);
  return effects.length > 0 ? { effects } : null;
}

function extractTransform(node) {
  const data = {};
  if ("opacity" in node && node.opacity < 1) data.opacity = node.opacity;
  if ("rotation" in node && node.rotation !== 0) data.rotation = r1(node.rotation);
  return Object.keys(data).length > 0 ? data : null;
}

function extractCornerRadius(node) {
  if ("cornerRadius" in node && node.cornerRadius !== pixso.mixed) {
    if (node.cornerRadius !== 0) return { cornerRadius: node.cornerRadius };
    return null;
  }
  const data = {};
  let has = false;
  if ("topLeftRadius" in node && node.topLeftRadius) { data.topLeftRadius = node.topLeftRadius; has = true; }
  if ("topRightRadius" in node && node.topRightRadius) { data.topRightRadius = node.topRightRadius; has = true; }
  if ("bottomLeftRadius" in node && node.bottomLeftRadius) { data.bottomLeftRadius = node.bottomLeftRadius; has = true; }
  if ("bottomRightRadius" in node && node.bottomRightRadius) { data.bottomRightRadius = node.bottomRightRadius; has = true; }
  return has ? data : null;
}

function extractAutoLayout(node) {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return null;
  const data = { layout: LAYOUT_DIR[node.layoutMode] || node.layoutMode };

  if (node.itemSpacing) data.gap = node.itemSpacing;

  const padding = [node.paddingTop || 0, node.paddingRight || 0, node.paddingBottom || 0, node.paddingLeft || 0];
  if (padding.some((value) => value > 0)) data.padding = padding;

  if ("primaryAxisAlignItems" in node) data.mainAlign = MAIN_ALIGN[node.primaryAxisAlignItems] || node.primaryAxisAlignItems;
  if ("counterAxisAlignItems" in node) data.crossAlign = CROSS_ALIGN[node.counterAxisAlignItems] || node.counterAxisAlignItems;
  if ("primaryAxisSizingMode" in node) data.mainSize = node.primaryAxisSizingMode;
  if ("counterAxisSizingMode" in node) data.crossSize = node.counterAxisSizingMode;

  if ("layoutWrap" in node && node.layoutWrap === "WRAP") {
    data.layoutWrap = "wrap";
    if ("counterAxisSpacing" in node && node.counterAxisSpacing) {
      data.wrapGap = node.counterAxisSpacing;
    }
  }

  return data;
}

function extractLayoutChild(node) {
  const data = {};
  if ("layoutAlign" in node) {
    const value = LAYOUT_ALIGN_MAP[node.layoutAlign];
    if (value && value !== "auto") data.layoutAlign = value;
  }
  if ("layoutGrow" in node && node.layoutGrow === 1) data.layoutGrow = 1;
  return Object.keys(data).length > 0 ? data : null;
}

function extractOverflow(node) {
  const data = {};
  if ("overflowDirection" in node) {
    const value = OVERFLOW_DIR[node.overflowDirection];
    if (value) data.overflow = value;
  }
  if ("clipsContent" in node && node.clipsContent) data.clipsContent = true;
  if ("constraints" in node) {
    const constraints = node.constraints;
    if (constraints.horizontal !== "MIN" || constraints.vertical !== "MIN") {
      data.constraints = { h: constraints.horizontal, v: constraints.vertical };
    }
  }
  return Object.keys(data).length > 0 ? data : null;
}

// --- Профили и анализ ассетов ---

const PROFILES = {
  codegen: [
    extractStyles,
    extractBase,
    extractFills,
    extractStrokes,
    extractText,
    extractEffects,
    extractTransform,
    extractCornerRadius,
    extractAutoLayout,
    extractLayoutChild,
    extractOverflow,
  ],
};

function serializeNode(node) {
  const ctx = {};
  return Object.assign({}, ...PROFILES.codegen.map((extractor) => extractor(node, ctx) || {}));
}

function analyzeNode(node) {
  const childInfos = getVisibleChildren(node)
    .map((child) => analyzeNode(child))
    .filter(Boolean);

  const fills = getVisibleFills(node);
  const strokes = getVisibleStrokes(node);
  const imageFills = fills.filter((fill) => fill.type === "IMAGE");
  const nonImageFills = fills.filter((fill) => fill.type !== "IMAGE");
  const selfHasVectorType = VECTOR_NODE_TYPES.has(node.type);
  const selfHasStroke = strokes.length > 0;
  const selfHasVectorPaint = nonImageFills.length > 0 || selfHasStroke || selfHasVectorType;

  const hasText = node.type === "TEXT" || childInfos.some((child) => child.hasText);
  const hasImage = imageFills.length > 0 || childInfos.some((child) => child.hasImage);
  const hasVector = selfHasVectorPaint || childInfos.some((child) => child.hasVector);
  const hasGraphic = hasImage || hasVector;
  const graphicChildren = childInfos.filter((child) => child.hasGraphic);
  const clusters = countGraphicClusters(node, graphicChildren);
  const hasMultiChildAutoLayout = "layoutMode" in node && node.layoutMode !== "NONE" && getVisibleChildren(node).length > 1;
  const isCoherentAsset = !hasText && hasGraphic && !hasMultiChildAutoLayout && clusters <= 1;
  const kind = !hasText && hasImage ? "raster" : (!hasText && hasVector ? "vector" : null);
  const firstImageFill = imageFills[0] || childInfos.find((child) => child.firstImageFill)?.firstImageFill || null;

  return {
    node,
    childInfos,
    bounds: getBounds(node),
    hasText,
    hasImage,
    hasVector,
    hasGraphic,
    isCoherentAsset,
    kind,
    firstImageFill,
    selfHasStroke,
    selfHasNonImageFill: nonImageFills.length > 0,
    visibleChildrenCount: getVisibleChildren(node).length,
  };
}

function resolveRasterUsageHint(info) {
  const rootNode = info.node;
  const rootHasDecoration = info.selfHasStroke || info.selfHasNonImageFill || info.visibleChildrenCount > 0;
  const isBareRasterNode = info.firstImageFill && !rootHasDecoration;

  if (isBareRasterNode && (rootNode.type === "RECTANGLE" || rootNode.type === "FRAME")) {
    return "img";
  }

  return "background";
}

function buildAssetExport(info) {
  if (info.kind === "raster") {
    const assetExport = {
      kind: "raster",
      preferredTool: "get_selection_png",
      availableTools: ["get_selection_png"],
      usageHint: resolveRasterUsageHint(info),
    };
    const fit = info.firstImageFill ? mapImageFit(info.firstImageFill.scaleMode) : null;
    if (fit) assetExport.fit = fit;
    return assetExport;
  }

  if (info.kind === "vector") {
    return {
      kind: "vector",
      preferredTool: "get_selection_svg",
      availableTools: ["get_selection_svg", "get_selection_png"],
    };
  }

  return null;
}

function serializeAnalyzedTree(info, suppressAssetHints = false) {
  const data = serializeNode(info.node);
  const assetExport = info.isCoherentAsset ? buildAssetExport(info) : null;

  if (!suppressAssetHints && assetExport) {
    data.id = info.node.id;
    data.assetExport = assetExport;
  }

  if (info.childInfos.length > 0) {
    const children = info.childInfos
      .map((childInfo) => serializeAnalyzedTree(childInfo, suppressAssetHints || !!assetExport))
      .filter(Boolean);
    if (children.length > 0) data.children = children;
  }

  return data;
}

function countNodes(tree) {
  let count = 1;
  if (tree.children) {
    tree.children.forEach((child) => { count += countNodes(child); });
  }
  return count;
}

// --- Экспорт нод ---

function buildExportSettings(format, rawSettings = {}) {
  const settings = { format };

  if (typeof rawSettings.contentsOnly === "boolean") {
    settings.contentsOnly = rawSettings.contentsOnly;
  }
  if (typeof rawSettings.useAbsoluteBounds === "boolean") {
    settings.useAbsoluteBounds = rawSettings.useAbsoluteBounds;
  }
  if (format === "PNG" && rawSettings.constraint) {
    settings.constraint = {
      type: rawSettings.constraint.type,
      value: rawSettings.constraint.value,
    };
  }
  if (format === "SVG" && typeof rawSettings.svgIdAttribute === "boolean") {
    settings.svgIdAttribute = rawSettings.svgIdAttribute;
  }

  return settings;
}

function resolveExportTargets(nodeIds) {
  if (Array.isArray(nodeIds) && nodeIds.length > 0) {
    return nodeIds.map((nodeId) => ({
      nodeId,
      node: pixso.getNodeById(nodeId),
    }));
  }

  return pixso.currentPage.selection.map((node) => ({
    nodeId: node.id,
    node,
  }));
}

async function exportNodes(params = {}) {
  const format = params.format;
  const settings = buildExportSettings(format, params.settings || {});
  const targets = resolveExportTargets(params.nodeIds);

  if (targets.length === 0) {
    throw new Error("No nodes selected for export");
  }

  const items = [];
  const failures = [];

  for (const target of targets) {
    const node = target.node;

    if (!node) {
      failures.push({ id: target.nodeId, error: "Node not found" });
      continue;
    }

    if (node.visible === false) {
      failures.push({ id: node.id, name: node.name, error: "Node is hidden" });
      continue;
    }

    if (typeof node.exportAsync !== "function") {
      failures.push({ id: node.id, name: node.name, error: "Node cannot be exported" });
      continue;
    }

    try {
      if (typeof node.getIsExportSizeExceeded === "function" && node.getIsExportSizeExceeded(settings)) {
        throw new Error("Export size exceeds Pixso limit");
      }

      const bytes = await node.exportAsync(settings);
      const info = analyzeNode(node);
      const assetExport = buildAssetExport(info);
      const item = {
        id: node.id,
        name: node.name,
        mimeType: MIME_TYPE[format],
        data: uint8ToBase64(bytes),
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
  }

  return { format, items, failures };
}

// --- Обработка сообщений от UI (из WebSocket-моста) ---

pixso.ui.onmessage = async (msg) => {
  if (msg.type !== "mcp-request") return;

  const { id, command, params } = msg;
  const request = createRequestRecord(id, command);

  if (command === EXPORT_COMMAND) {
    enqueueExportRequest(request, params || {});
    return;
  }

  try {
    markRunning(request, 0);

    switch (command) {
      case "getSelection": {
        const selection = pixso.currentPage.selection;
        const nodes = selection
          .filter((node) => node.visible !== false)
          .map((node) => serializeAnalyzedTree(analyzeNode(node)))
          .filter(Boolean);
        const totalCount = nodes.reduce((sum, node) => sum + countNodes(node), 0);

        const payload = { nodes };
        if (totalCount > 200) {
          payload._warning = `Large selection: ${totalCount} nodes`;
        }

        markDone(request, {
          nodeCount: nodes.length,
          totalCount,
        });
        postResponse(request, payload);
        break;
      }

      default: {
        throw new Error(`Command ${command} not supported`);
      }
    }
  } catch (error) {
    markFailed(request, error);
    postResponse(request, createResponsePayload(error));
  }
};
