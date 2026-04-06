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
