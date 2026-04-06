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
