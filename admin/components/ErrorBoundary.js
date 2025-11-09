'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and error tracking service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to error tracking service if available
    // In production, you might want to send to Sentry or similar
    if (process.env.NODE_ENV === 'development') {
      console.error('React Error Boundary:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="container mt-5">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card border-danger">
                <div className="card-header bg-danger text-white">
                  <h4 className="mb-0">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Something went wrong
                  </h4>
                </div>
                <div className="card-body">
                  <p className="text-muted">
                    We're sorry, but something unexpected happened. Please try refreshing the page.
                  </p>
                  
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-3">
                      <summary className="text-danger cursor-pointer">Error Details (Development Only)</summary>
                      <pre className="bg-light p-3 mt-2 rounded" style={{ fontSize: '12px', overflow: 'auto' }}>
                        <strong>Error:</strong> {this.state.error.toString()}
                        <br />
                        <strong>Stack:</strong>
                        <br />
                        {this.state.error.stack}
                        {this.state.errorInfo && (
                          <>
                            <br />
                            <strong>Component Stack:</strong>
                            <br />
                            {this.state.errorInfo.componentStack}
                          </>
                        )}
                      </pre>
                    </details>
                  )}
                  
                  <div className="mt-4">
                    <button 
                      className="btn btn-primary me-2"
                      onClick={this.handleReset}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Try Again
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => window.location.reload()}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Refresh Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

