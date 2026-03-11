import { WebSocketServer } from "ws";
import fs from "fs";

/**
 * Подключается к плагину Pixso через WebSocket, запрашивает текущее выделение
 * и сообщает количество токенов. Выводит результат в папку __tests__/test_results.
 *
 * Использование: node count-tokens.js
 * (Убедитесь, что index.js НЕ запущен — этот скрипт использует тот же порт)
 */

const PORT = 3667;
const wss = new WebSocketServer({ port: PORT });
const testResultsDir = "__tests__/test_results";

// Создаем папку test_results, если она не существует
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

console.log(`Ожидание подключения плагина Pixso на ws://localhost:${PORT}...`);

wss.on("connection", (ws) => {
  console.log("Плагин подключен. Запрос выделения...\n");

  const id = "token-count-" + Date.now();

  ws.send(
    JSON.stringify({
      id,
      type: "request",
      command: "getSelection",
      params: {},
    }),
  );

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "response" && msg.id === id) {
        const json = JSON.stringify(msg.payload);
        const jsonPretty = JSON.stringify(msg.payload, null, 2);

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

        ws.close();
        wss.close();
        process.exit(0);
      }
    } catch (err) {
      console.error("Ошибка парсинга ответа:", err);
    }
  });

  ws.on("close", () => {
    console.log("Плагин отключен.");
    wss.close();
    process.exit(1);
  });
});

// Таймаут через 15с
setTimeout(() => {
  console.error("Таймаут: плагин не подключился в течение 15 секунд.");
  wss.close();
  process.exit(1);
}, 15000);
