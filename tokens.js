/**
 * Статистика токенов для ответа MCP сервера (get_selection).
 * Посчитано на основе последнего замера (215 узлов).
 */

export const mcpResponseTokens = {
  // Является ли ответ сжатым (минимизированный JSON без отступов)
  isCompressed: true,
  
  // Количество токенов (оценка ~4 символа на токен)
  tokens: {
    compressed: 9534,   // Минимизированный JSON (38 134 символа)
    uncompressed: 34313 // Форматированный JSON с отступами (137 251 символ)
  }
};

export default mcpResponseTokens;
