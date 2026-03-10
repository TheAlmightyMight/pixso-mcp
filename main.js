// Показываем UI для работы WebSocket-моста
pixso.showUI(__html__, {
  title: "Pixso MCP Bridge",
  width: 280,
  height: 420,
});

/** @param {SceneNode} node */
function extractBase(node) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };
}

/** @param {SceneNode} node */
function extractGeometry(node) {
  const data = {};
  if ("x" in node) data.x = Math.round(node.x * 10) / 10;
  if ("y" in node) data.y = Math.round(node.y * 10) / 10;
  if ("width" in node) data.width = Math.round(node.width * 10) / 10;
  if ("height" in node) data.height = Math.round(node.height * 10) / 10;
  if ("absoluteTransform" in node) {
    data.absoluteX = Math.round(node.absoluteTransform[0][2] * 10) / 10;
    data.absoluteY = Math.round(node.absoluteTransform[1][2] * 10) / 10;
  }
  return data;
}

/** @param {SceneNode} node */
function extractParent(node) {
  if (!node.parent || node.parent.type === "PAGE") return null;
  return {
    parentId: node.parent.id,
    parentName: node.parent.name,
    parentType: node.parent.type,
  };
}

function serializeFill(f) {
  if (f.type === "SOLID") {
    return {
      type: "SOLID",
      r: Math.round(f.color.r * 255),
      g: Math.round(f.color.g * 255),
      b: Math.round(f.color.b * 255),
      opacity: f.opacity,
    };
  }
  if (f.type === "LINEAR_GRADIENT" || f.type === "RADIAL_GRADIENT") {
    const result = {
      type: f.type,
      stops: f.gradientStops.map((s) => ({
        position: s.position,
        r: Math.round(s.color.r * 255),
        g: Math.round(s.color.g * 255),
        b: Math.round(s.color.b * 255),
        opacity: s.color.a,
      })),
    };
    if (f.gradientTransform) {
      const [[a, , tx], [c, , ty]] = f.gradientTransform;
      result.gradientHandlePositions = [
        { x: Math.round(tx * 1000) / 1000, y: Math.round(ty * 1000) / 1000 },
        { x: Math.round((tx + a) * 1000) / 1000, y: Math.round((ty + c) * 1000) / 1000 },
      ];
    }
    return result;
  }
  return null;
}

/** @param {SceneNode} node */
function extractFills(node) {
  if (!("fills" in node) || !Array.isArray(node.fills)) return null;
  const fills = node.fills.map(serializeFill).filter(Boolean);
  return fills.length > 0 ? { fills } : null;
}

/** @param {SceneNode} node */
function extractStrokes(node) {
  if (!("strokes" in node) || !Array.isArray(node.strokes) || node.strokes.length === 0) return null;
  const data = {
    strokes: node.strokes
      .filter((s) => s.type === "SOLID")
      .map((s) => ({
        type: "SOLID",
        r: Math.round(s.color.r * 255),
        g: Math.round(s.color.g * 255),
        b: Math.round(s.color.b * 255),
        opacity: s.opacity,
      })),
  };
  if ("strokeWeight" in node) data.strokeWeight = node.strokeWeight;
  if ("strokeAlign" in node) data.strokeAlign = node.strokeAlign;
  return data;
}

/** @param {SceneNode} node */
function extractText(node) {
  if (node.type !== "TEXT") return null;
  const data = { text: node.characters };
  if ("fontSize" in node && node.fontSize !== pixso.mixed) {
    data.fontSize = node.fontSize;
  }
  return data;
}

/** @param {SceneNode} node */
function extractEffects(node) {
  if (!("effects" in node) || !Array.isArray(node.effects)) return null;
  const effects = node.effects
    .filter((e) => e.visible !== false)
    .map((e) => {
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
        return {
          type: e.type,
          offsetX: e.offset.x,
          offsetY: e.offset.y,
          blur: e.radius,
          spread: e.spread || 0,
          r: Math.round(e.color.r * 255),
          g: Math.round(e.color.g * 255),
          b: Math.round(e.color.b * 255),
          opacity: e.color.a,
        };
      }
      if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
        return { type: e.type, blur: e.radius };
      }
      return null;
    })
    .filter(Boolean);
  return effects.length > 0 ? { effects } : null;
}

/** @param {SceneNode} node */
function extractTransform(node) {
  const result = {};
  if ("opacity" in node && node.opacity < 1) result.opacity = node.opacity;
  if ("rotation" in node && node.rotation !== 0) {
    result.rotation = Math.round(node.rotation * 10) / 10;
  }
  if ("blendMode" in node && node.blendMode !== "PASS_THROUGH" && node.blendMode !== "NORMAL") {
    result.blendMode = node.blendMode;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** @param {SceneNode} node */
function extractCornerRadius(node) {
  if ("cornerRadius" in node && node.cornerRadius !== pixso.mixed) {
    if (node.cornerRadius !== 0) return { cornerRadius: node.cornerRadius };
    return null;
  }
  const data = {};
  let hasRadius = false;
  if ("topLeftRadius" in node && node.topLeftRadius) { data.topLeftRadius = node.topLeftRadius; hasRadius = true; }
  if ("topRightRadius" in node && node.topRightRadius) { data.topRightRadius = node.topRightRadius; hasRadius = true; }
  if ("bottomLeftRadius" in node && node.bottomLeftRadius) { data.bottomLeftRadius = node.bottomLeftRadius; hasRadius = true; }
  if ("bottomRightRadius" in node && node.bottomRightRadius) { data.bottomRightRadius = node.bottomRightRadius; hasRadius = true; }
  return hasRadius ? data : null;
}

/** @param {SceneNode} node */
function extractAutoLayout(node) {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return null;
  const data = {
    layoutMode: node.layoutMode,
    itemSpacing: node.itemSpacing,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
  };
  if ("primaryAxisAlignItems" in node) data.primaryAxisAlignItems = node.primaryAxisAlignItems;
  if ("counterAxisAlignItems" in node) data.counterAxisAlignItems = node.counterAxisAlignItems;
  if ("primaryAxisSizingMode" in node) data.primaryAxisSizingMode = node.primaryAxisSizingMode;
  if ("counterAxisSizingMode" in node) data.counterAxisSizingMode = node.counterAxisSizingMode;
  return data;
}

/** @param {SceneNode} node */
function extractConstraints(node) {
  const data = {};
  if ("constraints" in node) {
    data.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }
  if ("layoutSizingHorizontal" in node) data.layoutSizingHorizontal = node.layoutSizingHorizontal;
  if ("layoutSizingVertical" in node) data.layoutSizingVertical = node.layoutSizingVertical;
  return Object.keys(data).length > 0 ? data : null;
}

/** @param {SceneNode} node */
function extractStyles(node) {
  const data = {};
  if ("fillStyleId" in node && node.fillStyleId && node.fillStyleId !== pixso.mixed) {
    const style = pixso.getStyleById(node.fillStyleId);
    if (style) data.fillStyleName = style.name;
  }
  if ("strokeStyleId" in node && node.strokeStyleId && node.strokeStyleId !== pixso.mixed) {
    const style = pixso.getStyleById(node.strokeStyleId);
    if (style) data.strokeStyleName = style.name;
  }
  if (node.type === "TEXT" && "textStyleId" in node && node.textStyleId && node.textStyleId !== pixso.mixed) {
    const style = pixso.getStyleById(node.textStyleId);
    if (style) data.textStyleName = style.name;
  }
  return Object.keys(data).length > 0 ? data : null;
}

const PROFILES = {
  summary: [extractBase, extractGeometry],
  codegen: [
    extractBase, extractGeometry, extractParent, extractFills,
    extractStrokes, extractText, extractEffects, extractTransform,
    extractCornerRadius, extractAutoLayout, extractConstraints, extractStyles,
  ],
};

function serializeNode(node, profile = "summary") {
  const extractors = PROFILES[profile];
  return Object.assign({}, ...extractors.map((fn) => fn(node) || {}));
}

function serializeTree(node, profile) {
  const data = serializeNode(node, profile);
  if ("children" in node && node.children.length > 0) {
    data.children = node.children.map((child) => serializeTree(child, profile));
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

/**
 * Обработка сообщений от UI (из WebSocket-моста)
 */
pixso.ui.onmessage = async (msg) => {
  if (msg.type !== "mcp-request") return;

  const { id, command, params } = msg;
  let payload;

  try {
    switch (command) {
      case "getSelection": {
        const selection = pixso.currentPage.selection;
        const nodes = selection.map((node) => serializeTree(node, "codegen"));
        const totalCount = nodes.reduce((sum, n) => sum + countNodes(n), 0);
        payload = { nodes };
        if (totalCount > 200) {
          payload._warning = `Large selection: ${totalCount} nodes`;
        }
        break;
      }

      case "listLayers": {
        payload = pixso.currentPage.children.map((node) => serializeNode(node, "summary"));
        break;
      }

      case "getNodeDetails": {
        const node = pixso.getNodeById(params.nodeId);
        if (node) {
          payload = serializeNode(node, "codegen");
        } else {
          payload = { error: "Node not found" };
        }
        break;
      }

      case "listDesignTokens": {
        // Список всех стилей в документе (Design Tokens)
        const paintStyles = pixso.getLocalPaintStyles().map(s => ({ id: s.id, name: s.name, type: "PAINT", description: s.description }));
        const textStyles = pixso.getLocalTextStyles().map(s => ({ id: s.id, name: s.name, type: "TEXT", description: s.description }));
        payload = { paintStyles, textStyles };
        break;
      }

      default:
        payload = { error: `Command ${command} not supported` };
    }
  } catch (err) {
    console.error("Ошибка в main.js:", err);
    payload = { error: err.message };
  }

  // Отправляем результат обратно в UI (который перешлет его в WebSocket)
  pixso.ui.postMessage({
    type: "mcp-response",
    id: id,
    command: command,
    payload: payload,
  });
};
