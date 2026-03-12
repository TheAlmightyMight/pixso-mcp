import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { startBridge } from "./bridge.js";
import { handleToolCall } from "./tools.js";

/**
 * MCP-сервер для Pixso.
 * Использует современный McpServer и StreamableHTTPServerTransport.
 * Поддерживает несколько клиентов одновременно через один эндпоинт.
 */

const server = new McpServer({
  name: "pixso-mcp-server",
  version: "1.0.0",
});

// Регистрация инструментов через высокоуровневый API
server.tool(
  "get_selection",
  "Возвращает полную спецификацию дизайна выделенных элементов, включая всё поддерево, стили, эффекты, макет и ограничения. Оптимизировано для генерации кода.",
  {}, // Схема входных параметров (пустая для этого инструмента)
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
startBridge();

const app = createMcpExpressApp();
const transport = new StreamableHTTPServerTransport();

// Привязываем сервер к транспорту один раз
server.connect(transport).catch((error) => {
  console.error("Ошибка при подключении транспорта:", error);
});

/**
 * Единый эндпоинт для MCP (Streamable HTTP).
 * Обрабатывает и GET (для SSE), и POST (для сообщений).
 */
app.all("/mcp", async (req, res) => {
  try {
    // Передаем req.body, так как express.json() уже прочитал поток данных
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
});

const PORT = 3668;
app.listen(PORT, () => {
  console.error(`\n🚀 Pixso MCP Server запущен!`);
  console.error(`Эндпоинт для Cursor/Claude: http://localhost:${PORT}/mcp`);
});
