import { callPlugin } from "./bridge.js";

/** Определения MCP-инструментов */
export const toolDefinitions = [
  {
    name: "get_selection",
    description: `Returns the full design spec of selected elements (entire subtree). Optimized for code generation.

## Field Reference

### Auto Layout Sizing
- \`mainSize\` / \`crossSize\`: \`"FIXED"\` = use explicit \`w\`/\`h\`; \`"AUTO"\` = content-hugging (omit width/height in CSS).

### Constraints (absolute positioning)
- \`constraints.h\` / \`constraints.v\`: \`MIN\` = pin to left/top, \`MAX\` = pin to right/bottom, \`CENTER\` = center in parent, \`STRETCH\` = pin both edges (left+right / top+bottom), \`SCALE\` = scale proportionally with parent.
- When \`constraints\` is absent, assume \`MIN/MIN\` (default top-left pinning).

### Stroke Alignment
- \`strokeAlign\`: \`"INSIDE"\` → CSS \`border\`; \`"OUTSIDE"\` → CSS \`outline\` or \`box-shadow\`; \`"CENTER"\` → no clean CSS equivalent, split half inside / half outside.

### Gradient Handles
- \`fills[].handles\`: Two \`[x, y]\` points in 0–1 normalized space defining gradient direction/position. Compute angle as \`atan2(handles[1][1] - handles[0][1], handles[1][0] - handles[0][0])\`.

### Pre-normalized Values
These are already converted from Pixso enums to CSS equivalents:
- \`layout\`: \`"row"\` / \`"column"\` → \`flex-direction\`
- \`mainAlign\`: \`"flex-start"\` / \`"flex-end"\` / \`"center"\` / \`"space-between"\` → \`justify-content\`
- \`crossAlign\`: \`"flex-start"\` / \`"flex-end"\` / \`"center"\` → \`align-items\`
- \`layoutAlign\`: \`"stretch"\` → \`align-self\`
- \`textAlign\`: \`"left"\` / \`"right"\` / \`"center"\` / \`"justify"\` → \`text-align\`
- \`textDecoration\`: \`"underline"\` / \`"line-through"\` → \`text-decoration\`
- \`textCase\`: \`"uppercase"\` / \`"lowercase"\` / \`"capitalize"\` → \`text-transform\`
- \`overflow\`: \`"x"\` / \`"y"\` / \`"both"\` → \`overflow-x\` / \`overflow-y\` / \`overflow\`
- \`padding\`: \`[top, right, bottom, left]\` array
- Gradient types: \`"linear-gradient"\` / \`"radial-gradient"\` / \`"conic-gradient"\` / \`"diamond-gradient"\` (diamond has no CSS equivalent)

### Design Tokens
When \`fillStyleName\`, \`strokeStyleName\`, or \`textStyleName\` is present, raw values (colors, font props) are omitted — use the token name for your design system lookup.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

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
