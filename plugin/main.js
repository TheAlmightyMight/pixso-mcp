// Показываем UI для работы WebSocket-моста
pixso.showUI(__html__, {
  title: "Pixso MCP Bridge",
  width: 280,
  height: 420,
});

// ─── Таблицы нормализации ──────────────────────────────────────────

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

// ─── Утилиты ───────────────────────────────────────────────────────

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

// ─── Сериализация заливок ──────────────────────────────────────────

function serializeFill(f) {
  if (f.visible === false) return null;

  if (f.type === "SOLID") {
    const data = { color: toHex(f.color.r, f.color.g, f.color.b) };
    if (f.opacity !== undefined && f.opacity < 1) data.opacity = f.opacity;
    return data;
  }

  const gradType = GRADIENT_TYPE[f.type];
  if (gradType) {
    const result = {
      type: gradType,
      stops: f.gradientStops.map((s) => {
        const stop = { pos: s.position, color: toHex(s.color.r, s.color.g, s.color.b) };
        if (s.color.a < 1) stop.opacity = s.color.a;
        return stop;
      }),
    };
    if (f.gradientTransform) {
      const [[a, , tx], [c, , ty]] = f.gradientTransform;
      result.handles = [
        [r3(tx), r3(ty)],
        [r3(tx + a), r3(ty + c)],
      ];
    }
    return result;
  }

  if (f.type === "IMAGE") {
    const data = { type: "image" };
    if (f.scaleMode) data.scaleMode = f.scaleMode;
    return data;
  }

  return null;
}

// ─── Экстракторы свойств ───────────────────────────────────────────

// extractStyles ДОЛЖЕН быть первым — заполняет ctx для остальных экстракторов
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
  // DEBUG: expose raw visible value so we can see what Pixso sets for hidden layers
  if ("visible" in node) data._visible = node.visible;
  return data;
}

function extractFills(node, ctx) {
  if (ctx.hasFillStyle) return null;
  if (!("fills" in node) || !Array.isArray(node.fills)) return null;
  const fills = node.fills.map(serializeFill).filter(Boolean);
  return fills.length > 0 ? { fills } : null;
}

function extractStrokes(node, ctx) {
  if (!("strokes" in node) || !Array.isArray(node.strokes) || node.strokes.length === 0) return null;
  const data = {};

  if (!ctx.hasStrokeStyle) {
    const colors = node.strokes
      .filter((s) => s.type === "SOLID")
      .map((s) => toHex(s.color.r, s.color.g, s.color.b));
    if (colors.length > 0) {
      data.stroke = colors.length === 1 ? colors[0] : colors;
    }
  }

  // Ширина обводки: единая или по сторонам
  if ("strokeTopWeight" in node) {
    const t = node.strokeTopWeight, r = node.strokeRightWeight;
    const b = node.strokeBottomWeight, l = node.strokeLeftWeight;
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

  // C-флаг: типографика пропускается если есть текстовый токен
  if (!ctx.hasTextStyle) {
    if ("fontSize" in node && node.fontSize !== pixso.mixed) {
      data.fontSize = node.fontSize;
    }
    if ("fontName" in node && node.fontName !== pixso.mixed) {
      data.fontFamily = node.fontName.family;
      const wt = resolveFontWeight(node.fontName);
      if (wt) {
        data.fontWeight = wt.fontWeight;
        if (wt.fontStyle !== "normal") data.fontStyle = wt.fontStyle;
      }
    }
    if ("lineHeight" in node) {
      const lh = resolveLineHeight(node.lineHeight);
      if (lh) data.lineHeight = lh;
    }
    if ("letterSpacing" in node) {
      const ls = resolveLetterSpacing(node.letterSpacing);
      if (ls) data.letterSpacing = ls;
    }
  }

  // P-флаги: всегда присутствуют (не зависят от текстового токена)
  if ("textAlignHorizontal" in node && node.textAlignHorizontal !== pixso.mixed) {
    const v = TEXT_ALIGN_H[node.textAlignHorizontal];
    if (v && v !== "left") data.textAlign = v;
  }
  if ("textAlignVertical" in node && node.textAlignVertical !== pixso.mixed) {
    const v = TEXT_ALIGN_V[node.textAlignVertical];
    if (v && v !== "top") data.verticalAlign = v;
  }
  if ("textDecoration" in node && node.textDecoration !== pixso.mixed) {
    const v = TEXT_DECORATION_MAP[node.textDecoration];
    if (v) data.textDecoration = v;
  }
  if ("textCase" in node && node.textCase !== pixso.mixed) {
    const v = TEXT_CASE_MAP[node.textCase];
    if (v) data.textCase = v;
  }
  if ("textAutoResize" in node && node.textAutoResize === "TRUNCATE") {
    data.truncate = true;
  }

  return data;
}

function extractEffects(node) {
  if (!("effects" in node) || !Array.isArray(node.effects)) return null;
  const effects = node.effects
    .filter((e) => e.visible !== false)
    .map((e) => {
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
        const d = { type: e.type, x: e.offset.x, y: e.offset.y, blur: e.radius, color: toHex(e.color.r, e.color.g, e.color.b) };
        if (e.spread) d.spread = e.spread;
        if (e.color.a < 1) d.opacity = e.color.a;
        return d;
      }
      if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
        return { type: e.type, blur: e.radius };
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

  const p = [node.paddingTop || 0, node.paddingRight || 0, node.paddingBottom || 0, node.paddingLeft || 0];
  if (p.some((v) => v > 0)) data.padding = p;

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
    const v = LAYOUT_ALIGN_MAP[node.layoutAlign];
    if (v && v !== "auto") data.layoutAlign = v;
  }
  if ("layoutGrow" in node && node.layoutGrow === 1) data.layoutGrow = 1;
  return Object.keys(data).length > 0 ? data : null;
}

function extractOverflow(node) {
  const data = {};
  if ("overflowDirection" in node) {
    const v = OVERFLOW_DIR[node.overflowDirection];
    if (v) data.overflow = v;
  }
  if ("clipsContent" in node && node.clipsContent) data.clipsContent = true;
  if ("constraints" in node) {
    const c = node.constraints;
    if (c.horizontal !== "MIN" || c.vertical !== "MIN") {
      data.constraints = { h: c.horizontal, v: c.vertical };
    }
  }
  return Object.keys(data).length > 0 ? data : null;
}

// ─── Профили и сериализация ────────────────────────────────────────

// extractStyles ДОЛЖЕН быть первым — заполняет ctx перед остальными экстракторами
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
  const extractors = PROFILES.codegen;
  return Object.assign({}, ...extractors.map((fn) => fn(node, ctx) || {}));
}

function serializeTree(node) {
  if (node.visible === false) return null;

  const data = serializeNode(node);
  if ("children" in node && node.children.length > 0) {
    const children = node.children
      .map((child) => serializeTree(child))
      .filter(Boolean);
    if (children.length > 0) data.children = children;
  }
  return data;
}

function countNodes(tree) {
  let count = 1;
  if (tree.children) {
    tree.children.forEach((c) => { count += countNodes(c); });
  }
  return count;
}

// ─── Обработка сообщений от UI (из WebSocket-моста) ────────────────

pixso.ui.onmessage = async (msg) => {
  if (msg.type !== "mcp-request") return;

  const { id, command } = msg;
  let payload;

  try {
    switch (command) {
      case "getSelection": {
        const selection = pixso.currentPage.selection;
        const nodes = selection
          .map((node) => serializeTree(node))
          .filter(Boolean);
        const totalCount = nodes.reduce((sum, n) => sum + countNodes(n), 0);
        payload = { nodes };
        if (totalCount > 200) {
          payload._warning = `Large selection: ${totalCount} nodes`;
        }
        break;
      }

      default:
        payload = { error: `Command ${command} not supported` };
    }
  } catch (err) {
    console.error("Ошибка в main.js:", err);
    payload = { error: err.message };
  }

  pixso.ui.postMessage({
    type: "mcp-response",
    id: id,
    command: command,
    payload: payload,
  });
};
