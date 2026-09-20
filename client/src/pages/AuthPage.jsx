import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, ArrowRight, Lock, Mail, User, AlertCircle } from 'lucide-react';

export const AuthPage = ({ mode: initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-card-wrapper">
        {/* Brand header */}
        <div className="auth-brand-head">
          <Link to="/" className="auth-logo" title="Syncpad Home">
            <div className="auth-logo-icon">
              <Code2 size={18} strokeWidth={1.75} />
            </div>
            <span className="auth-brand-name">syncpad</span>
          </Link>
          <h1 className="auth-title">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="auth-tagline">
            {isLogin
              ? 'Enter your credentials to access your workspaces'
              : 'Start collaborating in real-time with your engineering team'}
          </p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Mode Switch Tabs */}
          <div className="auth-tab-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth-mode-tab ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`auth-mode-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="auth-error-alert animate-fade-in" role="alert">
              <AlertCircle size={14} strokeWidth={1.75} className="auth-error-icon" />
              <span className="auth-error-text">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="auth-field-group">
                <label className="auth-field-label">Username</label>
                <div className="auth-input-wrap">
                  <User size={15} strokeWidth={1.5} className="auth-field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. alexdev"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div className="auth-field-group">
              <label className="auth-field-label">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={15} strokeWidth={1.5} className="auth-field-icon" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field-group">
              <div className="auth-field-header">
                <label className="auth-field-label">Password</label>
              </div>
              <div className="auth-input-wrap">
                <Lock size={15} strokeWidth={1.5} className="auth-field-icon" />
                <input
                  type="password"
                  required
                  placeholder={isLogin ? '••••••••' : 'Minimum 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to Workspace' : 'Get Started'}</span>
              {!loading && <ArrowRight size={14} strokeWidth={1.75} />}
            </button>
          </form>

          <div className="auth-card-footer">
            <span className="auth-footer-text">
              {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              className="auth-footer-toggle"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Create one now' : 'Sign in instead'}
            </button>
          </div>
        </div>

        <div className="auth-bottom-notice">
          <span>Protected with end-to-end sandbox runtime security</span>
        </div>
      </div>

      <style>{`
        /* Minimalist Auth Page System (Obsidian & Neutral Scale, Zero Glassmorphism) */
        .auth-page-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: #090a0f;
          color: #f4f4f5;
        }

        .auth-card-wrapper {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Brand Header */
        .auth-brand-head {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          margin-bottom: 18px;
          transition: opacity 0.14s ease;
        }

        .auth-logo:hover {
          opacity: 0.85;
        }

        .auth-logo-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #111318;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .auth-brand-name {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .auth-title {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .auth-tagline {
          font-size: 12.5px;
          color: #71717a;
          line-height: 1.45;
          margin: 0;
          max-width: 320px;
        }

        /* Auth Card Surface */
        .auth-card {
          padding: 24px;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45);
        }

        /* Mode Switch Segmented Tabs */
        .auth-tab-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #07080c;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          padding: 3px;
          gap: 3px;
          margin-bottom: 20px;
        }

        .auth-mode-tab {
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          color: #71717a;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.12s ease;
          text-align: center;
        }

        .auth-mode-tab:hover {
          color: #d4d4d8;
        }

        .auth-mode-tab.active {
          background: #181a22;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Subtle Error Callout */
        .auth-error-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(244, 63, 94, 0.06);
          border: 1px solid rgba(244, 63, 94, 0.18);
          color: #fca5a5;
          padding: 9px 12px;
          border-radius: 6px;
          font-size: 11.5px;
          line-height: 1.4;
          margin-bottom: 16px;
        }

        .auth-error-icon {
          color: #fb7185;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .auth-error-text {
          flex: 1;
        }

        /* Form & Inputs */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .auth-field-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .auth-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .auth-field-label {
          font-size: 11.5px;
          font-weight: 500;
          color: #a1a1aa;
          letter-spacing: 0.005em;
        }

        .auth-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-field-icon {
          position: absolute;
          left: 10px;
          color: #52525b;
          pointer-events: none;
          transition: color 0.12s ease;
        }

        .auth-input {
          width: 100%;
          padding: 8px 12px 8px 32px;
          background: #06070a;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 5px;
          color: #f4f4f5;
          font-size: 12.5px;
          outline: none;
          transition: border-color 0.14s ease, background 0.14s ease;
        }

        .auth-input::placeholder {
          color: #3f3f46;
          font-size: 12px;
        }

        .auth-input:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        .auth-input:focus {
          background: #07080d;
          border-color: rgba(255, 255, 255, 0.28);
        }

        .auth-input-wrap:focus-within .auth-field-icon {
          color: #a1a1aa;
        }

        /* Minimalist Primary Action Button */
        .auth-submit-btn {
          margin-top: 5px;
          width: 100%;
          padding: 9px 14px;
          font-size: 12.5px;
          font-weight: 500;
          border-radius: 5px;
          background: #e4e4e7;
          color: #090a0f;
          border: 1px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .auth-submit-btn:hover:not(:disabled) {
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .auth-submit-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* Card Footer Switcher */
        .auth-card-footer {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11.5px;
        }

        .auth-footer-text {
          color: #71717a;
        }

        .auth-footer-toggle {
          background: transparent;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 0;
          font-size: 11.5px;
          font-weight: 500;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity 0.12s ease;
        }

        .auth-footer-toggle:hover {
          opacity: 0.8;
        }

        /* Bottom Security Footnote */
        .auth-bottom-notice {
          text-align: center;
          font-size: 10.5px;
          color: #52525b;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
};
