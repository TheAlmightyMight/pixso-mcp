import { z } from "zod";
import { callPlugin } from "./bridge.js";

/** Определения MCP-инструментов */
export const toolDefinitions = [
  {
    name: "get_selection",
    description:
      "Returns complete design specification of selected elements including full subtree, styles, effects, layout, and constraints. Optimized for code generation.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_layers",
    description:
      "Получает список слоев верхнего уровня на текущей странице Pixso.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_node_details",
    description:
      "Returns detailed design specification of a single node by ID. Does not include children.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string", description: "ID узла в Pixso" },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "list_design_tokens",
    description:
      "Получает список всех дизайн-токенов (цветовых и текстовых стилей) в документе Pixso.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Обрабатывает вызов MCP-инструмента.
 * @param {string} name
 * @param {Record<string, unknown>} [args]
 * @returns {Promise<any>}
 */
export async function handleToolCall(name, args) {
  switch (name) {
    case "get_selection":
      return callPlugin("getSelection");
    case "list_layers":
      return callPlugin("listLayers");
    case "get_node_details": {
      const { nodeId } = z.object({ nodeId: z.string() }).parse(args);
      return callPlugin("getNodeDetails", { nodeId });
    }
    case "list_design_tokens":
      return callPlugin("listDesignTokens");
    default:
      throw new Error(`Неизвестный инструмент: ${name}`);
  }
}
