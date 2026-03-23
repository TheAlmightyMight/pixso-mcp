# Спецификация: MCP-инструмент `get_design_tokens`

**Дата:** 2026-03-23
**Статус:** Утверждена

## Цель

Новый MCP-инструмент для извлечения дизайн-токенов (цвета, типографика, эффекты, переменные) из текущего открытого файла Pixso. Возвращает структурированный JSON с вложенной иерархией на основе именования стилей. Предназначен для обновления Tailwind CSS-темы и других CSS-фреймворков.

## Решения по дизайну

- **Источники данных:** автоматическое обнаружение — извлекаются как Styles, так и Variables (что доступно в файле).
- **Область:** весь документ (все страницы) — API стилей и переменных работают на уровне документа.
- **Формат вывода:** структурированный JSON с вложенностью по разделителю `/`.
- **Режимы (modes):** принимает параметр `mode` (по умолчанию `"light"`). Влияет только на Variables.
- **Иконки:** вне текущей области — будут добавлены позже.

## MCP Tool: интерфейс

### Имя: `get_design_tokens`

### Описание (для LLM-клиентов)

> Extracts design tokens (colors, typography, effects) from the currently open Pixso file. Returns structured JSON with all tokens organized into nested categories based on style/variable naming conventions. Use this to understand the design system's color palette, typographic scale, and effect library before generating or updating CSS/Tailwind theme configuration.

### Входная схема (Zod)

```javascript
{
  mode: z.string()
    .optional()
    .default("light")
    .describe("Variable mode to resolve (e.g. 'light', 'dark'). Defaults to 'light'. Only affects Variables, not Styles.")
}
```

> Примечание: `.optional().default()` — для совместимости с JSON Schema генерацией MCP-клиентов (консистентно с существующими схемами в `tools.js`).

### Команда плагина

`getDesignTokens` — вызывается через `callPlugin("getDesignTokens", { mode })` на lane `"default"` (без ограничений конкурентности, без специального таймаута — операция только для чтения).

## Логика извлечения в плагине

### Источники данных (по порядку)

1. **Paint Styles** — `pixso.getLocalPaintStyles()`:
   - `name` → путь токена (используется как есть, без `stripStylePrefix` — полная иерархия имён важна для токенов)
   - Первый видимый `SOLID` paint → hex-строка; при `opacity < 1` → `rgba()`
   - Градиенты → `{ type, stops: [{ color, position }] }` (color в формате hex при `a === 1`, `rgba()` при `a < 1`)
   - `IMAGE`-заливки пропускаются
   - Множественные видимые заливки → массив значений

2. **Text Styles** — `pixso.getLocalTextStyles()`:
   - `name` → путь токена
   - `fontSize` (число, px)
   - `fontFamily`, `fontWeight` (из `fontName`)
   - `lineHeight`: `unit === "AUTO"` → `"normal"`, `unit === "PERCENT"` → безразмерный множитель (`value / 100`, напр. `150%` → `1.5`), `unit === "PIXELS"` → число (px)
   - `letterSpacing`: `unit === "PIXELS"` → число (px), `unit === "PERCENT"` → число em (`value / 100`, напр. `2%` → `0.02`)
   - `textCase`, `textDecoration` — опускаются если `"ORIGINAL"` / `"NONE"`

3. **Effect Styles** — `pixso.getLocalEffectStyles()`:
   - `name` → путь токена
   - Каждый Effect Style → **массив эффектов** (стиль может содержать несколько теней/размытий)
   - Тени → `{ type, x, y, blur, spread, color }` (color нормализуется как для заливок)
   - Размытие → `{ type, radius }`

4. **Variables** (async, если доступно) — `pixso.variables.getLocalVariableCollectionsAsync()` + `getLocalVariablesAsync()`:
   - Путь токена: `{collectionName}/{variableName}` — имя коллекции сохраняется как префикс для всех переменных (в т.ч. COLOR), что предотвращает коллизии между коллекциями
   - `resolvedType` — `COLOR`, `FLOAT`, `STRING`, `BOOLEAN`
   - Значение для запрошенного `mode` (фолбэк на `defaultModeId`)

### Разрешение псевдонимов (Variable Aliases)

`valuesByMode[modeId]` может вернуть `VariableAlias` (`{ type: "VARIABLE_ALIAS", id: "..." }`) вместо конкретного значения — это стандартная практика для семантических токенов (напр., `semantic/primary` → `palette/blue-500`).

**Алгоритм разрешения:**
1. Получить значение через `variable.valuesByMode[modeId]`
2. Если значение — `VariableAlias`, загрузить переменную через `pixso.variables.getVariableByIdAsync(alias.id)`
3. Рекурсивно повторять до получения конкретного значения
4. **Защита от циклов:** максимум 10 итераций; при превышении — пропустить переменную, записать предупреждение в `meta.warnings`

### Логика вложенности

Вспомогательная функция преобразует плоский список `{ path, value }` во вложенный объект:

```
"primary/500" → { primary: { 500: "#3B82F6" } }
"heading/h1"  → { heading: { h1: { fontSize: 32, ... } } }
```

### Нормализация цветов

Pixso использует `{ r, g, b }` с float (0–1). Плагин конвертирует:
- `a === 1` (или отсутствует) → hex-строка (`#3B82F6`)
- `a < 1` → `rgba(r, g, b, a)` строка

Та же логика применяется к градиентным стопам и цветам эффектов.

### Разрешение режимов для Variables

Плагин получает `params.mode` (по умолчанию `"light"`). Для каждой коллекции ищет `modeId`, чей `name` совпадает (без учёта регистра). Если совпадения нет — используется `defaultModeId`. Поле `meta.mode` всегда отражает **запрошенный** режим (не разрешённый), чтобы LLM понимал, что было запрошено.

### Имя файла

`pixso.root.name` используется для поля `meta.fileName`.

## Структура выходного JSON

```javascript
{
  meta: {
    fileName: "UI Kit v2",           // pixso.root.name
    mode: "light",                    // запрошенный режим
    availableModes: ["dark", "light"], // уникальные имена режимов из всех коллекций, отсортированы
    sources: {
      paintStyles: 24,
      textStyles: 12,
      effectStyles: 5,
      variables: 48
    },
    warnings: []                      // предупреждения (напр., неразрешённые алиасы)
  },
  tokens: {
    colors: {
      // Из Paint Styles
      primary: {
        50:  "#EFF6FF",
        500: "#3B82F6",
        900: "#1E3A8A"
      },
      neutral: { /* ... */ },
      // Из COLOR-переменных (с префиксом коллекции)
      primitives: {
        blue: {
          500: "#3B82F6"
        }
      }
    },
    typography: {
      // Из Text Styles
      heading: {
        h1: { fontSize: 36, fontFamily: "Inter", fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.02 },
        h2: { fontSize: 28, fontFamily: "Inter", fontWeight: 600, lineHeight: 1.3 }
      },
      body: {
        regular: { fontSize: 16, fontFamily: "Inter", fontWeight: 400, lineHeight: 1.5, letterSpacing: 0 }
      }
    },
    effects: {
      // Из Effect Styles (каждый стиль → массив эффектов)
      shadow: {
        sm: [{ type: "DROP_SHADOW", x: 0, y: 1, blur: 2, spread: 0, color: "rgba(0,0,0,0.05)" }],
        md: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 6, spread: -1, color: "rgba(0,0,0,0.1)" }]
      },
      blur: {
        backdrop: [{ type: "BACKGROUND_BLUR", radius: 8 }]
      }
    },
    variables: {
      // Переменные FLOAT/STRING/BOOLEAN (с префиксом коллекции)
      tokens: {
        spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
        radius: { sm: 4, md: 8, lg: 12, full: 9999 }
      }
    }
  }
}
```

### Правила категоризации

| Источник | Категория |
|----------|-----------|
| Paint Styles | `tokens.colors` |
| Text Styles | `tokens.typography` |
| Effect Styles | `tokens.effects` |
| Variables `resolvedType: "COLOR"` | Мержатся в `tokens.colors` |
| Variables `resolvedType: "FLOAT"` / `"STRING"` | `tokens.variables` (путь: `{collection}/{name}`) |
| Variables `resolvedType: "BOOLEAN"` | `tokens.variables` (путь: `{collection}/{name}`) |

**Префикс коллекции:** все переменные (включая COLOR) получают имя коллекции как верхний уровень вложенности. Это предотвращает коллизии между коллекциями и сохраняет структуру, задуманную дизайнером.

**Конфликт путей:** при совпадении путей (напр., Paint Style `primary/500` и Variable `primary/500`) — **Variable имеет приоритет** (переменные — более новая и осознанная система токенов). На практике конфликт маловероятен из-за префикса коллекции у переменных.

**Дубликаты:** при совпадении имён внутри одной категории — побеждает последний встреченный (на практике Pixso не допускает дубликатов имён стилей).

## Гайд для LLM (прикрепляется к ответу)

Сервер оборачивает JSON двумя блоками content:

1. **Текстовый блок** — интерпретационный гайд:

```
## Design Tokens — Interpretation Guide

This JSON contains design tokens extracted from a Pixso design file.

### Structure
- `meta` — file info, requested mode, available modes, token source counts, and warnings.
- `tokens.colors` — color palette. Leaf values are hex strings ("#3B82F6") or rgba() for semi-transparent colors. Nesting reflects the designer's grouping (e.g., primary/500 → { primary: { 500: "#..." } }).
- `tokens.typography` — text styles. Each leaf is an object with fontSize (px), fontFamily, fontWeight (100–900), lineHeight (unitless ratio for %, "normal" for auto, or number in px), letterSpacing (em for %, px for pixel values).
- `tokens.effects` — shadow and blur definitions. Shadows have x/y/blur/spread (px) and color. Blurs have radius (px).
- `tokens.variables` — other design tokens (spacing, radii, booleans, strings) grouped by their variable collection name.

### Mapping to Tailwind CSS
- `tokens.colors` → `theme.extend.colors` — use the nested keys directly as Tailwind color names.
- `tokens.typography` → `theme.extend.fontSize`, `theme.extend.fontFamily`, `theme.extend.fontWeight`, `theme.extend.lineHeight`, `theme.extend.letterSpacing`.
- `tokens.effects` → `theme.extend.boxShadow` (for shadows), `theme.extend.blur` / `theme.extend.backdropBlur` (for blurs).
- `tokens.variables.spacing` → `theme.extend.spacing`.
- `tokens.variables.radius` → `theme.extend.borderRadius`.

### Naming Conventions
- Token paths use "/" as separator in the original design file, converted to nested JSON keys.
- Numeric keys (50, 100, 500…) typically represent shade scales.
- The requested mode is indicated in `meta.mode`. Per-collection resolution may fall back to the default mode if the requested mode is not available. To get a different mode, call the tool again with the `mode` parameter.
```

2. **Текстовый блок** — JSON с токенами (`JSON.stringify(payload, null, 2)`).

## Обработка ошибок

| Ситуация | Поведение |
|----------|-----------|
| Файл без стилей и переменных | Пустой `tokens`, `meta.sources` все нули. Не ошибка. |
| Запрошенный `mode` не найден | Фолбэк на `defaultModeId` для данной коллекции. `meta.mode` всегда отражает запрошенный режим. |
| `pixso.variables` API недоступен | try/catch, переменные пропускаются, `variables: 0` в `meta.sources`. |
| Множественные заливки в Paint Style | Одна видимая → значение токена. Несколько видимых → массив значений. |
| Градиентные цвета | Возвращаются как `{ type, stops }`, не редуцируются до hex. |
| Неразрешённые алиасы переменных | Макс. 10 итераций разрешения; при превышении — переменная пропускается, предупреждение в `meta.warnings`. |
| Таймаут | Lane `"default"`, стандартный таймаут. Без `recoverOnTimeout`. |
| Плагин не подключён | Стандартная обработка bridge — `callPlugin` выбрасывает ошибку. |

## Изменяемые файлы

| Файл | Изменение |
|------|-----------|
| `plugin/main.js` | Новая команда `getDesignTokens`: функции извлечения стилей/переменных, нормализация цветов, хелпер вложенности, разрешение режимов |
| `server/tools.js` | Zod-схема `designTokensInputSchema`, кейс в `handleToolCall` для `"get_design_tokens"`, функция `buildDesignTokensResult()` |
| `server/index.js` | Регистрация `get_design_tokens` через `server.registerTool()` |
| `CLAUDE.md` | Обновление таблицы MCP Tools |
| `AGENTS.md` | Обновление таблицы MCP Tools |

**Не изменяются:** `plugin/ui.html` (пересылка сообщений универсальная), `server/bridge.js` (`callPlugin` универсален).

## Будущие расширения (вне текущей области)

- Извлечение иконок (компонентов) как SVG
- Grid Styles → `tokens.grids`
- Экспорт в формат Design Tokens Community Group (DTCG / W3C)
