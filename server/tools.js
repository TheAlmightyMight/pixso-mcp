import { callPlugin } from "./bridge.js";

/** Определения MCP-инструментов */
export const toolDefinitions = [
  {
    name: "get_selection",
    description:
      "Возвращает полную спецификацию дизайна выделенных элементов, включая всё поддерево, стили, эффекты, макет и ограничения. Оптимизировано для генерации кода.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Обрабатывает вызов MCP-инструмента.
 * @param {string} name
 * @returns {Promise<any>}
 */
export async function handleToolCall(name) {
  switch (name) {
    case "get_selection":
      return callPlugin("getSelection");
    default:
      throw new Error(`Неизвестный инструмент: ${name}`);
  }
}
