# Pixso Node Properties → CSS Mapping

## Table 1: Currently Extracted Fields

| JSON field | Extractor | CSS property | Notes |
|---|---|---|---|
| `id` | extractBase | — | Node reference for follow-up queries |
| `name` | extractBase | — | Semantic hint (e.g. "Submit Button") |
| `type` | extractBase | — | Maps to HTML element choice |
| `visible` | extractBase | `display: none` | Only emitted when `false` |
| `x` | extractGeometry | `left` / `top` | Position relative to parent |
| `y` | extractGeometry | `top` | Position relative to parent |
| `w` | extractGeometry | `width` | Element width |
| `h` | extractGeometry | `height` | Element height |
| `fills[].color` | extractFills | `background-color` | Solid fill hex |
| `fills[].opacity` | extractFills | alpha channel | Fill-level transparency |
| `fills[].type` | extractFills | `background: linear-gradient()` / `radial-gradient()` | Gradient type |
| `fills[].stops[].pos` | extractFills | gradient color-stop position | 0–1 fraction |
| `fills[].stops[].color` | extractFills | gradient color-stop color | Hex |
| `fills[].stops[].opacity` | extractFills | gradient color-stop alpha | When < 1 |
| `fills[].handles` | extractFills | gradient angle / direction | From transform matrix |
| `stroke` | extractStrokes | `border-color` | Single or array of hex |
| `strokeW` | extractStrokes | `border-width` | Uniform weight |
| `text` | extractText | text content / `innerText` | The actual copy string |
| `fontSize` | extractText | `font-size` | Only when uniform (not mixed) |
| `effects[].type` DROP_SHADOW | extractEffects | `box-shadow` | External shadow |
| `effects[].type` INNER_SHADOW | extractEffects | `box-shadow: inset` | Inset shadow |
| `effects[].x` | extractEffects | shadow offset-x | — |
| `effects[].y` | extractEffects | shadow offset-y | — |
| `effects[].blur` | extractEffects | shadow blur-radius | — |
| `effects[].spread` | extractEffects | shadow spread-radius | Only when nonzero |
| `effects[].color` | extractEffects | shadow color | Hex |
| `effects[].opacity` | extractEffects | shadow color alpha | When < 1 |
| `effects[].type` LAYER_BLUR | extractEffects | `filter: blur()` | — |
| `effects[].type` BACKGROUND_BLUR | extractEffects | `backdrop-filter: blur()` | Glass/frosted effect |
| `opacity` | extractTransform | `opacity` | Element-level transparency |
| `rotation` | extractTransform | `transform: rotate()` | Degrees |
| `blendMode` | extractTransform | `mix-blend-mode` | Only non-NORMAL/PASS_THROUGH |
| `cornerRadius` | extractCornerRadius | `border-radius` | Uniform |
| `topLeftRadius` | extractCornerRadius | `border-top-left-radius` | Per-corner |
| `topRightRadius` | extractCornerRadius | `border-top-right-radius` | Per-corner |
| `bottomLeftRadius` | extractCornerRadius | `border-bottom-left-radius` | Per-corner |
| `bottomRightRadius` | extractCornerRadius | `border-bottom-right-radius` | Per-corner |
| `layout` | extractAutoLayout | `display: flex; flex-direction` | HORIZONTAL=row, VERTICAL=column |
| `gap` | extractAutoLayout | `gap` | Spacing between children |
| `padding` | extractAutoLayout | `padding` | [top, right, bottom, left] |
| `mainAlign` | extractAutoLayout | `justify-content` | Main axis alignment |
| `crossAlign` | extractAutoLayout | `align-items` | Cross axis alignment |
| `mainSize` | extractAutoLayout | — | FIXED or HUG main axis |
| `crossSize` | extractAutoLayout | — | FIXED or HUG cross axis |
| `sizingH` | extractConstraints | width strategy | FIXED / FILL / HUG |
| `sizingV` | extractConstraints | height strategy | FIXED / FILL / HUG |
| `fillStyleName` | extractStyles | — | Design token reference |
| `strokeStyleName` | extractStyles | — | Design token reference |
| `textStyleName` | extractStyles | — | Typography token reference |

## Table 2: Not Yet Extracted (Pixso API → CSS)

### Text Properties

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `fontName.family` | `font-family` | **High** | Critical for codegen |
| `fontName.style` | `font-weight` / `font-style` | **High** | "Bold", "Italic", "Medium", etc. |
| `lineHeight` | `line-height` | **High** | px or % or AUTO |
| `letterSpacing` | `letter-spacing` | **High** | px or % |
| `textAlignHorizontal` | `text-align` | **High** | LEFT / CENTER / RIGHT / JUSTIFIED |
| `textAlignVertical` | `vertical-align` / flexbox | Medium | TOP / CENTER / BOTTOM |
| `textDecoration` | `text-decoration` | Medium | UNDERLINE / STRIKETHROUGH / NONE |
| `textCase` | `text-transform` | Medium | UPPER / LOWER / TITLE / ORIGINAL |
| `textAutoResize` | width/height strategy | Low | How text box resizes (WIDTH_AND_HEIGHT, HEIGHT, NONE) |
| `paragraphSpacing` | `margin-bottom` on `<p>` | Low | Space between paragraphs |
| `paragraphIndent` | `text-indent` | Low | First line indent |
| `hyperlink` | `<a href>` | Low | Link target |
| `textTruncation` | `text-overflow: ellipsis` | Medium | Truncation behavior |
| `maxLines` | `-webkit-line-clamp` | Medium | Line clamping |

### Stroke / Border Properties

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `strokeAlign` | — | **High** | INSIDE / OUTSIDE / CENTER — affects visual size |
| `strokeDashPattern` | `border-style: dashed` | Medium | Array of dash/gap lengths |
| `individualStrokeWeights` | `border-top-width` etc. | **High** | Per-side border widths |
| `strokeCap` | `stroke-linecap` (SVG) | Low | Round / square / none |
| `strokeJoin` | `stroke-linejoin` (SVG) | Low | Miter / round / bevel |
| `strokeMiterLimit` | `stroke-miterlimit` (SVG) | Low | — |

### Layout / Sizing

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `clipsContent` | `overflow: hidden` | **High** | Whether content is clipped |
| `layoutAlign` | `align-self` | **High** | STRETCH / INHERIT within parent auto-layout |
| `layoutGrow` | `flex-grow` | **High** | 0 or 1 — fill remaining space |
| `layoutPositioning` | `position: absolute` | **High** | ABSOLUTE within auto-layout parent |
| `minWidth` | `min-width` | **High** | — |
| `maxWidth` | `max-width` | **High** | — |
| `minHeight` | `min-height` | **High** | — |
| `maxHeight` | `max-height` | **High** | — |
| `constraints.horizontal` | `position` / `left` / `right` | Medium | LEFT / RIGHT / CENTER / SCALE / LEFT_RIGHT |
| `constraints.vertical` | `position` / `top` / `bottom` | Medium | TOP / BOTTOM / CENTER / SCALE / TOP_BOTTOM |
| `preserveRatio` | `aspect-ratio` | Low | Lock proportions |
| `layoutWrap` | `flex-wrap` | Medium | WRAP / NO_WRAP in auto-layout |

### Fill / Image

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `fills[].type` IMAGE | `background-image: url()` | Medium | Can't extract URL, but can note it exists |
| `fills[].scaleMode` | `background-size` | Medium | FILL=cover, FIT=contain, CROP, TILE=repeat |
| `fills[].imageTransform` | `background-position` | Low | Transform matrix |
| `fills[].visible` | — | Medium | Individual fill visibility |

### Effects (extended)

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `effectStyleId` | — | Medium | Effect token reference |

### Component / Instance

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `componentId` / `mainComponent` | — | Medium | Links instance to master component |
| `variantProperties` | — | Medium | e.g. `{state: "hover", size: "large"}` |
| `componentProperties` | — | Low | Instance overrides |

### Geometry / Vectors

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `absoluteBoundingBox` | — | Low | Bounding box in page coords |
| `relativeTransform` | `transform: matrix()` | Low | Full 2D transform |
| `isMask` | `mask` / `clip-path` | Low | Node acts as mask for siblings |
| `booleanOperation` | — | Low | UNION / SUBTRACT / INTERSECT / EXCLUDE |

### Other

| API property | CSS property | Priority | Notes |
|---|---|---|---|
| `exportSettings` | — | Low | PNG/SVG/PDF export presets |
| `layoutGrids` | — | Low | Grid overlays (design-only, not CSS grid) |
| `guides` | — | Low | Ruler guides (design-only) |
