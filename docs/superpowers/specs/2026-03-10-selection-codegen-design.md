# Enhanced get_selection for Code Generation

## Goal

Make `get_selection` the primary MCP tool, providing a complete design specification of the currently selected Pixso elements — optimized for LLM code generation (HTML/CSS, React, Flutter, etc.).

## Architecture: Composable Extractors with Profiles

Replace the monolithic `serializeNode` function with small, focused extractor functions composed via named profiles.

### Extractors

Each extractor is `(node) => object | null`. Returns `null` or `{}` when not applicable.

| Extractor | Output | Notes |
|---|---|---|
| `extractBase` | `{ id, name, type, visible }` | Always included |
| `extractGeometry` | `{ x, y, width, height, absoluteX, absoluteY }` | `absoluteX = node.absoluteTransform[0][2]`, `absoluteY = node.absoluteTransform[1][2]`. Values rounded to 1 decimal. |
| `extractParent` | `{ parentId, parentName, parentType }` | Omitted if parent is the page (`node.parent.type === "PAGE"`) |
| `extractFills` | `{ fills: [...] }` | SOLID + LINEAR_GRADIENT + RADIAL_GRADIENT. IMAGE fills skipped. See Fill Serialization section. |
| `extractStrokes` | `{ strokes: [...], strokeWeight, strokeAlign }` | Only when strokes present |
| `extractText` | `{ text, fontSize }` | Only for TEXT nodes. If `fontSize === pixso.mixed`, omit `fontSize` (keep `text` only). |
| `extractEffects` | `{ effects: [...] }` | Only when visible effects present. See Effect Serialization section. |
| `extractTransform` | `{ opacity, rotation, blendMode }` | Only non-default values. See Transform section. |
| `extractCornerRadius` | `{ cornerRadius }` or per-corner | Only when non-zero. Handle `pixso.mixed` by falling back to per-corner values. |
| `extractAutoLayout` | `{ layoutMode, itemSpacing, padding*, alignment*, sizing* }` | Only when `layoutMode !== "NONE"` |
| `extractConstraints` | `{ constraints: { horizontal, vertical }, layoutSizingHorizontal, layoutSizingVertical }` | Always in codegen profile. `constraints` from `node.constraints`. `layoutSizingHorizontal`/`layoutSizingVertical` are direct Pixso API property names on auto-layout children. |
| `extractStyles` | `{ fillStyleName, strokeStyleName, textStyleName }` | Only when style IDs are set and not `pixso.mixed`. Uses `pixso.getStyleById()` to resolve names. |

### Profiles

```js
const PROFILES = {
  summary: [extractBase, extractGeometry],
  codegen: [extractBase, extractGeometry, extractParent, extractFills,
            extractStrokes, extractText, extractEffects, extractTransform,
            extractCornerRadius, extractAutoLayout, extractConstraints, extractStyles]
};
```

### Serializer

```js
function serializeNode(node, profile = "summary") {
  const extractors = PROFILES[profile];
  return Object.assign({}, ...extractors.map(fn => fn(node) || {}));
}
```

## Recursive Serialization

`get_selection` uses a recursive wrapper that serializes each node and inlines its children:

```js
function serializeTree(node, profile) {
  const data = serializeNode(node, profile);
  if ("children" in node && node.children.length > 0) {
    data.children = node.children.map(child => serializeTree(child, profile));
  }
  return data;
}

// In getSelection handler:
function countNodes(tree) {
  let count = 1;
  if (tree.children) tree.children.forEach(c => { count += countNodes(c); });
  return count;
}

const nodes = selection.map(node => serializeTree(node, "codegen"));
const totalCount = nodes.reduce((sum, n) => sum + countNodes(n), 0);
const result = { nodes };
if (totalCount > 200) {
  result._warning = `Large selection: ${totalCount} nodes`;
}
payload = result;
```

Other tools:
- `list_layers` uses `serializeNode(node, "summary")` — no recursion
- `get_node_details` uses `serializeNode(node, "codegen")` — no recursion
- `list_design_tokens` — unchanged

## Node Count Warning

If the total serialized node count exceeds 200, a `_warning` field is added to the response. Data is never truncated. The warning informs the LLM about context size. The WebSocket timeout in `index.js` should be increased from 10s to 30s to accommodate large trees.

## Transform Extraction

```js
function extractTransform(node) {
  const result = {};
  if ("opacity" in node && node.opacity < 1) result.opacity = node.opacity;
  if ("rotation" in node && node.rotation !== 0) result.rotation = Math.round(node.rotation * 10) / 10;
  if ("blendMode" in node && node.blendMode !== "PASS_THROUGH" && node.blendMode !== "NORMAL") {
    result.blendMode = node.blendMode;
  }
  return Object.keys(result).length > 0 ? result : null;
}
```

Note: Pixso exposes `node.rotation` as a direct property (degrees). If unavailable, fall back to computing from `relativeTransform`: `Math.atan2(-relativeTransform[1][0], relativeTransform[0][0]) * (180 / Math.PI)`.

## Fill Serialization

**SOLID:**
```json
{ "type": "SOLID", "r": 255, "g": 100, "b": 50, "opacity": 1 }
```

**LINEAR_GRADIENT / RADIAL_GRADIENT:**
```json
{
  "type": "LINEAR_GRADIENT",
  "gradientHandlePositions": [
    { "x": 0, "y": 0.5 },
    { "x": 1, "y": 0.5 }
  ],
  "stops": [
    { "position": 0, "r": 255, "g": 0, "b": 0, "opacity": 1 },
    { "position": 1, "r": 0, "g": 0, "b": 255, "opacity": 1 }
  ]
}
```

Gradient handle positions are extracted from `fill.gradientTransform` matrix to provide direction/angle information. The transform is a 2x3 matrix `[[a, b, tx], [c, d, ty]]`; handle positions are derived as start `(tx, ty)` and end `(tx + a, ty + c)`.

IMAGE fills are skipped entirely.

## Effect Serialization

Only visible effects (`effect.visible !== false`) are included.

**Shadows (DROP_SHADOW, INNER_SHADOW):**
```json
{ "type": "DROP_SHADOW", "offsetX": 0, "offsetY": 4, "blur": 8, "spread": 0, "r": 0, "g": 0, "b": 0, "opacity": 0.25 }
```
Fields: `type`, `offset.x` → `offsetX`, `offset.y` → `offsetY`, `radius` → `blur`, `spread`, color as `r/g/b/opacity`.

**Blurs (LAYER_BLUR, BACKGROUND_BLUR):**
```json
{ "type": "BACKGROUND_BLUR", "blur": 10 }
```
Field: `radius` → `blur`.

## Tool Changes

| Tool | Profile | Recursion | Change |
|---|---|---|---|
| `get_selection` | codegen | Full subtree | Major enhancement |
| `list_layers` | summary | None | No change |
| `get_node_details` | codegen | None (single node) | Enhanced properties, no children |
| `list_design_tokens` | N/A | N/A | No change |

Updated `get_selection` description: "Returns complete design specification of selected elements including full subtree, styles, effects, layout, and constraints. Optimized for code generation."

Updated `get_node_details` description: "Returns detailed design specification of a single node by ID. Does not include children."

## File Changes

- **`main.js`**: Replace `serializeNode` with extractor functions, `PROFILES` object, `serializeNode` composer, `serializeTree` recursive wrapper, and `countNodes` helper. Update all command handlers to use profiles.
- **`index.js`**: Update tool description strings for `get_selection` and `get_node_details`. Increase `callPlugin` timeout from 10s to 30s.
- **`ui.html`**: No changes.
