import { WebSocketServer } from "ws";

/** @type {import("ws").WebSocket | null} */
let pluginSocket = null;

/** @type {Map<string, (payload: any) => void>} */
const pendingRequests = new Map();

/**
 * Запускает WebSocket-сервер для подключения плагина Pixso.
 * @param {number} port
 */
export function startBridge(port = 3667) {
  const wss = new WebSocketServer({ port });

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

  return wss;
}

/**
 * Отправляет запрос в плагин и ждет ответа.
 * @param {string} command
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<any>}
 */
export async function callPlugin(command, params = {}) {
  const socket = pluginSocket;
  if (!socket) {
    throw new Error(
      "Плагин Pixso не подключен. Убедитесь, что плагин запущен в Pixso.",
    );
  }

  const id = Math.random().toString(36).substring(7);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("Тайм-аут ожидания ответа от плагина Pixso"));
    }, 30000);

    pendingRequests.set(id, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });

    socket.send(JSON.stringify({ id, type: "request", command, params }));
  });
}
