import React from 'react';
import { Link } from 'react-router-dom';
import { Code2, ArrowUpRight } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="premium-footer">
      <div className="footer-inner">
        {/* Main Grid: Brand & Structured Navigation */}
        <div className="footer-layout">
          {/* Brand & Manifesto Column */}
          <div className="footer-brand-section">
            <Link to="/" className="footer-brand-mark">
              <div className="brand-symbol">
                <Code2 size={15} strokeWidth={2.2} />
              </div>
              <span className="brand-name">SyncPad</span>
            </Link>

            <p className="brand-statement">
              Low-latency collaborative environment with sandboxed execution. Built for pair programming, interviews, and distributed engineering teams.
            </p>

            <div className="brand-system-status">
              <span className="status-dot-indicator" />
              <span className="status-label font-code">System Status: Operational</span>
            </div>
          </div>

          {/* Clean Understated Nav Columns */}
          <div className="footer-links-grid">
            <div className="nav-column">
              <h4 className="nav-column-heading font-code">PRODUCT</h4>
              <ul className="nav-list">
                <li><Link to="/rooms" className="nav-link">Rooms &amp; Workspace</Link></li>
                <li><Link to="/dashboard" className="nav-link">Dashboard</Link></li>
                <li><Link to="/docs" className="nav-link">Documentation</Link></li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-link nav-external-link"
                  >
                    <span>Releases</span>
                    <ArrowUpRight size={11} className="external-glyph" />
                  </a>
                </li>
              </ul>
            </div>

            <div className="nav-column">
              <h4 className="nav-column-heading font-code">PLATFORM</h4>
              <ul className="nav-list">
                <li><span className="nav-plain-item">Sub-millisecond Sync</span></li>
                <li><span className="nav-plain-item">Isolated Runtimes</span></li>
                <li><span className="nav-plain-item">Zero Cloud Residuals</span></li>
                <li><span className="nav-plain-item">TLS 1.3 Transport</span></li>
              </ul>
            </div>

            <div className="nav-column">
              <h4 className="nav-column-heading font-code">CONNECT</h4>
              <ul className="nav-list">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-link nav-external-link"
                  >
                    <span>GitHub</span>
                    <ArrowUpRight size={11} className="external-glyph" />
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="nav-link nav-external-link"
                  >
                    <span>Discord Community</span>
                    <ArrowUpRight size={11} className="external-glyph" />
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="nav-link nav-external-link"
                  >
                    <span>X / Twitter</span>
                    <ArrowUpRight size={11} className="external-glyph" />
                  </a>
                </li>
                <li>
                  <Link to="/docs" className="nav-link">API Specification</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Minimal Baseline Footer Bar */}
        <div className="footer-baseline">
          <div className="baseline-left font-code">
            <span>&copy; {new Date().getFullYear()} SyncPad</span>
            <span className="baseline-separator">/</span>
            <span>All rights reserved.</span>
          </div>

          <div className="baseline-right">
            <span className="baseline-meta font-code">LATENCY // P99 &lt; 1ms</span>
            <span className="baseline-separator">/</span>
            <span className="baseline-meta font-code">REGION // GLOBAL EDGE</span>
          </div>
        </div>
      </div>

      <style>{`
        /* Minimalist Precision Footer */
        .premium-footer {
          position: relative;
          background-color: #0b0c11;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          color: #9ca3af;
        }

        .footer-inner {
          max-width: 1160px;
          margin: 0 auto;
          padding: 64px 24px 40px;
        }

        /* Two-Column Grid: Brand on Left, Navigation Matrix on Right */
        .footer-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 64px;
          padding-bottom: 56px;
        }

        /* Brand Column */
        .footer-brand-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .footer-brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          color: #f9fafb;
          margin-bottom: 16px;
          transition: opacity 0.15s ease;
        }

        .footer-brand-mark:hover {
          opacity: 0.85;
        }

        .brand-symbol {
          width: 26px;
          height: 26px;
          border-radius: 4px;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f9fafb;
        }

        .brand-name {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #f9fafb;
        }

        .brand-statement {
          font-size: 13.5px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0 0 24px 0;
          max-width: 300px;
        }

        .brand-system-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          background: #11131a;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 4px;
        }

        .status-dot-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
        }

        .status-label {
          font-size: 11px;
          color: #9ca3af;
          letter-spacing: 0.01em;
        }

        /* Navigation Matrix */
        .footer-links-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        .nav-column-heading {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.08em;
          margin: 0 0 16px 0;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nav-link {
          color: #9ca3af;
          text-decoration: none;
          font-size: 13.5px;
          transition: color 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .nav-link:hover {
          color: #f9fafb;
        }

        .nav-external-link {
          align-items: center;
        }

        .external-glyph {
          color: #6b7280;
          transition: transform 0.15s ease, color 0.15s ease;
        }

        .nav-link:hover .external-glyph {
          color: #f9fafb;
          transform: translate(1px, -1px);
        }

        .nav-plain-item {
          color: #6b7280;
          font-size: 13.5px;
        }

        /* Baseline Footer Strip */
        .footer-baseline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 12px;
          color: #6b7280;
          flex-wrap: wrap;
          gap: 16px;
        }

        .baseline-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .baseline-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .baseline-separator {
          color: #374151;
        }

        .baseline-meta {
          letter-spacing: 0.04em;
        }

        /* Responsive Breakpoints */
        @media (max-width: 900px) {
          .footer-layout {
            grid-template-columns: 1fr;
            gap: 44px;
          }

          .brand-statement {
            max-width: 100%;
          }
        }

        @media (max-width: 600px) {
          .footer-inner {
            padding: 48px 16px 32px;
          }

          .footer-links-grid {
            grid-template-columns: 1fr 1fr;
            gap: 28px;
          }

          .footer-baseline {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </footer>
  );
};
