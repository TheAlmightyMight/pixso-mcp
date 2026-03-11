# Property Flags

Four possible flags:
- **A** (Always) — always include in the response
- **P** (If Present) — include only when value is present / non-default
- **C** (Conditional) — include only when a condition is met (see Condition column)
- **N** (Never) — never extract / omit entirely

## A — Always (6)

| # | Property | Category | Rationale |
|---|---|---|---|
| 1 | `name` | Base | Primary semantic signal for codegen (element choice, class naming) |
| 2 | `type` | Base | Structural info (VECTOR→SVG, TEXT vs FRAME, etc.) can't be inferred from name |
| 3 | `x` | Geometry | Spatial position needed for layout understanding |
| 4 | `y` | Geometry | Spatial position needed for layout understanding |
| 5 | `w` | Geometry | Dimensions are fundamental to layout |
| 6 | `h` | Geometry | Dimensions are fundamental to layout |

## P — If Present (43)

| # | Property | Category | Emit when |
|---|---|---|---|
| 7 | `fills[].opacity` | Fills | < 1 |
| 8 | `fills[].type` | Fills | Gradient (`GRADIENT_LINEAR` / `GRADIENT_RADIAL` / `GRADIENT_ANGULAR` / `GRADIENT_DIAMOND`) |
| 9 | `fills[].stops` | Fills | Gradient fills |
| 10 | `fills[].handles` | Fills | Gradient fills |
| 11 | `fills[].type` IMAGE | Fills | Image fill exists |
| 12 | `fills[].scaleMode` | Fills | Image fill (`FILL` / `FIT` / `CROP` / `TILE`) |
| 13 | `strokeW` | Strokes | Strokes exist |
| 14 | `strokeAlign` | Strokes | Strokes exist (`INSIDE` / `OUTSIDE` / `CENTER`) |
| 15 | `individualStrokeWeights` | Strokes | Weights differ per side |
| 16 | `text` | Text | TEXT nodes |
| 17 | `textAlignHorizontal` | Text | Not `LEFT` (`CENTER` / `RIGHT` / `JUSTIFIED`) |
| 18 | `textAlignVertical` | Text | Not `TOP` (`CENTER` / `BOTTOM`) |
| 19 | `textDecoration` | Text | Not `NONE` (`UNDERLINE` / `STRIKETHROUGH`) |
| 20 | `textCase` | Text | Not `ORIGINAL` (`UPPER` / `LOWER` / `TITLE`) |
| 21 | `textAutoResize` | Text | `TRUNCATE` only (signals text-overflow: ellipsis) |
| 22 | `effects[].type` | Effects | Effects exist (`DROP_SHADOW` / `INNER_SHADOW` / `LAYER_BLUR` / `BACKGROUND_BLUR`) |
| 23 | `effects[].x` | Effects | Shadow effects |
| 24 | `effects[].y` | Effects | Shadow effects |
| 25 | `effects[].blur` | Effects | Any effect |
| 26 | `effects[].spread` | Effects | Nonzero |
| 27 | `effects[].color` | Effects | Shadow effects |
| 28 | `effects[].opacity` | Effects | < 1 |
| 29 | `opacity` | Transform | < 1 |
| 30 | `rotation` | Transform | ≠ 0 |
| 31 | `cornerRadius` | Corner Radius | > 0, uniform |
| 32 | `topLeftRadius` | Corner Radius | > 0, per-corner fallback |
| 33 | `topRightRadius` | Corner Radius | > 0, per-corner fallback |
| 34 | `bottomLeftRadius` | Corner Radius | > 0, per-corner fallback |
| 35 | `bottomRightRadius` | Corner Radius | > 0, per-corner fallback |
| 36 | `layout` | Auto Layout | `HORIZONTAL` or `VERTICAL` (skip `NONE`) |
| 37 | `gap` | Auto Layout | > 0 (`itemSpacing`) |
| 38 | `padding` | Auto Layout | Any value > 0 (`paddingTop/Right/Bottom/Left`) |
| 39 | `mainAlign` | Auto Layout | Auto-layout enabled (`MIN` / `MAX` / `CENTER` / `SPACE_BETWEEN`) |
| 40 | `crossAlign` | Auto Layout | Auto-layout enabled (`MIN` / `MAX` / `CENTER`) |
| 41 | `mainSize` | Auto Layout | Auto-layout enabled (`FIXED` / `AUTO`) |
| 42 | `crossSize` | Auto Layout | Auto-layout enabled (`FIXED` / `AUTO`) |
| 43 | `layoutAlign` | Layout | `STRETCH` (child property; `STRETCH` / `INHERIT`) |
| 44 | `layoutGrow` | Layout | 1 (child flex-grow) |
| 45 | `layoutWrap` | Layout | `WRAP` (`WRAP` / `NO_WRAP`) |
| 46 | `counterAxisSpacing` | Auto Layout | > 0, only when `layoutWrap: "WRAP"` (row gap) |
| 47 | `overflowDirection` | Layout | Not `NONE` (`HORIZONTAL` / `VERTICAL` / `BOTH`) |
| 48 | `clipsContent` | Layout | true |
| 49 | `constraints.horizontal` | Layout | Present (`MIN` / `CENTER` / `MAX` / `STRETCH` / `SCALE`) |
| 50 | `constraints.vertical` | Layout | Present (`MIN` / `CENTER` / `MAX` / `STRETCH` / `SCALE`) |
| 51 | `fillStyleName` | Styles | Fill style applied |
| 52 | `strokeStyleName` | Styles | Stroke style applied |
| 53 | `textStyleName` | Styles | Text style applied |

## C — Conditional (7)

| # | Property | Category | Condition | Rationale |
|---|---|---|---|---|
| 54 | `fills[].color` | Fills | No `fillStyleName` | Raw color redundant when design token exists |
| 55 | `stroke` | Strokes | No `strokeStyleName` | Raw color redundant when design token exists |
| 56 | `fontSize` | Text | No `textStyleName` | Raw size redundant when text token exists |
| 57 | `fontName.family` | Text | No `textStyleName` | Font family redundant when text token exists |
| 58 | `fontName.style` | Text | No `textStyleName` | Font weight/style redundant when text token exists |
| 59 | `lineHeight` | Text | No `textStyleName` | Line height redundant when text token exists |
| 60 | `letterSpacing` | Text | No `textStyleName` | Letter spacing redundant when text token exists |

## N — Never (24)

| # | Property | Category | Rationale |
|---|---|---|---|
| 61 | `id` | Base | No tool consumes it; `name` suffices for identification |
| 62 | `visible` | Base | Hidden nodes skipped from tree entirely |
| 63 | `blendMode` | Transform | Too rare in typical UI; artistic effect |
| 64 | `paragraphSpacing` | Text | Rarely needed in codegen |
| 65 | `paragraphIndent` | Text | Rarely used |
| 66 | `hyperlink` | Text | Rarely present |
| 67 | `strokeDashPattern` | Strokes | CSS dashed can't replicate exact pattern |
| 68 | `strokeCap` | Strokes | SVG-only; irrelevant for CSS |
| 69 | `strokeJoin` | Strokes | SVG-only; irrelevant for CSS |
| 70 | `strokeMiterLimit` | Strokes | SVG-only; irrelevant for CSS |
| 71 | `preserveRatio` | Layout | Redundant when w/h provided |
| 72 | `fills[].imageTransform` | Fills | Complex matrix; not actionable for CSS |
| 73 | `fills[].visible` | Fills | Skip invisible fills during serialization instead |
| 74 | `effectStyleId` | Effects | Not using effect tokens in design system |
| 75 | `componentId` / `mainComponent` | Component | LLM can infer reuse from names |
| 76 | `variantProperties` | Component | Verbose, design-system-specific |
| 77 | `componentProperties` | Component | Instance overrides; too verbose |
| 78 | `absoluteBoundingBox` | Geometry | Page coords; no CSS mapping |
| 79 | `relativeTransform` | Geometry | Full 2D matrix; too complex |
| 80 | `isMask` | Geometry | Masking; rare in CSS codegen |
| 81 | `booleanOperation` | Geometry | Vector operations; no CSS mapping |
| 82 | `exportSettings` | Other | Export presets; design-only |
| 83 | `layoutGrids` | Other | Grid overlays; design-only |
| 84 | `guides` | Other | Ruler guides; design-only |
