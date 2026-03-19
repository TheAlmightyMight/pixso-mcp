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

## P — If Present (48)

| # | Property | Category | Emit when |
|---|---|---|---|
| 7 | `fills[].opacity` | Fills | < 1 |
| 8 | `fills[].type` | Fills | Gradient (`GRADIENT_LINEAR` / `GRADIENT_RADIAL` / `GRADIENT_ANGULAR` / `GRADIENT_DIAMOND`) |
| 9 | `fills[].stops` | Fills | Gradient fills |
| 10 | `fills[].handles` | Fills | Gradient fills |
| 11 | `assetExport.kind` | Asset Export | Graphics-only image/vector asset detected |
| 12 | `assetExport.preferredTool` / `assetExport.availableTools` | Asset Export | Graphics-only image/vector asset detected |
| 13 | `strokeW` | Strokes | Strokes exist |
| 14 | `strokeAlign` | Strokes | Strokes exist (`INSIDE` / `OUTSIDE` / `CENTER`) |
| 15 | `strokeTopWeight` / `strokeBottomWeight` / `strokeLeftWeight` / `strokeRightWeight` | Strokes | Any value differs from `strokeWeight` |
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
| 54 | `boundVariables` | Variables | Any variable bound; resolve to `variable.name` + `codeSyntax.WEB` for CSS/Tailwind tokens |

## C — Conditional (7)

| # | Property | Category | Condition | Rationale |
|---|---|---|---|---|
| 56 | `fills[].color` | Fills | No `fillStyleName` | Raw color redundant when design token exists |
| 57 | `stroke` | Strokes | No `strokeStyleName` | Raw color redundant when design token exists |
| 58 | `fontSize` | Text | No `textStyleName` | Raw size redundant when text token exists |
| 59 | `fontName.family` | Text | No `textStyleName` | Font family redundant when text token exists |
| 60 | `fontName.style` | Text | No `textStyleName` | Font weight/style redundant when text token exists |
| 61 | `lineHeight` | Text | No `textStyleName` | Line height redundant when text token exists |
| 62 | `letterSpacing` | Text | No `textStyleName` | Letter spacing redundant when text token exists |

## N — Never (25)

| # | Property | Category | Rationale |
|---|---|---|---|
| 63 | `id` | Base | Emit only on nodes with `assetExport`, because export tools consume it |
| 64 | `visible` | Base | Hidden nodes skipped from tree entirely |
| 65 | `blendMode` | Transform | Too rare in typical UI; artistic effect |
| 66 | `paragraphSpacing` | Text | Rarely needed in codegen |
| 67 | `paragraphIndent` | Text | Rarely used |
| 68 | `hyperlink` | Text | Rarely present |
| 69 | `strokeDashPattern` | Strokes | CSS dashed can't replicate exact pattern |
| 70 | `strokeCap` | Strokes | SVG-only; irrelevant for CSS |
| 71 | `strokeJoin` | Strokes | SVG-only; irrelevant for CSS |
| 72 | `strokeMiterLimit` | Strokes | SVG-only; irrelevant for CSS |
| 73 | `preserveRatio` | Layout | Redundant when w/h provided |
| 74 | `fills[].imageTransform` | Fills | Complex matrix; not actionable for CSS |
| 75 | `fills[].visible` | Fills | Skip invisible fills during serialization instead |
| 76 | `effectStyleId` | Effects | Not using effect tokens in design system |
| 77 | `componentId` / `mainComponent` | Component | LLM can infer reuse from names |
| 78 | `variantProperties` | Component | Verbose, design-system-specific |
| 79 | `componentProperties` | Component | Instance overrides; too verbose |
| 80 | `absoluteBoundingBox` | Geometry | Page coords; no CSS mapping |
| 81 | `relativeTransform` | Geometry | Full 2D matrix; too complex |
| 82 | `isMask` | Geometry | Masking; rare in CSS codegen |
| 83 | `booleanOperation` | Geometry | Vector operations; no CSS mapping |
| 84 | `exportSettings` | Other | Export presets; design-only |
| 85 | `layoutGrids` | Other | Grid overlays; design-only |
| 86 | `guides` | Other | Ruler guides; design-only |
| 87 | `cornerSmoothing` | Corner Radius | No CSS equivalent; not actionable for codegen |

---

## Value Normalization Strategy

Some Pixso enum values don't map intuitively to CSS. Strategy: **normalize easy mappings in the plugin** (LLM never sees Pixso enums), **attach a reference** for complex ones.

### Normalize in plugin (emit CSS values directly)

| Pixso value | Emit as | CSS target |
|---|---|---|
| `mainAlign: "MIN"` | `mainAlign: "flex-start"` | `justify-content` |
| `mainAlign: "MAX"` | `mainAlign: "flex-end"` | `justify-content` |
| `mainAlign: "CENTER"` | `mainAlign: "center"` | `justify-content` |
| `mainAlign: "SPACE_BETWEEN"` | `mainAlign: "space-between"` | `justify-content` |
| `crossAlign: "MIN"` | `crossAlign: "flex-start"` | `align-items` |
| `crossAlign: "MAX"` | `crossAlign: "flex-end"` | `align-items` |
| `crossAlign: "CENTER"` | `crossAlign: "center"` | `align-items` |
| `layoutAlign: "INHERIT"` | `layoutAlign: "auto"` | `align-self` |
| `layoutAlign: "STRETCH"` | `layoutAlign: "stretch"` | `align-self` |
| `layout: "HORIZONTAL"` | `layout: "row"` | `flex-direction` |
| `layout: "VERTICAL"` | `layout: "column"` | `flex-direction` |
| `textDecoration: "STRIKETHROUGH"` | `textDecoration: "line-through"` | `text-decoration` |
| `textCase: "TITLE"` | `textCase: "capitalize"` | `text-transform` |
| `textCase: "UPPER"` | `textCase: "uppercase"` | `text-transform` |
| `textCase: "LOWER"` | `textCase: "lowercase"` | `text-transform` |
| `textAlignHorizontal: "JUSTIFIED"` | `textAlign: "justify"` | `text-align` |
| `textAlignHorizontal: "LEFT"` etc. | `textAlign: "left"` | `text-align` |
| `textAlignVertical: "TOP"` etc. | `verticalAlign: "top"` | vertical alignment |
| `overflowDirection: "HORIZONTAL"` | `overflow: "x"` | `overflow-x` |
| `overflowDirection: "VERTICAL"` | `overflow: "y"` | `overflow-y` |
| `overflowDirection: "BOTH"` | `overflow: "both"` | `overflow` |
| `GRADIENT_ANGULAR` | `"conic-gradient"` | `background` |
| `GRADIENT_DIAMOND` | `"diamond-gradient"` | No CSS equiv; note in output |
| `lineHeight: {value, unit}` | `lineHeight: "24px"` or `"150%"` or `"normal"` | `line-height` (flatten to string) |
| `letterSpacing: {value, unit}` | `letterSpacing: "0.5px"` or `"2%"` | `letter-spacing` (flatten to string) |
| `fontName.style: "Bold Italic"` | `fontWeight: 700, fontStyle: "italic"` | Split into weight + style |
| `counterAxisSpacing` | `wrapGap` | `row-gap` (rename for clarity) |
| `boundVariables` | Resolve variable ID → `variable.name` + `codeSyntax.WEB` | Emit as token name / CSS custom property directly |

### Attach as LLM reference (complex / contextual mappings)

These can't be normalized to a single CSS value — they require contextual reasoning. Include a compact mapping note in the MCP tool response.

| Property | Why it needs a reference |
|---|---|
| `mainSize` / `crossSize` | `FIXED` = use explicit `w`/`h`; `AUTO` = omit width/height (hug). Depends on context. |
| `constraints.horizontal/vertical` | `MIN`=pin-left, `MAX`=pin-right, `CENTER`=center, `STRETCH`=pin-both, `SCALE`=scale. Maps to positioning strategy, not a single CSS prop. |
| `strokeAlign` | `INSIDE`=`border`, `OUTSIDE`=`outline` or `box-shadow`, `CENTER`=no clean CSS. Requires workaround reasoning. |
| `fills[].handles` | Gradient transform coordinates → angle. Math conversion needed; consider computing the angle in the plugin instead. |
