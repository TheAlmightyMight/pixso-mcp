import { useState, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'

export default function ComponentViewer({ component }) {
  const [selectedGen, setSelectedGen] = useState(0)

  if (!component) {
    return <div className="error">Component not found</div>
  }

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
