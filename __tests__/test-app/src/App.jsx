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
