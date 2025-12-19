import React, { useState, useEffect } from 'react';
import AuthForm from '../components/AuthForm';

function Login() {
  const [error, setError] = useState('');

  useEffect(() => {
    // Detect SSO token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const ssoError = params.get('error');

    if (token) {
      localStorage.setItem('token', token);
      window.location.href = '/dashboard';
    } else if (ssoError) {
      setError('SSO login failed. Please try again or use standard login.');
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } else {
      setError('Invalid credentials');
    }
  };

  const handleSSO = () => {
    window.location.href = '/api/auth/sso/redirect';
  };

  return (
    <div style={{ 
      padding: 'var(--space-xl) 0', 
      textAlign: 'center',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="card" style={{ 
        width: '400px', 
        maxWidth: '90%', 
        padding: 'var(--space-xl)',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--color-border)'
      }}>
        <img src="/logo.svg" alt="STRATA" style={{ height: '40px', marginBottom: 'var(--space-lg)' }} />
        
        <h2 style={{ marginBottom: 'var(--space-sm)' }}>Operational Access</h2>
        <p className="text-muted" style={{ marginBottom: 'var(--space-lg)', fontSize: '13px' }}>
          Identity verification required for terminal access
        </p>

        <AuthForm onLogin={handleLogin} />

        <div style={{ margin: 'var(--space-md) 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <hr style={{ width: '40px', opacity: 0.1 }} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>SSO ACCESS</span>
          <hr style={{ width: '40px', opacity: 0.1 }} />
        </div>

        <button 
          className="button secondary" 
          onClick={handleSSO} 
          style={{ 
            width: '100%', 
            height: '45px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.21c1.67-1.53 2.64-3.79 2.64-6.56z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.21c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.78H.92v2.34C2.42 16.05 5.51 18 9 18z"/>
            <path fill="#FBBC05" d="M3.86 10.68c-.19-.58-.3-1.19-.3-1.83s.11-1.25.3-1.83V4.68H.92C.33 5.86 0 7.2 0 8.85c0 1.65.33 2.99.92 4.17l2.94-2.34z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.51 0 2.42 1.95.92 4.68l2.94 2.34C4.59 5.19 6.61 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        {error && <p style={{ color: 'red', textAlign: 'center', marginTop: 'var(--space-md)', fontSize: '12px' }}>{error}</p>}
      </div>
    </div>
  );
}

export default Login;
