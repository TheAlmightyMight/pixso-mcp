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
    .default("light")
    .describe("Variable mode to resolve (e.g. 'light', 'dark'). Defaults to 'light'. Only affects Variables, not Styles.")
}
```

### Команда плагина

`getDesignTokens` — вызывается через `callPlugin("getDesignTokens", { mode })` на lane `"default"` (без ограничений конкурентности, без специального таймаута — операция только для чтения).

## Логика извлечения в плагине

### Источники данных (по порядку)

1. **Paint Styles** — `pixso.getLocalPaintStyles()`:
   - `name` → путь токена
   - Первый видимый `SOLID` paint → `{ hex, opacity }`
   - Градиенты → `{ type, stops: [{ color, position }] }`
   - `IMAGE`-заливки пропускаются

2. **Text Styles** — `pixso.getLocalTextStyles()`:
   - `name` → путь токена
   - `fontSize`, `fontFamily`, `fontWeight` (из `fontName`)
   - `lineHeight` (нормализация в px или множитель)
   - `letterSpacing` (нормализация в px или em)
   - `textCase`, `textDecoration`

3. **Effect Styles** — `pixso.getLocalEffectStyles()`:
   - `name` → путь токена
   - Тени → `{ type, x, y, blur, spread, color }`
   - Размытие → `{ type, radius }`

4. **Variables** (async, если доступно) — `pixso.variables.getLocalVariableCollectionsAsync()` + `getLocalVariablesAsync()`:
   - `name` → путь токена (уже использует `/` для групп)
   - `resolvedType` — `COLOR`, `FLOAT`, `STRING`, `BOOLEAN`
   - Значение для запрошенного `mode` (фолбэк на `defaultModeId`)
   - Имя коллекции как префикс верхнего уровня

### Логика вложенности

Вспомогательная функция преобразует плоский список `{ path, value }` во вложенный объект:

```
"primary/500" → { primary: { 500: "#3B82F6" } }
"heading/h1"  → { heading: { h1: { fontSize: 32, ... } } }
```

### Нормализация цветов

Pixso использует `{ r, g, b }` с float (0–1). Плагин конвертирует в hex (`#3B82F6`). При opacity < 1 — формат `rgba()`.

### Разрешение режимов для Variables

Плагин получает `params.mode` (по умолчанию `"light"`). Для каждой коллекции ищет `modeId`, чей `name` совпадает (без учёта регистра). Если совпадения нет — используется `defaultModeId`.

## Структура выходного JSON

```javascript
{
  meta: {
    fileName: "UI Kit v2",
    mode: "light",
    availableModes: ["light", "dark"],
    sources: {
      paintStyles: 24,
      textStyles: 12,
      effectStyles: 5,
      variables: 48
    }
  },
  tokens: {
    colors: {
      // Из Paint Styles + COLOR-переменных
      primary: {
        50:  "#EFF6FF",
        500: "#3B82F6",
        900: "#1E3A8A"
      },
      neutral: { /* ... */ }
    },
    typography: {
      // Из Text Styles
      heading: {
        h1: { fontSize: 36, fontFamily: "Inter", fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.02 },
        h2: { fontSize: 28, fontFamily: "Inter", fontWeight: 600, lineHeight: 1.3 }
      },
      body: {
        regular: { fontSize: 16, fontFamily: "Inter", fontWeight: 400, lineHeight: 1.5 }
      }
    },
    effects: {
      // Из Effect Styles
      shadow: {
        sm: [{ type: "DROP_SHADOW", x: 0, y: 1, blur: 2, spread: 0, color: "rgba(0,0,0,0.05)" }],
        md: [{ type: "DROP_SHADOW", x: 0, y: 4, blur: 6, spread: -1, color: "rgba(0,0,0,0.1)" }]
      },
      blur: {
        backdrop: { type: "BACKGROUND_BLUR", radius: 8 }
      }
    },
    variables: {
      // Переменные, не относящиеся к цветам
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
      radius: { sm: 4, md: 8, lg: 12, full: 9999 }
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
| Variables `resolvedType: "FLOAT"` / `"STRING"` | `tokens.variables` (группировка по имени коллекции) |
| Variables `resolvedType: "BOOLEAN"` | `tokens.variables` |

При конфликте путей между Paint Style и Variable — **Variable имеет приоритет** (переменные — более новая и осознанная система токенов).

## Гайд для LLM (прикрепляется к ответу)

Сервер оборачивает JSON двумя блоками content:

1. **Текстовый блок** — интерпретационный гайд:

```
## Design Tokens — Interpretation Guide

This JSON contains design tokens extracted from a Pixso design file.

### Structure
- `meta` — file info, resolved mode, available modes, and token source counts.
- `tokens.colors` — color palette. Leaf values are hex strings ("#3B82F6") or rgba() for semi-transparent colors. Nesting reflects the designer's grouping (e.g., primary/500 → { primary: { 500: "#..." } }).
- `tokens.typography` — text styles. Each leaf is an object with fontSize (px), fontFamily, fontWeight (100–900), lineHeight (unitless ratio or px), letterSpacing (em).
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
- The resolved mode is indicated in `meta.mode`. To get a different mode, call the tool again with the `mode` parameter.
```

2. **Текстовый блок** — JSON с токенами (`JSON.stringify(payload, null, 2)`).

## Обработка ошибок

| Ситуация | Поведение |
|----------|-----------|
| Файл без стилей и переменных | Пустой `tokens`, `meta.sources` все нули. Не ошибка. |
| Запрошенный `mode` не найден | Фолбэк на `defaultModeId`. `meta.mode` отражает фактический режим (например, `"light (fallback to default)"`). |
| `pixso.variables` API недоступен | try/catch, переменные пропускаются, `variables: 0` в `meta.sources`. |
| Множественные заливки в Paint Style | Одна видимая → значение токена. Несколько видимых → массив значений. |
| Градиентные цвета | Возвращаются как `{ type, stops }`, не редуцируются до hex. |
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
