// Показываем UI для работы WebSocket-моста
pixso.showUI(__html__, {
  title: "Pixso MCP Bridge",
  width: 250,
  height: 120,
});

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
    if ("fills" in node && Array.isArray(node.fills)) {
      // Упрощаем цвета (только SOLID)
      data.colors = node.fills
        .filter((f) => f.type === "SOLID")
        .map((f) => ({
          r: Math.round(f.color.r * 255),
          g: Math.round(f.color.g * 255),
          b: Math.round(f.color.b * 255),
          opacity: f.opacity,
        }));
    }
    
    // Рекурсивный обход детей (если есть)
    if ("children" in node && node.children.length > 0) {
      // Для детального просмотра возвращаем только ID детей
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
    payload: payload,
  });
};
