import { callPlugin } from "./bridge.js";

/** Определения MCP-инструментов */
export const getSelectionDescription =
  "Returns the full design spec of selected elements (entire subtree). Optimized for code generation. " +
  "mainSize/crossSize: FIXED means use explicit w/h, AUTO means content-hugging (omit width/height in CSS). " +
  "constraints.h/constraints.v: MIN=pin left/top, MAX=pin right/bottom, CENTER=center, STRETCH=pin both, SCALE=scale with parent. When constraints absent, assume MIN/MIN (default top-left). " +
  "strokeAlign: INSIDE=border, OUTSIDE=outline/box-shadow, CENTER=split half inside/half outside. " +
  "fills[].handles: two [x,y] points in 0-1 space for gradient direction. " +
  "Pre-normalized values: layout=row/column, mainAlign=flex-start/flex-end/center/space-between, crossAlign=flex-start/flex-end/center, layoutAlign=stretch, textAlign=left/right/center/justify, textDecoration=underline/line-through, textCase=uppercase/lowercase/capitalize, overflow=x/y/both, padding=[top,right,bottom,left], gradient types=linear/radial/conic/diamond. " +
  "When fillStyleName, strokeStyleName, or textStyleName present, raw values (colors, fonts) omitted—infer design system token mapping by matching fillStyleName and textStyleName against @kpmi/lumen/styles.css based on similarity. " +
  "All spacing and dimension values (padding, gap, x, y, w, h, etc.) are in pixels.";

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
