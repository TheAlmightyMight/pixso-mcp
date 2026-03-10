import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer } from "ws";
import { z } from "zod";

/**
 * MCP-сервер для Pixso.
 * Позволяет LLM запрашивать информацию о дизайне через WebSocket-мост с плагином.
 */

const server = new Server(
  {
    name: "pixso-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// WebSocket-сервер для подключения плагина Pixso
const wss = new WebSocketServer({ port: 3001 });
/** @type {import("ws").WebSocket | null} */
let pluginSocket = null;

// Очередь ожидающих запросов от MCP к плагину
/** @type {Map<string, (payload: any) => void>} */
const pendingRequests = new Map();

wss.on("connection", (ws) => {
  console.error("Плагин Pixso подключен к WebSocket");
  pluginSocket = ws;

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === "response" && message.id) {
        const resolve = pendingRequests.get(message.id);
        if (resolve) {
          resolve(message.payload);
          pendingRequests.delete(message.id);
        }
      }
    } catch (err) {
      console.error("Ошибка при обработке сообщения от плагина:", err);
    }
  });

  ws.on("close", () => {
    console.error("Плагин Pixso отключился");
    pluginSocket = null;
  });
});

/**
 * Отправляет запрос в плагин и ждет ответа.
 * @param {string} command
 * @param {any} [params]
 */
async function callPlugin(command, params = {}) {
  const socket = pluginSocket;
  if (!socket) {
    throw new Error("Плагин Pixso не подключен. Убедитесь, что плагин запущен в Pixso.");
  }

  const id = Math.random().toString(36).substring(7);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Тайм-аут ожидания ответа от плагина Pixso"));
    }, 10000);

    pendingRequests.set(id, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });

    socket.send(JSON.stringify({ id, type: "request", command, params }));
  });
}

// Список доступных инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_selection",
        description: "Получает информацию о текущих выделенных элементах в Pixso (оптимизировано для экономии токенов).",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_layers",
        description: "Получает список слоев верхнего уровня на текущей странице Pixso.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_node_details",
        description: "Получает детальную информацию о конкретном узле по его ID.",
        inputSchema: {
          type: "object",
          properties: {
            nodeId: { type: "string", description: "ID узла в Pixso" },
          },
          required: ["nodeId"],
        },
      },
    ],
  };
});

// Обработка вызова инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_selection": {
        const data = await callPlugin("getSelection");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }
      case "list_layers": {
        const data = await callPlugin("listLayers");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }
      case "get_node_details": {
        const { nodeId } = z.object({ nodeId: z.string() }).parse(args);
        const data = await callPlugin("getNodeDetails", { nodeId });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }
      default:
        throw new Error(`Неизвестный инструмент: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text", text: `Ошибка: ${errorMessage}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pixso MCP Server запущен на stdio");
}

main().catch((error) => {
  console.error("Критическая ошибка сервера:", error);
  process.exit(1);
});
