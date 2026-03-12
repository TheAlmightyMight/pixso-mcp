import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { startBridge } from "./bridge.js";
import { handleToolCall } from "./tools.js";

/**
 * MCP-сервер для Pixso.
 * Мы используем SSEServerTransport, но без express.json(), чтобы избежать 
 * ошибки "stream is not readable", так как SDK сам читает поток данных из запроса.
 */

const server = new McpServer({
  name: "pixso-mcp-server",
  version: "1.0.0",
});

// Регистрация инструментов
server.tool(
  "get_selection",
  "Возвращает полную спецификацию дизайна выделенных элементов, включая всё поддерево, стили, эффекты, макет и ограничения. Оптимизировано для генерации кода.",
  {},
  async () => {
    try {
      const data = await handleToolCall("get_selection");
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Ошибка: ${errorMessage}` }],
        isError: true,
      };
    }
  },
);

// Запуск моста с плагином Pixso
const wss = startBridge();

const app = express();

// ВАЖНО: МЫ НЕ ИСПОЛЬЗУЕМ app.use(express.json()) ГЛОБАЛЬНО,
// так как это "съедает" поток данных (body) и ломает SSEServerTransport.

/** @type {Map<string, SSEServerTransport>} */
const transports = new Map();

/**
 * Эндпоинт для установления SSE-соединения (GET).
 */
app.get("/mcp", async (req, res) => {
  console.error(`\n[${new Date().toISOString()}] GET /mcp (SSE Connection attempt)`);
  
  // Создаем транспорт. Клиент будет слать сообщения на /mcp/messages
  const transport = new SSEServerTransport("/mcp/messages", res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);
  
  console.error(`[${new Date().toISOString()}] SSE Session created: ${sessionId}`);

  transport.onclose = () => {
    console.error(`[${new Date().toISOString()}] SSE Session closed: ${sessionId}`);
    transports.delete(sessionId);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    console.error("❌ Ошибка при подключении сервера к транспорту:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
});

/**
 * Эндпоинт для приема сообщений (POST).
 * Вызывается клиентом после того, как он получил sessionId из GET /mcp.
 */
app.post("/mcp/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  
  if (!sessionId) {
    console.error("❌ Ошибка: Отсутствует sessionId в запросе к /mcp/messages");
    return res.status(400).send("Session ID required");
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    console.error(`❌ Ошибка: Сессия ${sessionId} не найдена в активных транспортах`);
    return res.status(404).send("Session not found");
  }

  try {
    // SDK прочитает req как поток, так как мы не использовали express.json()
    await transport.handlePostMessage(req, res);
    console.error(`[${new Date().toISOString()}] POST /mcp/messages - OK (session: ${sessionId})`);
  } catch (error) {
    console.error("❌ Ошибка при обработке сообщения в SSEServerTransport:", error);
    if (!res.headersSent) {
      res.status(500).send(`Internal Error: ${error.message}`);
    }
  }
});

/**
 * Заглушка для POST /mcp. 
 * Cursor часто сначала пытается сделать POST на основной URL (проверяя "Streamable HTTP").
 * Если мы вернем 404 с HTML-страницей, Cursor выдаст ошибку.
 * Мы возвращаем JSON, чтобы Cursor понял, что Streamable HTTP нет и перешел на SSE.
 */
app.post("/mcp", (req, res) => {
  console.error(`\n[${new Date().toISOString()}] POST /mcp (Streamable HTTP check) -> Sending 405`);
  res.status(405).json({ 
    error: "Not a Streamable HTTP server. Please use GET /mcp for SSE connection.",
    jsonrpc: "2.0" 
  });
});

const PORT = 3668;
const httpServer = app.listen(PORT, () => {
  console.error(`\n🚀 Pixso MCP Server запущен!`);
  console.error(`Эндпоинт для Cursor/Claude: http://localhost:${PORT}/mcp`);
});

/**
 * Грейсфул-шатдаун (Graceful Shutdown).
 * Закрываем все серверы при завершении процесса.
 */
function shutdown() {
  console.error("\nОстановка серверов...");
  
  // Закрываем WebSocket мост
  wss.close(() => {
    console.error("WebSocket мост остановлен");
  });

  // Закрываем HTTP сервер
  httpServer.close(() => {
    console.error("HTTP сервер остановлен");
    process.exit(0);
  });

  // Если серверы не закрылись за 5 секунд, выходим принудительно
  setTimeout(() => {
    console.error("Принудительное завершение работы...");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
