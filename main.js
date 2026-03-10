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

/**
 * Сериализация узла Pixso с фильтрацией свойств для экономии токенов.
 * @param {SceneNode} node - Узел Pixso.
 * @param {boolean} detailed - Нужно ли возвращать все детали.
 */
function serializeNode(node, detailed = false) {
  // Базовые свойства
  const data = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  // Округление геометрии
  if ("x" in node) data.x = Math.round(node.x * 10) / 10;
  if ("y" in node) data.y = Math.round(node.y * 10) / 10;
  if ("width" in node) data.width = Math.round(node.width * 10) / 10;
  if ("height" in node) data.height = Math.round(node.height * 10) / 10;

  // Семантическое описание текста
  if (node.type === "TEXT") {
    data.text = node.characters;
    if (detailed && "fontSize" in node) {
      data.fontSize = node.fontSize;
    }
  }

  // Детализация по запросу
  if (detailed) {
    // 1. Стили и переменные (Design Tokens)
    if ("fillStyleId" in node && node.fillStyleId) {
      const style = pixso.getStyleById(node.fillStyleId);
      if (style) data.fillStyleName = style.name;
    }
    if ("strokeStyleId" in node && node.strokeStyleId) {
      const style = pixso.getStyleById(node.strokeStyleId);
      if (style) data.strokeStyleName = style.name;
    }
    if (node.type === "TEXT" && "textStyleId" in node && node.textStyleId) {
      const style = pixso.getStyleById(node.textStyleId);
      if (style) data.textStyleName = style.name;
    }

    // 2. Цвет заливки (Fills)
    if ("fills" in node && Array.isArray(node.fills)) {
      data.colors = node.fills
        .filter((f) => f.type === "SOLID")
        .map((f) => ({
          r: Math.round(f.color.r * 255),
          g: Math.round(f.color.g * 255),
          b: Math.round(f.color.b * 255),
          opacity: f.opacity,
        }));
    }

    // 2. Рамки (Strokes)
    if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
      data.strokes = node.strokes
        .filter((s) => s.type === "SOLID")
        .map((s) => ({
          r: Math.round(s.color.r * 255),
          g: Math.round(s.color.g * 255),
          b: Math.round(s.color.b * 255),
          opacity: s.opacity,
        }));
      if ("strokeWeight" in node) data.strokeWeight = node.strokeWeight;
      if ("strokeAlign" in node) data.strokeAlign = node.strokeAlign;
    }

    // 3. Скругления углов (Radius)
    if ("cornerRadius" in node && node.cornerRadius !== pixso.mixed) {
      if (node.cornerRadius !== 0) data.cornerRadius = node.cornerRadius;
    } else {
      if ("topLeftRadius" in node) data.topLeftRadius = node.topLeftRadius;
      if ("topRightRadius" in node) data.topRightRadius = node.topRightRadius;
      if ("bottomLeftRadius" in node) data.bottomLeftRadius = node.bottomLeftRadius;
      if ("bottomRightRadius" in node) data.bottomRightRadius = node.bottomRightRadius;
    }

    // 4. Комновка (Auto Layout)
    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      data.layoutMode = node.layoutMode;
      data.itemSpacing = node.itemSpacing;
      data.paddingLeft = node.paddingLeft;
      data.paddingRight = node.paddingRight;
      data.paddingTop = node.paddingTop;
      data.paddingBottom = node.paddingBottom;
      if ("primaryAxisAlignItems" in node) data.primaryAxisAlignItems = node.primaryAxisAlignItems;
      if ("counterAxisAlignItems" in node) data.counterAxisAlignItems = node.counterAxisAlignItems;
      if ("primaryAxisSizingMode" in node) data.primaryAxisSizingMode = node.primaryAxisSizingMode;
      if ("counterAxisSizingMode" in node) data.counterAxisSizingMode = node.counterAxisSizingMode;
    }
    
    // 5. Рекурсивный обход детей (если есть)
    if ("children" in node && node.children.length > 0) {
      data.childrenIds = node.children.map((c) => c.id);
    }
  }

  return data;
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
        // Получаем выделенные узлы
        const selection = pixso.currentPage.selection;
        payload = selection.map((node) => serializeNode(node, true));
        break;
      }

      case "listLayers": {
        // Список слоев верхнего уровня на странице
        payload = pixso.currentPage.children.map((node) => serializeNode(node, false));
        break;
      }

      case "getNodeDetails": {
        // Поиск конкретного узла по ID
        const node = pixso.getNodeById(params.nodeId);
        if (node) {
          payload = serializeNode(node, true);
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
