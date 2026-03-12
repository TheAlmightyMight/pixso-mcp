import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import fs from "fs";

/**
 * Подключается к запущенному Pixso MCP серверу по SSE, запрашивает выделение
 * и сообщает количество токенов. Выводит результат в папку __tests__/test_results.
 *
 * Использование: node count-tokens.js
 * (Убедитесь, что сервер index.js ЗАПУЩЕН)
 */

const SERVER_URL = "http://localhost:3668/mcp";
const testResultsDir = "__tests__/test_results";

// Создаем папку test_results, если она не существует
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

async function run() {
  console.log(`Подключение к серверу ${SERVER_URL}...`);

  const transport = new SSEClientTransport(new URL(SERVER_URL));
  const client = new Client(
    { name: "token-counter-client", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    console.log("Подключено к серверу. Запрос выделения...\n");

    const response = await client.callTool({
      name: "get_selection",
      arguments: {},
    });

    if (response.isError) {
      console.error("Ошибка от сервера:", response.content[0].text);
      process.exit(1);
    }

    const data = JSON.parse(response.content[0].text);
    const json = JSON.stringify(data);
    const jsonPretty = JSON.stringify(data, null, 2);

    // Считаем узлы
    const nodeCount = (json.match(/"id":/g) || []).length;

    // Оценка токенов: ~4 символа на токен для JSON (консервативно)
    const estimatedTokens = Math.ceil(json.length / 4);

    // Сбор отчета
    const lines = [];
    lines.push("=== Отчет по токенам ===");
    lines.push(`Узлов:            ${nodeCount}`);
    lines.push(`Символов JSON:    ${json.length.toLocaleString()}`);
    lines.push(`Оценка токенов:   ~${estimatedTokens.toLocaleString()}`);
    lines.push(
      `Символов (pretty): ${jsonPretty.length.toLocaleString()} (с отступами)`,
    );
    lines.push(
      `Токенов (pretty):  ~${Math.ceil(jsonPretty.length / 4).toLocaleString()} (с отступами)`,
    );

    // Вывод в консоль
    lines.forEach((line) => console.log(line));

    // Сохранение JSON в файл
    const now = new Date();
    const date = now.toLocaleDateString("ru-RU").replace(/\./g, "-");
    const time = now.toLocaleTimeString("ru-RU").replace(/:/g, "-");
    const timestamp = `${date}_${time}`;
    const jsonFilename = `selection-${timestamp}.json`;
    const jsonFilepath = `${testResultsDir}/${jsonFilename}`;
    fs.writeFileSync(jsonFilepath, jsonPretty);
    console.log(`\nРезультат сохранен в ${jsonFilepath}`);

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("Ошибка при работе с сервером:", error.message);
    process.exit(1);
  }
}

run();
