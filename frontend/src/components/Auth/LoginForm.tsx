import { useState, FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginForm.css';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      onSuccess?.();
    } catch {
      // Error is handled by context
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="login-form-container">
      <div className="login-form-header">
        <h1>Site Layouts</h1>
        <p>Sign in to your account</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        {error && (
          <div className="login-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="demo-accounts">
        <p>Demo accounts:</p>
        <div className="demo-buttons">
          <button
            type="button"
            onClick={() => handleDemoLogin('admin@example.com', 'admin123')}
            className="demo-button admin"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('manager@example.com', 'manager123')}
            className="demo-button manager"
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('analyst@example.com', 'analyst123')}
            className="demo-button analyst"
          >
            Analyst
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin('viewer@example.com', 'viewer123')}
            className="demo-button viewer"
          >
            Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
