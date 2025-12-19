import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: 'var(--space-xl)', 
          textAlign: 'center', 
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: 'var(--space-md)' }}>🛡️</div>
          <h1 style={{ fontSize: '24px', marginBottom: 'var(--space-xs)' }}>System Shield Active</h1>
          <p className="text-muted" style={{ maxWidth: '450px', marginBottom: 'var(--space-lg)' }}>
            A runtime exception was intercepted. Our automated recovery protocols are stabilizing the interface.
          </p>
          <div className="card" style={{ 
            textAlign: 'left', 
            background: 'var(--color-bg)', 
            border: '1px solid var(--color-danger)',
            maxWidth: '600px',
            width: '100%',
            overflow: 'auto',
            maxHeight: '200px',
            padding: 'var(--space-md)'
          }}>
            <code style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
              {this.state.error?.toString()}
            </code>
          </div>
          <button 
            className="button" 
            style={{ marginTop: 'var(--space-xl)' }}
            onClick={() => window.location.reload()}
          >
            Force Reboot Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
