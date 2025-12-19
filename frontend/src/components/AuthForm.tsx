
import React, { useState } from 'react';
import AccessibleButton from './AccessibleButton';

function AuthForm({ onLogin }: { onLogin: (username: string, password: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '40px auto' }}>
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
        style={{ display: 'block', marginBottom: 12, width: '100%' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ display: 'block', marginBottom: 12, width: '100%' }}
      />
      <AccessibleButton type="submit" style={{ width: '100%' }}>Login</AccessibleButton>
    </form>
  );
}

export default AuthForm;
