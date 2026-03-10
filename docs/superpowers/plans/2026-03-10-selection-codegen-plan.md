# Enhanced get_selection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace monolithic `serializeNode` with composable extractor architecture and make `get_selection` return full recursive subtrees optimized for LLM code generation.

**Architecture:** Small extractor functions `(node) => object|null` composed via named profiles (`summary`, `codegen`). A `serializeTree` wrapper handles recursion for `get_selection`. Node count warning at 200+.

**Tech Stack:** Plain JavaScript (ES5, no modules — runs in Pixso plugin sandbox), Pixso Plugin API globals (`pixso`, `__html__`).

**Note on testing:** `main.js` runs inside the Pixso plugin sandbox with no access to Node.js or test frameworks. Verification is done by loading the plugin in Pixso and calling tools via the MCP client. Each task includes a lint step (`npm run lint:all`) as the available automated check.

**Important:** Tasks 1-4 insert extractor functions ABOVE the existing `serializeNode` function (which stays in place to keep the code functional). Task 5 replaces the old `serializeNode` with the new profile-based system and updates all command handlers in a single step, ensuring every commit is functional.

**Spec:** `docs/superpowers/specs/2026-03-10-selection-codegen-design.md`

---

## Chunk 1: Extractor Functions

All extractors are inserted into `main.js` between `pixso.showUI(...)` (line 6) and the existing `serializeNode` function (line 8). The old `serializeNode` stays in place during Tasks 1-4 so the plugin remains functional at every commit.

### Task 1: Write base extractors (extractBase, extractGeometry, extractParent)

**Files:**
- Modify: `main.js` (insert after line 7, before existing `serializeNode` JSDoc at line 8)

- [ ] **Step 1: Insert extractBase after pixso.showUI block**

Insert after line 7 (after the closing `});` of `pixso.showUI`), before the existing `serializeNode`:

```js
/** @param {SceneNode} node */
function extractBase(node) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };
}
```

- [ ] **Step 2: Add extractGeometry below extractBase**

```js
/** @param {SceneNode} node */
function extractGeometry(node) {
  const data = {};
  if ("x" in node) data.x = Math.round(node.x * 10) / 10;
  if ("y" in node) data.y = Math.round(node.y * 10) / 10;
  if ("width" in node) data.width = Math.round(node.width * 10) / 10;
  if ("height" in node) data.height = Math.round(node.height * 10) / 10;
  if ("absoluteTransform" in node) {
    data.absoluteX = Math.round(node.absoluteTransform[0][2] * 10) / 10;
    data.absoluteY = Math.round(node.absoluteTransform[1][2] * 10) / 10;
  }
  return data;
}
```

- [ ] **Step 3: Add extractParent below extractGeometry**

```js
/** @param {SceneNode} node */
function extractParent(node) {
  if (!node.parent || node.parent.type === "PAGE") return null;
  return {
    parentId: node.parent.id,
    parentName: node.parent.name,
    parentType: node.parent.type,
  };
}
```

- [ ] **Step 4: Run lint**

Run: `npm run lint:all`
Expected: No errors (warnings about unused functions OK — they'll be wired up in Task 5)

- [ ] **Step 5: Commit**

```bash
git add main.js
git commit -m "feat: add extractBase, extractGeometry, extractParent extractors"
```

---

### Task 2: Write visual property extractors (extractFills, extractStrokes, extractText)

**Files:**
- Modify: `main.js` (insert below extractParent, above existing `serializeNode`)

- [ ] **Step 1: Add serializeFill helper and extractFills with gradient support**

```js
function serializeFill(f) {
  if (f.type === "SOLID") {
    return {
      type: "SOLID",
      r: Math.round(f.color.r * 255),
      g: Math.round(f.color.g * 255),
      b: Math.round(f.color.b * 255),
      opacity: f.opacity,
    };
  }
  if (f.type === "LINEAR_GRADIENT" || f.type === "RADIAL_GRADIENT") {
    const result = {
      type: f.type,
      stops: f.gradientStops.map((s) => ({
        position: s.position,
        r: Math.round(s.color.r * 255),
        g: Math.round(s.color.g * 255),
        b: Math.round(s.color.b * 255),
        opacity: s.color.a,
      })),
    };
    if (f.gradientTransform) {
      const [[a, , tx], [c, , ty]] = f.gradientTransform;
      result.gradientHandlePositions = [
        { x: Math.round(tx * 1000) / 1000, y: Math.round(ty * 1000) / 1000 },
        { x: Math.round((tx + a) * 1000) / 1000, y: Math.round((ty + c) * 1000) / 1000 },
      ];
    }
    return result;
  }
  return null;
}

/** @param {SceneNode} node */
function extractFills(node) {
  if (!("fills" in node) || !Array.isArray(node.fills)) return null;
  const fills = node.fills.map(serializeFill).filter(Boolean);
  return fills.length > 0 ? { fills } : null;
}
```

- [ ] **Step 2: Add extractStrokes**

```js
/** @param {SceneNode} node */
function extractStrokes(node) {
  if (!("strokes" in node) || !Array.isArray(node.strokes) || node.strokes.length === 0) return null;
  const data = {
    strokes: node.strokes
      .filter((s) => s.type === "SOLID")
      .map((s) => ({
        type: "SOLID",
        r: Math.round(s.color.r * 255),
        g: Math.round(s.color.g * 255),
        b: Math.round(s.color.b * 255),
        opacity: s.opacity,
      })),
  };
  if ("strokeWeight" in node) data.strokeWeight = node.strokeWeight;
  if ("strokeAlign" in node) data.strokeAlign = node.strokeAlign;
  return data;
}
```

- [ ] **Step 3: Add extractText**

```js
/** @param {SceneNode} node */
function extractText(node) {
  if (node.type !== "TEXT") return null;
  const data = { text: node.characters };
  if ("fontSize" in node && node.fontSize !== pixso.mixed) {
    data.fontSize = node.fontSize;
  }
  return data;
}
```

- [ ] **Step 4: Run lint**

Run: `npm run lint:all`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add main.js
git commit -m "feat: add extractFills (with gradients), extractStrokes, extractText"
```

---

### Task 3: Write new property extractors (extractEffects, extractTransform)

**Files:**
- Modify: `main.js` (insert below extractText, above existing `serializeNode`)

- [ ] **Step 1: Add extractEffects**

```js
/** @param {SceneNode} node */
function extractEffects(node) {
  if (!("effects" in node) || !Array.isArray(node.effects)) return null;
  const effects = node.effects
    .filter((e) => e.visible !== false)
    .map((e) => {
      if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
        return {
          type: e.type,
          offsetX: e.offset.x,
          offsetY: e.offset.y,
          blur: e.radius,
          spread: e.spread || 0,
          r: Math.round(e.color.r * 255),
          g: Math.round(e.color.g * 255),
          b: Math.round(e.color.b * 255),
          opacity: e.color.a,
        };
      }
      if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
        return { type: e.type, blur: e.radius };
      }
      return null;
    })
    .filter(Boolean);
  return effects.length > 0 ? { effects } : null;
}
```

- [ ] **Step 2: Add extractTransform**

```js
/** @param {SceneNode} node */
function extractTransform(node) {
  const result = {};
  if ("opacity" in node && node.opacity < 1) result.opacity = node.opacity;
  if ("rotation" in node && node.rotation !== 0) {
    result.rotation = Math.round(node.rotation * 10) / 10;
  }
  if ("blendMode" in node && node.blendMode !== "PASS_THROUGH" && node.blendMode !== "NORMAL") {
    result.blendMode = node.blendMode;
  }
  return Object.keys(result).length > 0 ? result : null;
}
```

- [ ] **Step 3: Run lint**

Run: `npm run lint:all`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add main.js
git commit -m "feat: add extractEffects and extractTransform extractors"
```

---

### Task 4: Write layout extractors (extractCornerRadius, extractAutoLayout, extractConstraints, extractStyles)

**Files:**
- Modify: `main.js` (insert below extractTransform, above existing `serializeNode`)

- [ ] **Step 1: Add extractCornerRadius**

```js
/** @param {SceneNode} node */
function extractCornerRadius(node) {
  if ("cornerRadius" in node && node.cornerRadius !== pixso.mixed) {
    if (node.cornerRadius !== 0) return { cornerRadius: node.cornerRadius };
    return null;
  }
  const data = {};
  let hasRadius = false;
  if ("topLeftRadius" in node && node.topLeftRadius) { data.topLeftRadius = node.topLeftRadius; hasRadius = true; }
  if ("topRightRadius" in node && node.topRightRadius) { data.topRightRadius = node.topRightRadius; hasRadius = true; }
  if ("bottomLeftRadius" in node && node.bottomLeftRadius) { data.bottomLeftRadius = node.bottomLeftRadius; hasRadius = true; }
  if ("bottomRightRadius" in node && node.bottomRightRadius) { data.bottomRightRadius = node.bottomRightRadius; hasRadius = true; }
  return hasRadius ? data : null;
}
```

- [ ] **Step 2: Add extractAutoLayout**

```js
/** @param {SceneNode} node */
function extractAutoLayout(node) {
  if (!("layoutMode" in node) || node.layoutMode === "NONE") return null;
  const data = {
    layoutMode: node.layoutMode,
    itemSpacing: node.itemSpacing,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
  };
  if ("primaryAxisAlignItems" in node) data.primaryAxisAlignItems = node.primaryAxisAlignItems;
  if ("counterAxisAlignItems" in node) data.counterAxisAlignItems = node.counterAxisAlignItems;
  if ("primaryAxisSizingMode" in node) data.primaryAxisSizingMode = node.primaryAxisSizingMode;
  if ("counterAxisSizingMode" in node) data.counterAxisSizingMode = node.counterAxisSizingMode;
  return data;
}
```

- [ ] **Step 3: Add extractConstraints**

```js
/** @param {SceneNode} node */
function extractConstraints(node) {
  const data = {};
  if ("constraints" in node) {
    data.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }
  if ("layoutSizingHorizontal" in node) data.layoutSizingHorizontal = node.layoutSizingHorizontal;
  if ("layoutSizingVertical" in node) data.layoutSizingVertical = node.layoutSizingVertical;
  return Object.keys(data).length > 0 ? data : null;
}
```

- [ ] **Step 4: Add extractStyles**

```js
/** @param {SceneNode} node */
function extractStyles(node) {
  const data = {};
  if ("fillStyleId" in node && node.fillStyleId && node.fillStyleId !== pixso.mixed) {
    const style = pixso.getStyleById(node.fillStyleId);
    if (style) data.fillStyleName = style.name;
  }
  if ("strokeStyleId" in node && node.strokeStyleId && node.strokeStyleId !== pixso.mixed) {
    const style = pixso.getStyleById(node.strokeStyleId);
    if (style) data.strokeStyleName = style.name;
  }
  if (node.type === "TEXT" && "textStyleId" in node && node.textStyleId && node.textStyleId !== pixso.mixed) {
    const style = pixso.getStyleById(node.textStyleId);
    if (style) data.textStyleName = style.name;
  }
  return Object.keys(data).length > 0 ? data : null;
}
```

- [ ] **Step 5: Run lint**

Run: `npm run lint:all`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add main.js
git commit -m "feat: add extractCornerRadius, extractAutoLayout, extractConstraints, extractStyles"
```

---

## Chunk 2: Profile System, Handler Swap, and MCP Server Updates

### Task 5: Replace old serializeNode with profile system and update all command handlers

This is the swap task. In a single commit: delete the old `serializeNode` (and its JSDoc comment), add the profile system, and update all command handlers to use it. This ensures the code goes from working-old to working-new in one atomic step.

**Files:**
- Modify: `main.js` — delete old `serializeNode` (lines 8-109 at time of original file, now shifted down due to inserted extractors), add PROFILES/serializeNode/serializeTree/countNodes, update command handlers

- [ ] **Step 1: Delete old serializeNode function and its JSDoc comment**

Delete the entire old `serializeNode` function including the JSDoc comment above it (the block starting with `/**` and the `function serializeNode(node, detailed = false) {` through its closing `}`). After Tasks 1-4, this function is located below all the new extractors.

- [ ] **Step 2: Insert PROFILES, serializeNode, serializeTree, and countNodes**

Insert in the same location where old `serializeNode` was, before the `pixso.ui.onmessage` handler:

```js
const PROFILES = {
  summary: [extractBase, extractGeometry],
  codegen: [
    extractBase, extractGeometry, extractParent, extractFills,
    extractStrokes, extractText, extractEffects, extractTransform,
    extractCornerRadius, extractAutoLayout, extractConstraints, extractStyles,
  ],
};

function serializeNode(node, profile = "summary") {
  const extractors = PROFILES[profile];
  return Object.assign({}, ...extractors.map((fn) => fn(node) || {}));
}

function serializeTree(node, profile) {
  const data = serializeNode(node, profile);
  if ("children" in node && node.children.length > 0) {
    data.children = node.children.map((child) => serializeTree(child, profile));
  }
  return data;
}

function countNodes(tree) {
  let count = 1;
  if (tree.children) {
    tree.children.forEach((c) => { count += countNodes(c); });
  }
  return count;
}
```

- [ ] **Step 3: Update getSelection handler**

Replace the existing `getSelection` case body with:

```js
      case "getSelection": {
        const selection = pixso.currentPage.selection;
        const nodes = selection.map((node) => serializeTree(node, "codegen"));
        const totalCount = nodes.reduce((sum, n) => sum + countNodes(n), 0);
        payload = { nodes };
        if (totalCount > 200) {
          payload._warning = `Large selection: ${totalCount} nodes`;
        }
        break;
      }
```

- [ ] **Step 4: Update listLayers handler**

Replace the existing `listLayers` case body with:

```js
      case "listLayers": {
        payload = pixso.currentPage.children.map((node) => serializeNode(node, "summary"));
        break;
      }
```

- [ ] **Step 5: Update getNodeDetails handler**

Replace the existing `getNodeDetails` case body with:

```js
      case "getNodeDetails": {
        const node = pixso.getNodeById(params.nodeId);
        if (node) {
          payload = serializeNode(node, "codegen");
        } else {
          payload = { error: "Node not found" };
        }
        break;
      }
```

- [ ] **Step 6: Run lint**

Run: `npm run lint:all`
Expected: No errors. No unused function warnings (all extractors now referenced via PROFILES).

- [ ] **Step 7: Commit**

```bash
git add main.js
git commit -m "feat: replace serializeNode with profile-based extractor system and update handlers"
```

---

### Task 6: Update MCP server (tool descriptions and timeout)

**Files:**
- Modify: `index.js:79` (timeout value)
- Modify: `index.js:96-97` (get_selection description)
- Modify: `index.js:114-115` (get_node_details description)

- [ ] **Step 1: Increase callPlugin timeout from 10s to 30s**

In `index.js` line 79, change `10000` to `30000`:

```js
    }, 30000);
```

- [ ] **Step 2: Update get_selection tool description**

In `index.js` lines 96-97, replace the description:

```js
        description:
          "Returns complete design specification of selected elements including full subtree, styles, effects, layout, and constraints. Optimized for code generation.",
```

- [ ] **Step 3: Update get_node_details tool description**

In `index.js` lines 114-115, replace the description:

```js
        description:
          "Returns detailed design specification of a single node by ID. Does not include children.",
```

- [ ] **Step 4: Run lint**

Run: `npm run lint:all`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: update tool descriptions and increase timeout to 30s"
```

---

### Task 7: Manual verification in Pixso

- [ ] **Step 1: Start the MCP server**

Run: `node index.js`
Expected: "Pixso MCP Server запущен на stdio" on stderr, WebSocket listening on port 3667.

- [ ] **Step 2: Load the plugin in Pixso**

Open Pixso, run the plugin. Expected: UI shows "Подключено к MCP-серверу".

- [ ] **Step 3: Test get_selection with a frame containing children**

Select a frame with nested elements. Call `get_selection` via MCP client.
Verify:
- Response has `{ nodes: [...] }` structure
- Each node has `id`, `name`, `type`, `visible`, `x`, `y`, `width`, `height`, `absoluteX`, `absoluteY`
- Children are inlined recursively (not just IDs)
- Constraints are present on child nodes
- Effects/opacity/rotation only appear when non-default

- [ ] **Step 4: Test list_layers returns summary profile only**

Call `list_layers`. Verify nodes have only summary-profile fields: `id`, `name`, `type`, `visible`, `x`, `y`, `width`, `height`, `absoluteX`, `absoluteY` — no fills, effects, constraints, or children.

- [ ] **Step 5: Test get_node_details returns codegen profile without children**

Call `get_node_details` with a known node ID. Verify full codegen properties are returned but no `children` key.
