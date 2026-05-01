import { Component } from 'react';

/**
 * Global error boundary — catches render errors and displays a recovery UI.
 * Prevents white-screen crashes from propagating to the entire app.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset });
      }

      return (
        <div style={{
          padding: '2rem',
          margin: '1rem',
          background: '#1a1a2e',
          border: '1px solid #e94560',
          borderRadius: '12px',
          color: '#eee',
          fontFamily: 'monospace',
        }}>
          <h2 style={{ color: '#e94560', margin: '0 0 1rem' }}>Something went wrong</h2>
          <p style={{ color: '#aaa', marginBottom: '1rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          {this.state.errorInfo?.componentStack && (
            <details style={{ marginBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: '#888' }}>Component stack</summary>
              <pre style={{ fontSize: '0.75rem', color: '#666', overflow: 'auto', maxHeight: '200px' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
