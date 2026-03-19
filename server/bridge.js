import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_LANE = "default";
const EXPORT_LANE = "export";
const UNBOUNDED_CONCURRENCY = Number.MAX_SAFE_INTEGER;

/** @type {import("ws").WebSocket | null} */
let pluginSocket = null;

/** @type {{ reason: string, startedAt: number } | null} */
let recoveryState = null;

/**
 * @typedef {Object} BridgeRequest
 * @property {string} id
 * @property {string} command
 * @property {Record<string, unknown>} params
 * @property {string} lane
 * @property {number} timeoutMs
 * @property {boolean} recoverOnTimeout
 * @property {number} enqueuedAt
 * @property {number | null} startedAt
 * @property {boolean} settled
 * @property {NodeJS.Timeout | null} timeoutHandle
 * @property {(payload: any) => void} resolve
 * @property {(error: Error) => void} reject
 */

/** @type {Map<string, BridgeRequest>} */
const pendingRequests = new Map();

/** @type {Map<string, { concurrency: number, active: number, queue: BridgeRequest[] }>} */
const laneStates = new Map();

function logBridge(event, details = {}) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: "pixso-bridge",
      event,
      ...details,
    }),
  );
}

function formatErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function getLaneConfig(lane) {
  if (lane === EXPORT_LANE) {
    return { concurrency: 1 };
  }

  return { concurrency: UNBOUNDED_CONCURRENCY };
}

function getLaneState(lane) {
  const laneName = lane || DEFAULT_LANE;

  if (!laneStates.has(laneName)) {
    laneStates.set(laneName, {
      concurrency: getLaneConfig(laneName).concurrency,
      active: 0,
      queue: [],
    });
  }

  return laneStates.get(laneName);
}

function getOpenSocket() {
  return pluginSocket && pluginSocket.readyState === 1 ? pluginSocket : null;
}

function normalizeLane(lane) {
  if (typeof lane === "string" && lane.trim()) {
    return lane.trim();
  }

  return DEFAULT_LANE;
}

function buildTiming(entry, now = Date.now()) {
  const queuedMs = entry.startedAt ? entry.startedAt - entry.enqueuedAt : now - entry.enqueuedAt;
  const runMs = entry.startedAt ? now - entry.startedAt : 0;

  return {
    queuedMs,
    runMs,
    totalMs: now - entry.enqueuedAt,
  };
}

function clearTimeoutHandle(entry) {
  if (entry.timeoutHandle) {
    clearTimeout(entry.timeoutHandle);
    entry.timeoutHandle = null;
  }
}

function removeFromLaneQueue(entry) {
  const laneState = getLaneState(entry.lane);
  laneState.queue = laneState.queue.filter((queuedEntry) => queuedEntry.id !== entry.id);
}

function removeActiveRequest(entry) {
  const laneState = getLaneState(entry.lane);
  laneState.active = Math.max(0, laneState.active - 1);
}

function settleRequest(entry, payloadOrError, outcome, extra = {}) {
  if (entry.settled) {
    return;
  }

  entry.settled = true;
  clearTimeoutHandle(entry);
  pendingRequests.delete(entry.id);

  if (entry.startedAt) {
    removeActiveRequest(entry);
  } else {
    removeFromLaneQueue(entry);
  }

  const timing = buildTiming(entry);
  const laneState = getLaneState(entry.lane);

  logBridge(`request_${outcome}`, {
    requestId: entry.id,
    command: entry.command,
    lane: entry.lane,
    timeoutMs: entry.timeoutMs,
    queueDepth: laneState.queue.length,
    active: laneState.active,
    ...timing,
    ...extra,
    error: outcome === "rejected" ? formatErrorMessage(payloadOrError) : undefined,
  });

  if (outcome === "resolved") {
    entry.resolve(payloadOrError);
  } else {
    entry.reject(payloadOrError);
  }
}

function rejectPendingRequests(error, extra = {}) {
  for (const entry of pendingRequests.values()) {
    settleRequest(entry, error, "rejected", extra);
  }
}

function beginRecovery(reason, extra = {}) {
  if (recoveryState) {
    return;
  }

  recoveryState = {
    reason,
    startedAt: Date.now(),
  };

  logBridge("recovery_start", {
    reason,
    pending: pendingRequests.size,
    ...extra,
  });

  rejectPendingRequests(
    new Error(`Плагин Pixso переведён в режим восстановления: ${reason}. Дождитесь переподключения.`),
    {
      recovery: true,
      recoveryReason: reason,
    },
  );

  const socket = pluginSocket;
  pluginSocket = null;

  if (socket && socket.readyState === 1) {
    try {
      socket.terminate();
    } catch (terminateError) {
      try {
        socket.close();
      } catch (closeError) {
        logBridge("socket_terminate_failed", {
          reason,
          terminateError: formatErrorMessage(terminateError),
          closeError: formatErrorMessage(closeError),
        });
      }
    }
  }
}

function handleTransportFailure(entry, error, extra = {}) {
  if (entry.settled) {
    return;
  }

  const transportError = error instanceof Error ? error : new Error(String(error));

  settleRequest(entry, transportError, "rejected", {
    transportFailure: true,
    ...extra,
  });

  beginRecovery("transport failure", {
    requestId: entry.id,
    command: entry.command,
    lane: entry.lane,
    error: formatErrorMessage(transportError),
    ...extra,
  });
}

function handleTimeout(entry) {
  if (entry.settled) {
    return;
  }

  const timing = buildTiming(entry);
  const timeoutMessage =
    `Тайм-аут ожидания ответа от плагина Pixso для ${entry.command} (request ${entry.id}) после ${timing.queuedMs} ms ожидания и ${timing.runMs} ms выполнения.`;

  const timeoutError = new Error(timeoutMessage);

  settleRequest(entry, timeoutError, "rejected", {
    timeout: true,
    timeoutPhase: "running",
  });

  if (entry.recoverOnTimeout) {
    beginRecovery("timeout", {
      requestId: entry.id,
      command: entry.command,
      lane: entry.lane,
      timeoutMs: entry.timeoutMs,
      timeoutPhase: "running",
      ...timing,
    });
  } else {
    drainLane(entry.lane);
  }
}

function drainLane(lane) {
  if (recoveryState) {
    return;
  }

  const socket = getOpenSocket();
  if (!socket) {
    return;
  }

  const laneState = getLaneState(lane);
  while (laneState.queue.length > 0 && laneState.active < laneState.concurrency) {
    const entry = laneState.queue.shift();
    if (!entry || entry.settled) {
      continue;
    }

    entry.startedAt = Date.now();
    laneState.active += 1;
    entry.timeoutHandle = setTimeout(() => {
      handleTimeout(entry);
    }, entry.timeoutMs);

    logBridge("request_started", {
      requestId: entry.id,
      command: entry.command,
      lane: entry.lane,
      timeoutMs: entry.timeoutMs,
      queueDepth: laneState.queue.length,
      active: laneState.active,
      ...buildTiming(entry),
    });

    const requestPayload = JSON.stringify({
      id: entry.id,
      type: "request",
      command: entry.command,
      params: entry.params,
    });

    try {
      socket.send(requestPayload, (error) => {
        if (error && !entry.settled) {
          handleTransportFailure(entry, error, {
            phase: "send",
          });
        }
      });
    } catch (error) {
      handleTransportFailure(entry, error, {
        phase: "send",
      });
    }
  }
}

function drainAllLanes() {
  for (const lane of laneStates.keys()) {
    drainLane(lane);
  }
}

/**
 * Запускает WebSocket-сервер для подключения плагина Pixso.
 * @param {number} port
 */
export function startBridge(port = 3667) {
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws) => {
    if (pluginSocket && pluginSocket !== ws && pluginSocket.readyState === 1) {
      try {
        pluginSocket.terminate();
      } catch (error) {
        logBridge("old_socket_terminate_failed", {
          error: formatErrorMessage(error),
        });
      }
    }

    pluginSocket = ws;

    if (recoveryState) {
      logBridge("recovery_end", {
        reason: recoveryState.reason,
        durationMs: Date.now() - recoveryState.startedAt,
      });
      recoveryState = null;
    }

    logBridge("socket_connected", {
      pending: pendingRequests.size,
    });
    drainAllLanes();

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "response" && message.id) {
          const entry = pendingRequests.get(message.id);
          if (!entry) {
            logBridge("late_response_ignored", {
              requestId: message.id,
              command: message.command,
            });
            return;
          }

          settleRequest(entry, message.payload, "resolved", {
            responseType: message.payload && message.payload.error ? "error" : "ok",
            responseError: message.payload && message.payload.error ? message.payload.error : undefined,
          });

          drainLane(entry.lane);
        }
      } catch (error) {
        logBridge("message_parse_error", {
          error: formatErrorMessage(error),
        });
      }
    });

    ws.on("error", (error) => {
      logBridge("socket_error", {
        error: formatErrorMessage(error),
      });
      beginRecovery("socket error", {
        error: formatErrorMessage(error),
      });
    });

    ws.on("close", (code, reasonBuffer) => {
      const reason = reasonBuffer ? reasonBuffer.toString() : "";

      logBridge("socket_closed", {
        code,
        reason,
        recovering: Boolean(recoveryState),
        pending: pendingRequests.size,
      });

      pluginSocket = null;

      if (!recoveryState) {
        rejectPendingRequests(
          new Error("Соединение с плагином Pixso разорвано. Дождитесь переподключения."),
          {
            socketClosed: true,
            closeCode: code,
            closeReason: reason,
          },
        );
      }
    });
  });

  return wss;
}

/**
 * Отправляет запрос в плагин и ждёт ответа.
 * @param {string} command
 * @param {Record<string, unknown>} [params]
 * @param {{ timeoutMs?: number, lane?: string, recoverOnTimeout?: boolean }} [options]
 * @returns {Promise<any>}
 */
export async function callPlugin(command, params = {}, options = {}) {
  const socket = getOpenSocket();
  if (!socket) {
    if (recoveryState) {
      throw new Error(
        `Плагин Pixso восстанавливается после ${recoveryState.reason}. Дождитесь переподключения и повторите запрос.`,
      );
    }

    throw new Error(
      "Плагин Pixso не подключен. Убедитесь, что плагин запущен в Pixso.",
    );
  }

  const id = randomUUID();
  const lane = normalizeLane(options.lane);
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : DEFAULT_TIMEOUT_MS;
  const recoverOnTimeout = options.recoverOnTimeout === true;
  const enqueuedAt = Date.now();

  return new Promise((resolve, reject) => {
    /** @type {BridgeRequest} */
    const entry = {
      id,
      command,
      params,
      lane,
      timeoutMs,
      recoverOnTimeout,
      enqueuedAt,
      startedAt: null,
      settled: false,
      timeoutHandle: null,
      resolve,
      reject,
    };

    pendingRequests.set(id, entry);

    const laneState = getLaneState(lane);
    laneState.queue.push(entry);

    logBridge("request_queued", {
      requestId: id,
      command,
      lane,
      timeoutMs,
      queueDepth: laneState.queue.length,
      active: laneState.active,
    });

    if (recoveryState || !getOpenSocket()) {
      settleRequest(
        entry,
        new Error("Соединение с плагином Pixso недоступно. Повторите запрос после переподключения."),
        "rejected",
        {
          enqueueRejected: true,
          recovery: Boolean(recoveryState),
        },
      );
      return;
    }

    drainLane(lane);
  });
}
