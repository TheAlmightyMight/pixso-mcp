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
