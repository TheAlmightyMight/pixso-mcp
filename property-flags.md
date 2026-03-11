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

## P — If Present (47)

| # | Property | Category | Emit when |
|---|---|---|---|
| 7 | `fills[].opacity` | Fills | < 1 |
| 8 | `fills[].type` | Fills | Gradient (LINEAR/RADIAL) |
| 9 | `fills[].stops` | Fills | Gradient fills |
| 10 | `fills[].handles` | Fills | Gradient fills |
| 11 | `strokeW` | Strokes | Strokes exist |
| 12 | `text` | Text | TEXT nodes |
| 13 | `effects[].type` | Effects | Effects exist |
| 14 | `effects[].x` | Effects | Shadow effects |
| 15 | `effects[].y` | Effects | Shadow effects |
| 16 | `effects[].blur` | Effects | Any effect |
| 17 | `effects[].spread` | Effects | Nonzero |
| 18 | `effects[].color` | Effects | Shadow effects |
| 19 | `effects[].opacity` | Effects | < 1 |
| 20 | `opacity` | Transform | < 1 |
| 21 | `rotation` | Transform | ≠ 0 |
| 22 | `cornerRadius` | Corner Radius | > 0, uniform |
| 23 | `topLeftRadius` | Corner Radius | > 0, per-corner fallback |
| 24 | `topRightRadius` | Corner Radius | > 0, per-corner fallback |
| 25 | `bottomLeftRadius` | Corner Radius | > 0, per-corner fallback |
| 26 | `bottomRightRadius` | Corner Radius | > 0, per-corner fallback |
| 27 | `layout` | Auto Layout | HORIZONTAL or VERTICAL |
| 28 | `gap` | Auto Layout | > 0 |
| 29 | `padding` | Auto Layout | Any value > 0 |
| 30 | `mainAlign` | Auto Layout | Auto-layout enabled |
| 31 | `crossAlign` | Auto Layout | Auto-layout enabled |
| 32 | `mainSize` | Auto Layout | Auto-layout enabled |
| 33 | `crossSize` | Auto Layout | Auto-layout enabled |
| 34 | `sizingH` | Constraints | In layout context |
| 35 | `sizingV` | Constraints | In layout context |
| 36 | `fillStyleName` | Styles | Fill style applied |
| 37 | `strokeStyleName` | Styles | Stroke style applied |
| 38 | `textStyleName` | Styles | Text style applied |
| 39 | `textAlignHorizontal` | Text | Not LEFT (default) |
| 40 | `textAlignVertical` | Text | Not TOP (default) |
| 41 | `textDecoration` | Text | Not NONE |
| 42 | `textCase` | Text | Not ORIGINAL |
| 43 | `textTruncation` | Text | Truncation enabled |
| 44 | `maxLines` | Text | Value set |
| 45 | `strokeAlign` | Strokes | Strokes exist |
| 46 | `individualStrokeWeights` | Strokes | Weights differ per side |
| 47 | `clipsContent` | Layout | true |
| 48 | `layoutAlign` | Layout | STRETCH |
| 49 | `layoutGrow` | Layout | 1 |
| 50 | `layoutPositioning` | Layout | ABSOLUTE |
| 51 | `minWidth` | Layout | Set |
| 52 | `maxWidth` | Layout | Set |
| 53 | `minHeight` | Layout | Set |
| 54 | `maxHeight` | Layout | Set |
| 55 | `constraints.horizontal` | Layout | Present |
| 56 | `constraints.vertical` | Layout | Present |
| 57 | `layoutWrap` | Layout | WRAP |
| 58 | `fills[].type` IMAGE | Fills | Image fill exists |
| 59 | `fills[].scaleMode` | Fills | Image fill exists |

## C — Conditional (7)

| # | Property | Category | Condition | Rationale |
|---|---|---|---|---|
| 60 | `fills[].color` | Fills | No `fillStyleName` | Raw color redundant when design token exists |
| 61 | `stroke` | Strokes | No `strokeStyleName` | Raw color redundant when design token exists |
| 62 | `fontSize` | Text | No `textStyleName` | Raw size redundant when text token exists |
| 63 | `fontName.family` | Text | No `textStyleName` | Font family redundant when text token exists |
| 64 | `fontName.style` | Text | No `textStyleName` | Font weight/style redundant when text token exists |
| 65 | `lineHeight` | Text | No `textStyleName` | Line height redundant when text token exists |
| 66 | `letterSpacing` | Text | No `textStyleName` | Letter spacing redundant when text token exists |

## N — Never (25)

| # | Property | Category | Rationale |
|---|---|---|---|
| 67 | `id` | Base | No tool consumes it; `name` suffices for identification |
| 68 | `visible` | Base | Hidden nodes skipped from tree entirely |
| 69 | `blendMode` | Transform | Too rare in typical UI; artistic effect |
| 70 | `textAutoResize` | Text | Internal resize behavior |
| 71 | `paragraphSpacing` | Text | Rarely needed in codegen |
| 72 | `paragraphIndent` | Text | Rarely used |
| 73 | `hyperlink` | Text | Rarely present |
| 74 | `strokeDashPattern` | Strokes | CSS dashed can't replicate exact pattern |
| 75 | `strokeCap` | Strokes | SVG-only; irrelevant for CSS |
| 76 | `strokeJoin` | Strokes | SVG-only; irrelevant for CSS |
| 77 | `strokeMiterLimit` | Strokes | SVG-only; irrelevant for CSS |
| 78 | `preserveRatio` | Layout | Redundant when w/h provided |
| 79 | `fills[].imageTransform` | Fills | Complex matrix; not actionable for CSS |
| 80 | `fills[].visible` | Fills | Skip invisible fills during serialization instead |
| 81 | `effectStyleId` | Effects | Not using effect tokens in design system |
| 82 | `componentId` / `mainComponent` | Component | LLM can infer reuse from names |
| 83 | `variantProperties` | Component | Verbose, design-system-specific |
| 84 | `componentProperties` | Component | Instance overrides; too verbose |
| 85 | `absoluteBoundingBox` | Geometry | Page coords; no CSS mapping |
| 86 | `relativeTransform` | Geometry | Full 2D matrix; too complex |
| 87 | `isMask` | Geometry | Masking; rare in CSS codegen |
| 88 | `booleanOperation` | Geometry | Vector operations; no CSS mapping |
| 89 | `exportSettings` | Other | Export presets; design-only |
| 90 | `layoutGrids` | Other | Grid overlays; design-only |
| 91 | `guides` | Other | Ruler guides; design-only |
