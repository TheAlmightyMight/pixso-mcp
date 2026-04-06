# Codegen React Test App Design

**Date:** 2026-03-11
**Status:** Draft
**Scope:** Create a Vite-based React app for testing and comparing LLM-generated React components from MCP server output

## Problem Statement

The Pixso MCP server generates JSON files describing design selections, which are then used by an LLM to generate React components. Currently, there's no easy way to visually inspect and compare multiple component generations to evaluate the quality of the MCP output and code generation.

## Solution Overview

A lightweight React test app (using Vite) that:
- Auto-discovers user-organized React components from a folder structure
- Displays each component with tabs to switch between generations
- Shows the source JSON file identifier for context
- Allows visual inspection and interactivity testing of generated components

## Architecture

### File Structure

```
__tests__/test-app/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── components/             # User-created component folders (LLM-generated files go here)
│   │   ├── Button/
│   │   │   ├── Generation1.jsx
│   │   │   ├── Generation2.jsx
│   │   └── Card/
│   │       └── Generation1.jsx
│   ├── utils/
│   │   └── componentDiscovery.js  # Auto-discovery logic
│   └── styles/
│       └── App.css
├── index.html
├── vite.config.js
└── package.json
```

### Data Flow

1. User creates folder in `components/` (e.g., `components/Button/`)
2. LLM generates component files: `Generation1.jsx`, `Generation2.jsx`, etc.
3. App on load:
   - Scans `components/` for subdirectories
   - Discovers all `.jsx` files in each subfolder
   - Dynamically imports components
4. User selects component from sidebar and switches between tabs

### Key Components

**App.jsx**
- Manages selected component state
- Displays sidebar with discovered components
- Renders main view with component tabs and generated component inside an error boundary
- Handles dynamic imports with React.lazy()

**componentDiscovery.js**
- Exports async function that scans the `components/` folder
- Returns array of component metadata: `[{name: "Button", generations: ["Generation1.jsx", "Generation2.jsx"]}, ...]`
- Uses Vite's `import.meta.glob()` to dynamically import all `.jsx` files

**UI Layout**
- **Sidebar (left):** Component list, click to select
- **Main area (right):**
  - Component name + generation identifier badge showing source JSON
  - Tabs for each generation (Generation1, Generation2, etc.)
  - Rendered component in an error boundary with visual bounds
  - Optional: console.log capture for debugging

## User Workflow

1. Create folder in `__tests__/test-app/src/components/` with a component name (e.g., "Button")
2. Provide folder path + JSON identifier to Claude
3. Claude generates `Generation1.jsx`, `Generation2.jsx`, etc. in that folder
4. User runs `npm run dev` in `__tests__/test-app`
5. Opens app, clicks component in sidebar, compares generations using tabs
6. Evaluates rendered output and interactivity

## Technical Decisions

**Vite over Create React App:**
- Faster build and HMR (hot module reload) for quick iteration
- Minimal boilerplate
- Better for dynamic imports

**Auto-discovery via import.meta.glob():**
- Vite-native, zero-config
- No manifest file needed
- Folder structure is self-documenting

**Dynamic imports with React.lazy():**
- Enables component discovery without hardcoding imports
- Each generation loads only when the tab is clicked
- Error boundaries catch render failures

**No backend:**
- Everything runs client-side
- Folder structure is the source of truth
- Can be easily extended with file upload later if needed

## Error Handling

- **Missing component files:** Display error message with folder path and expected filenames
- **Component render failure:** Error boundary catches and displays error with stack trace
- **Import failure:** Graceful fallback showing which generation failed to load

## Testing & Verification

- Manually test with sample generated components
- Verify tabs load correct generation
- Test error states: missing generations, malformed components
- Verify component interactivity works (click handlers, state, etc.)

## Future Enhancements (out of scope)

- Upload generated components via UI (instead of manual file creation)
- Take screenshots of each generation for comparison
- Auto-generate HTML reports
- Side-by-side generation comparison view
- Component snapshot testing

## Definition of Done

- ✓ Vite + React app scaffolded in `__tests__/test-app`
- ✓ Auto-discovery of component folders working
- ✓ Sidebar displays all discovered components
- ✓ Main view renders selected component with generation tabs
- ✓ Error boundaries handle render failures gracefully
- ✓ HMR working (edit a component, see changes instantly)
- ✓ README with instructions for users
- ✓ Manual test with sample generated component
