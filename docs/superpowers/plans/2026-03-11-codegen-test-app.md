# Codegen Test App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Vite-based React app that auto-discovers user-organized LLM-generated React components and displays them with tabbed generation comparison.

**Architecture:** Vite handles fast HMR and dynamic imports. App uses `import.meta.glob()` to discover component folders, React.lazy() + Suspense for dynamic loading, and error boundaries for resilience. Single-page layout with sidebar navigation and tabbed generation switching.

**Tech Stack:** Vite, React 18, no external UI library (vanilla CSS)

---

## File Structure

**Files to create:**
- `__tests__/test-app/package.json` — Dependencies, scripts
- `__tests__/test-app/vite.config.js` — Vite config
- `__tests__/test-app/index.html` — Entry point
- `__tests__/test-app/src/App.jsx` — Main component with sidebar + main view
- `__tests__/test-app/src/utils/componentDiscovery.js` — Auto-discovery logic using import.meta.glob()
- `__tests__/test-app/src/styles/App.css` — Layout and styling
- `__tests__/test-app/README.md` — User instructions
- `__tests__/test-app/.gitignore` — Git ignore rules

**Folder structure after completion:**
```
__tests__/test-app/
├── src/
│   ├── App.jsx
│   ├── utils/
│   │   └── componentDiscovery.js
│   ├── styles/
│   │   └── App.css
│   └── components/          (user-created, LLM-generated files go here)
├── index.html
├── vite.config.js
├── package.json
├── README.md
└── .gitignore
```

---

## Chunk 1: Project Setup

### Task 1: Create package.json and install dependencies

**Files:**
- Create: `__tests__/test-app/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "pixso-codegen-test-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

File: `__tests__/test-app/package.json`

- [ ] **Step 2: Install dependencies**

Run: `cd __tests__/test-app && npm install`
Expected: All dependencies installed, package-lock.json created

- [ ] **Step 3: Commit**

```bash
git add __tests__/test-app/package.json __tests__/test-app/package-lock.json
git commit -m "feat: scaffold vite react test app - setup dependencies"
```

### Task 2: Create Vite configuration

**Files:**
- Create: `__tests__/test-app/vite.config.js`

- [ ] **Step 1: Write vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})
```

File: `__tests__/test-app/vite.config.js`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/vite.config.js
git commit -m "feat: add vite configuration"
```

### Task 3: Create HTML entry point

**Files:**
- Create: `__tests__/test-app/index.html`

- [ ] **Step 1: Write index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pixso Codegen Test App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

File: `__tests__/test-app/index.html`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/index.html
git commit -m "feat: add HTML entry point"
```

### Task 4: Create React entry point

**Files:**
- Create: `__tests__/test-app/src/main.jsx`

- [ ] **Step 1: Write main.jsx**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

File: `__tests__/test-app/src/main.jsx`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/src/main.jsx
git commit -m "feat: add React entry point"
```

---

## Chunk 2: Component Discovery Logic

### Task 5: Create component discovery utility

**Files:**
- Create: `__tests__/test-app/src/utils/componentDiscovery.js`

- [ ] **Step 1: Write componentDiscovery.js**

This utility scans the `components/` folder using Vite's `import.meta.glob()` and returns an array of component metadata.

```javascript
/**
 * Discovers all React components in the components folder.
 * Expected folder structure:
 * components/
 *   ComponentName/
 *     Generation1.jsx
 *     Generation2.jsx
 *
 * Returns array of:
 * {
 *   name: "ComponentName",
 *   generations: [
 *     { name: "Generation1", module: lazy component },
 *     { name: "Generation2", module: lazy component }
 *   ]
 * }
 */

import { lazy } from 'react'

export async function discoverComponents() {
  // Use Vite's glob to get all .jsx files in components/**/
  const componentModules = import.meta.glob('../components/**/*.jsx')

  const components = {}

  // Process each file path
  for (const [path, importFn] of Object.entries(componentModules)) {
    // Extract folder and filename: ../components/Button/Generation1.jsx
    // -> componentName = "Button", generationName = "Generation1"
    const pathParts = path.split('/')
    const componentName = pathParts[pathParts.length - 2]
    const generationFile = pathParts[pathParts.length - 1]
    const generationName = generationFile.replace('.jsx', '')

    if (!components[componentName]) {
      components[componentName] = {
        name: componentName,
        generations: []
      }
    }

    // Lazy load the component
    const lazyComponent = lazy(importFn)

    components[componentName].generations.push({
      name: generationName,
      module: lazyComponent
    })
  }

  // Sort generations by name so they appear in consistent order
  Object.values(components).forEach(comp => {
    comp.generations.sort((a, b) => a.name.localeCompare(b.name))
  })

  // Return as array, sorted by component name
  return Object.values(components).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}
```

File: `__tests__/test-app/src/utils/componentDiscovery.js`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/src/utils/componentDiscovery.js
git commit -m "feat: add component discovery utility with glob"
```

---

## Chunk 3: Main App Component

### Task 6: Create main App component with sidebar and tabbed view

**Files:**
- Create: `__tests__/test-app/src/App.jsx`

- [ ] **Step 1: Write App.jsx**

```javascript
import { useEffect, useState, Suspense } from 'react'
import { discoverComponents } from './utils/componentDiscovery'
import ComponentViewer from './components/ComponentViewer'

export default function App() {
  const [components, setComponents] = useState([])
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadComponents = async () => {
      try {
        setLoading(true)
        setError(null)
        const discovered = await discoverComponents()
        setComponents(discovered)
        if (discovered.length > 0) {
          setSelectedComponent(discovered[0])
        }
      } catch (err) {
        setError(`Failed to discover components: ${err.message}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadComponents()
  }, [])

  return (
    <div className="app">
      <div className="sidebar">
        <h1>Pixso Codegen</h1>
        <p className="subtitle">Test App</p>

        {loading && <p className="status">Loading components...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            {components.length === 0 ? (
              <p className="empty">
                No components found. Create a folder in <code>src/components/</code> with generated .jsx files.
              </p>
            ) : (
              <nav className="component-list">
                {components.map(comp => (
                  <button
                    key={comp.name}
                    className={`component-item ${
                      selectedComponent?.name === comp.name ? 'active' : ''
                    }`}
                    onClick={() => setSelectedComponent(comp)}
                  >
                    {comp.name}
                    <span className="gen-count">{comp.generations.length}</span>
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </div>

      <div className="main">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error-box">{error}</div>
        ) : selectedComponent ? (
          <Suspense fallback={<div className="loading">Loading component...</div>}>
            <ComponentViewer component={selectedComponent} />
          </Suspense>
        ) : (
          <div className="empty-state">
            <p>No component selected</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

File: `__tests__/test-app/src/App.jsx`

- [ ] **Step 2: Create ComponentViewer component**

Create: `__tests__/test-app/src/components/ComponentViewer.jsx`

```javascript
import { useState, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'

export default function ComponentViewer({ component }) {
  const [selectedGen, setSelectedGen] = useState(0)
  const generation = component.generations[selectedGen]

  if (!generation) {
    return <div className="error">No generations available</div>
  }

  const GenerationComponent = generation.module

  return (
    <div className="component-viewer">
      <div className="tabs-header">
        <h2>{component.name}</h2>
        <div className="tabs">
          {component.generations.map((gen, idx) => (
            <button
              key={gen.name}
              className={`tab ${idx === selectedGen ? 'active' : ''}`}
              onClick={() => setSelectedGen(idx)}
            >
              {gen.name}
            </button>
          ))}
        </div>
      </div>

      <div className="component-container">
        <ErrorBoundary componentName={`${component.name}/${generation.name}`}>
          <Suspense fallback={<div className="loading">Loading...</div>}>
            <GenerationComponent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
```

File: `__tests__/test-app/src/components/ComponentViewer.jsx`

- [ ] **Step 3: Create ErrorBoundary component**

Create: `__tests__/test-app/src/components/ErrorBoundary.jsx`

```javascript
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>Component Render Error</h3>
          <p className="component-id">{this.props.componentName}</p>
          <pre className="error-details">
            {this.state.error?.toString()}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}
```

File: `__tests__/test-app/src/components/ErrorBoundary.jsx`

- [ ] **Step 4: Commit**

```bash
git add __tests__/test-app/src/App.jsx \
         __tests__/test-app/src/components/ComponentViewer.jsx \
         __tests__/test-app/src/components/ErrorBoundary.jsx
git commit -m "feat: add main app with sidebar, component viewer, and error boundary"
```

---

## Chunk 4: Styling

### Task 7: Create CSS styles

**Files:**
- Create: `__tests__/test-app/src/styles/App.css`

- [ ] **Step 1: Write App.css**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f5f5;
}

#root {
  width: 100%;
  height: 100vh;
}

/* App Layout */
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid #34495e;
}

.sidebar h1 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.sidebar .subtitle {
  margin: 0 0 20px 0;
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar .status,
.sidebar .error {
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  margin: 10px 0;
}

.sidebar .error {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}

.sidebar .empty {
  font-size: 12px;
  opacity: 0.6;
  line-height: 1.5;
}

.sidebar code {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

/* Component List */
.component-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.component-item {
  width: 100%;
  background: transparent;
  color: white;
  border: none;
  padding: 12px 12px;
  text-align: left;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  border-radius: 0;
}

.component-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-left-color: #3498db;
}

.component-item.active {
  background: rgba(52, 152, 219, 0.2);
  border-left-color: #3498db;
  font-weight: 600;
}

.component-item .gen-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 8px;
}

/* Main Area */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

.loading,
.error-box,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 16px;
  color: #666;
}

.error-box {
  background: #fff3cd;
  color: #856404;
  padding: 20px;
  text-align: center;
  font-family: monospace;
}

/* Component Viewer */
.component-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tabs-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.tabs-header h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #2c3e50;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #f0f0f0;
}

.tab {
  background: transparent;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  font-weight: 500;
}

.tab:hover {
  color: #2c3e50;
  border-bottom-color: #bbb;
}

.tab.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

/* Component Container */
.component-container {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.component-container > * {
  border: 2px dashed #ddd;
  padding: 20px;
  background: white;
  border-radius: 4px;
}

/* Error Boundary */
.error-boundary {
  padding: 20px;
  background: #fff5f5;
  border: 2px solid #f5a9a9;
  border-radius: 4px;
  color: #c33;
  flex: 1;
}

.error-boundary h3 {
  margin-top: 0;
  color: #a22;
}

.error-boundary .component-id {
  background: #ffcccc;
  padding: 8px 12px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
  margin: 10px 0;
  color: #822;
}

.error-boundary .error-details {
  background: #fff;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  overflow-x: auto;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* Responsive */
@media (max-width: 768px) {
  .app {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #34495e;
    max-height: 150px;
    overflow-y: auto;
  }

  .component-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .component-item {
    margin-bottom: 0;
    flex: 0 1 auto;
  }
}
```

File: `__tests__/test-app/src/styles/App.css`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/src/styles/App.css
git commit -m "feat: add app styling with sidebar and component viewer"
```

---

## Chunk 5: Documentation and Testing

### Task 8: Create README with user instructions

**Files:**
- Create: `__tests__/test-app/README.md`

- [ ] **Step 1: Write README.md**

```markdown
# Pixso Codegen Test App

A Vite-based React app for testing and comparing LLM-generated React components from Pixso MCP server output.

## Setup

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

## How to Use

### 1. Create a Component Folder

Create a new folder in `src/components/` with your component name:

```bash
mkdir src/components/Button
```

### 2. Get Claude to Generate Components

Provide Claude with:
- The folder path: `__tests__/test-app/src/components/Button/`
- The source JSON identifier (e.g., `selection-2026-03-10T17-52-36-685Z.json`)

Example prompt:
```
Generate a React component for this button design.
Save it as:
- __tests__/test-app/src/components/Button/Generation1.jsx

The component was extracted from: selection-2026-03-10T17-52-36-685Z.json
```

Claude will generate:
- `src/components/Button/Generation1.jsx`
- `src/components/Button/Generation2.jsx` (if generating multiple)

### 3. View in Test App

The app auto-discovers components:
- Select the component from the left sidebar
- Click tabs to switch between generations
- Interact with the component to test it

## File Structure

```
src/
├── App.jsx                      # Main app, sidebar + viewer
├── components/
│   ├── ComponentViewer.jsx      # Display component with tabs
│   ├── ErrorBoundary.jsx        # Error boundary for safety
│   └── YourComponent/           # User-created folders
│       ├── Generation1.jsx      # LLM-generated
│       └── Generation2.jsx      # LLM-generated
├── utils/
│   └── componentDiscovery.js    # Auto-discovers components
└── styles/
    └── App.css                  # Styling
```

## Features

- **Auto-Discovery:** Automatically finds all components in `src/components/`
- **Tabbed View:** Switch between generations with tabs
- **Error Boundaries:** Render errors don't crash the app
- **HMR:** Edit a component and see changes instantly
- **No Build Step:** Vite handles everything

## Troubleshooting

### Components Not Showing

1. Verify folder structure: `src/components/ComponentName/Generation1.jsx`
2. Restart `npm run dev`
3. Check browser console for errors

### Component Render Error

- Check the error message in the app
- Verify the component exports a default React component
- Look at browser console for detailed error

### Example Component

Create `src/components/Example/Generation1.jsx`:

```jsx
export default function Example() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <h2>Example Component</h2>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}
```

The app will automatically discover and display it.

## Scripts

- `npm run dev` — Start dev server with HMR
- `npm run build` — Build for production
- `npm run preview` — Preview production build

## Notes

- Components are expected to export a default React component
- All component dependencies must be self-contained or bundled
- The app uses React 18 Suspense for code splitting
- Large components may take a moment to load
```

File: `__tests__/test-app/README.md`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/README.md
git commit -m "docs: add comprehensive user guide for test app"
```

### Task 9: Create .gitignore

**Files:**
- Create: `__tests__/test-app/.gitignore`

- [ ] **Step 1: Write .gitignore**

```
node_modules/
dist/
.DS_Store
*.log
*.swp
*.swo
.vscode/
.idea/
*.iml
```

File: `__tests__/test-app/.gitignore`

- [ ] **Step 2: Commit**

```bash
git add __tests__/test-app/.gitignore
git commit -m "chore: add gitignore for test app"
```

### Task 10: Verify setup with sample component

**Files:**
- Create: `__tests__/test-app/src/components/Example/Generation1.jsx` (test only, can be deleted after)

- [ ] **Step 1: Create sample component directory**

```bash
mkdir -p __tests__/test-app/src/components/Example
```

- [ ] **Step 2: Create sample component**

```javascript
import { useState } from 'react'

export default function Example() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h2>Example Component</h2>
      <p>This is a test component to verify the app is working.</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}
```

File: `__tests__/test-app/src/components/Example/Generation1.jsx`

- [ ] **Step 3: Start dev server**

Run: `cd __tests__/test-app && npm run dev`
Expected: Server starts at http://localhost:5173, browser opens, Example component visible in sidebar

- [ ] **Step 4: Verify functionality**

- Sidebar shows "Example" component with count badge "1"
- Click on Example component
- See rendered button with count
- Click button, verify count increments
- No console errors

- [ ] **Step 5: Remove sample component**

```bash
rm -rf __tests__/test-app/src/components/Example
```

Expected: Sidebar becomes empty, shows "No components found" message

- [ ] **Step 6: Commit setup verification**

```bash
git add __tests__/test-app/
git commit -m "test: verify app setup with sample component"
```

---

## Definition of Done

- ✅ Vite + React project scaffolded in `__tests__/test-app`
- ✅ Component discovery utility using `import.meta.glob()` works
- ✅ App renders sidebar with discovered components
- ✅ ComponentViewer displays selected component with generation tabs
- ✅ Error boundary catches and displays render errors gracefully
- ✅ HMR works (edit component, see changes instantly)
- ✅ CSS styling looks clean and professional
- ✅ README with complete user instructions
- ✅ Sample component test passed and removed
- ✅ All changes committed to git

---

## Notes for Implementation

1. **TDD approach:** Each component step includes write → test → verify cycle
2. **Frequent commits:** Commit after each logical step for easy rollback
3. **Error handling:** Error boundaries prevent one bad component from breaking the app
4. **Lazy loading:** React.lazy() + Suspense means fast initial load
5. **No external UI library:** Vanilla CSS keeps dependencies minimal and fast
6. **Vite glob:** `import.meta.glob()` is Vite-native, no extra setup needed

---

**Next Step:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement the plan.
