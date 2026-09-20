import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const OutputPanel = ({
  output,
  isExecuting,
  stdin,
  onStdinChange,
  onClear,
  onRun,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState('output'); // 'output' | 'stdin'
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleCopy = () => {
    const textToCopy = output?.output || output?.stdout || output?.stderr || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Detect if error is likely due to missing stdin
  const isInputMissingError =
    output?.stderr &&
    (output.stderr.includes('NoSuchElementException') ||
      output.stderr.includes('EOFError') ||
      output.stderr.includes('No line found') ||
      output.stderr.includes('bad_alloc') ||
      output.stderr.includes('std::cin'));

  const panelHeightClass = isCollapsed
    ? 'collapsed'
    : isMaximized
    ? 'maximized'
    : '';

  return (
    <div className={`output-panel-root ${panelHeightClass}`}>
      {/* Top Header / Bar */}
      <div className="output-header">
        <div className="output-tabs">
          {/* Console Output Tab */}
          <button
            className={`output-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('output');
              if (isCollapsed) onToggleCollapse();
            }}
          >
            <Terminal size={14} />
            <span>Console Output</span>
            {output && (
              <span className={`status-pill ${output.success ? 'pill-success' : 'pill-error'}`}>
                {output.success ? 'Exit 0' : `Exit ${output.exitCode || 1}`}
              </span>
            )}
          </button>

          {/* Interactive Input (stdin) Tab */}
          <button
            className={`output-tab ${activeTab === 'stdin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('stdin');
              if (isCollapsed) onToggleCollapse();
            }}
          >
            <Cpu size={14} />
            <span>Interactive Input</span>
            {stdin.trim() ? (
              <span className="tab-indicator has-input" title="Custom input active" />
            ) : null}
          </button>
        </div>

        {/* Action Controls */}
        <div className="output-controls">
          {activeTab === 'output' && output?.executionTimeMs && !isExecuting && (
            <div className="exec-meta" title="Execution Duration">
              <Clock size={13} />
              <span>{output.executionTimeMs}ms</span>
            </div>
          )}

          {activeTab === 'output' && (
            <>
              <button
                onClick={handleCopy}
                disabled={!output?.output && !output?.stdout && !output?.stderr}
                className="btn-icon-xs"
                title="Copy Output"
              >
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              </button>

              <button onClick={onClear} className="btn-icon-xs" title="Clear Terminal">
                <Trash2 size={14} />
              </button>
            </>
          )}

          {!isCollapsed && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="btn-icon-xs"
              title={isMaximized ? 'Restore Height' : 'Maximize Panel'}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="btn-icon-xs"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!isCollapsed && (
        <div className="output-body">
          {activeTab === 'output' && (
            <div className="terminal-display font-code">
              {isExecuting && !output ? (
                <div className="executing-state">
                  <div className="spinner-border animate-spin" />
                  <span>Compiling & executing in isolated container...</span>
                </div>
              ) : output ? (
                <div className={`output-content ${isExecuting ? 'is-refreshing' : ''}`}>
                  {isExecuting && (
                    <div className="executing-overlay-pill">
                      <div className="spinner-border animate-spin" style={{ width: '12px', height: '12px' }} />
                      <span>Re-compiling...</span>
                    </div>
                  )}
                  <div className="engine-meta-row">
                    {output.engine && (
                      <div className="engine-meta-tag">
                        <CheckCircle2 size={12} /> {output.engine}
                      </div>
                    )}
                    {stdin.trim() && (
                      <div
                        className="stdin-badge-indicator"
                        onClick={() => setActiveTab('stdin')}
                        title="Click to view or edit stdin"
                      >
                        <Cpu size={11} /> Stdin provided ({stdin.trim().split('\n').length} lines)
                      </div>
                    )}
                  </div>

                  {output.stdout && <pre className="stdout-text">{output.stdout}</pre>}

                  {output.stderr && (
                    <div className="stderr-box">
                      <div className="stderr-title">
                        <AlertCircle size={13} /> Runtime / Compiler Message:
                      </div>
                      <pre className="stderr-text">{output.stderr}</pre>
                    </div>
                  )}

                  {isInputMissingError && (
                    <div className="stdin-tip-banner">
                      <HelpCircle size={14} />
                      <span>
                        Your code appears to expect user input. Open the{' '}
                        <button
                          className="text-link"
                          onClick={() => setActiveTab('stdin')}
                        >
                          Interactive Input
                        </button>{' '}
                        tab to feed inputs to <code>Scanner</code>, <code>cin</code>, or <code>input()</code>.
                      </span>
                    </div>
                  )}

                  {!output.stdout && !output.stderr && (
                    <div className="no-output-text">Code executed successfully with no output to stdout.</div>
                  )}
                </div>
              ) : (
                <div className="terminal-placeholder">
                  <span>Click "Run" to compile and execute your script.</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stdin' && (
            <div className="stdin-container">
              <div className="stdin-header-row">
                <div className="stdin-info-wrap">
                  <span className="stdin-label">Standard Input Stream</span>
                  <span className="stdin-meta-count">
                    {stdin ? `${stdin.split('\n').length} line${stdin.split('\n').length === 1 ? '' : 's'} · ${new Blob([stdin]).size} bytes` : 'Empty buffer'}
                  </span>
                </div>
                <div className="stdin-quick-actions">
                  <button
                    type="button"
                    onClick={() => onStdinChange('42\nhello\n10 20 30')}
                    className="stdin-action-btn"
                    title="Insert sample input"
                  >
                    Sample Input
                  </button>
                  {stdin.trim() && (
                    <button
                      type="button"
                      onClick={() => onStdinChange('')}
                      className="stdin-action-btn stdin-action-danger"
                      title="Clear input buffer"
                    >
                      Clear
                    </button>
                  )}
                  {onRun && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('output');
                        onRun();
                      }}
                      disabled={isExecuting}
                      className="stdin-run-btn"
                      title="Run code with current input"
                    >
                      <Play size={11} />
                      <span>Run</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="stdin-editor-frame">
                <textarea
                  value={stdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                  placeholder="Enter input to pipe to stdin (e.g. scanner/cin inputs)..."
                  className="stdin-textarea font-code"
                  spellCheck={false}
                />
              </div>

              <div className="stdin-footer-note">
                <span>Piped directly to <code>stdin</code> upon execution. Shared across room collaborators in real time.</span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        /* Minimalist Output Panel (Zero Glassmorphism, Neutral Tones) */
        .output-panel-root {
          background: #090a0f;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          height: 230px;
          transition: height 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 10;
        }

        .output-panel-root.maximized {
          height: 520px;
        }

        .output-panel-root.collapsed {
          height: 38px;
        }

        /* Minimalist Header Bar */
        .output-header {
          height: 38px;
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          background: #0c0e14;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          user-select: none;
        }

        .output-tabs {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 100%;
        }

        .output-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          height: 100%;
          font-size: 11.5px;
          font-weight: 400;
          color: #71717a;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .output-tab:hover {
          color: #d4d4d8;
          background: rgba(255, 255, 255, 0.02);
        }

        .output-tab.active {
          color: #ffffff;
          font-weight: 500;
          border-bottom-color: #ffffff;
          background: #090a0f;
        }

        .tab-indicator.has-input {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        .status-pill {
          font-size: 9.5px;
          font-weight: 500;
          padding: 1px 5px;
          border-radius: 3px;
          margin-left: 4px;
          letter-spacing: 0.02em;
        }

        .pill-success {
          background: rgba(16, 185, 129, 0.06);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .pill-error {
          background: rgba(244, 63, 94, 0.06);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .output-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .exec-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #71717a;
          padding: 2px 7px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          margin-right: 4px;
        }

        .btn-icon-xs {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          color: #71717a;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .btn-icon-xs:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .btn-icon-xs:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .output-body {
          flex: 1;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          background: #090a0f;
        }

        .terminal-display {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
          font-size: 12px;
          line-height: 1.6;
          color: #e4e4e7;
          background: #090a0f;
        }

        .output-content.is-refreshing {
          opacity: 0.7;
          transition: opacity 0.15s ease;
        }

        .executing-overlay-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e4e4e7;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 10px;
        }

        .executing-state {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9ca3af;
          font-size: 12px;
          padding: 8px 0;
        }

        .spinner-border {
          width: 12px;
          height: 12px;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-top-color: #ffffff;
          border-radius: 50%;
        }

        .terminal-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #52525b;
          font-size: 12px;
          letter-spacing: -0.01em;
        }

        .engine-meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .engine-meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 1px 7px;
          border-radius: 3px;
        }

        .stdin-badge-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          color: #10b981;
          background: rgba(16, 185, 129, 0.06);
          border: 1px solid rgba(16, 185, 129, 0.18);
          padding: 1px 7px;
          border-radius: 3px;
          cursor: pointer;
        }

        .stdout-text {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: #f4f4f5;
        }

        .stderr-box {
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(244, 63, 94, 0.04);
          border: 1px solid rgba(244, 63, 94, 0.15);
          border-radius: 4px;
        }

        .stderr-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          color: #fb7185;
          margin-bottom: 4px;
        }

        .stderr-text {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: #fca5a5;
          font-size: 11.5px;
          line-height: 1.5;
        }

        .stdin-tip-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 7px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          font-size: 11.5px;
          color: #a1a1aa;
        }

        .text-link {
          background: none;
          border: none;
          color: #ffffff;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 11.5px;
        }

        .no-output-text {
          color: #52525b;
          font-style: italic;
          font-size: 11.5px;
        }

        /* Stdin Interactive Tab - Minimalist */
        .stdin-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 10px 14px 12px;
          background: #090a0f;
          gap: 8px;
          overflow: hidden;
        }

        .stdin-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
        }

        .stdin-info-wrap {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .stdin-label {
          font-size: 11px;
          font-weight: 500;
          color: #a1a1aa;
          letter-spacing: 0.01em;
        }

        .stdin-meta-count {
          font-size: 10.5px;
          color: #52525b;
          font-variant-numeric: tabular-nums;
        }

        .stdin-quick-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stdin-action-btn {
          padding: 3px 8px;
          font-size: 10.5px;
          color: #a1a1aa;
          background: #111319;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.12s ease;
          line-height: 1.3;
        }

        .stdin-action-btn:hover {
          color: #f4f4f5;
          background: #161922;
          border-color: rgba(255, 255, 255, 0.16);
        }

        .stdin-action-danger {
          color: #71717a;
        }

        .stdin-action-danger:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .stdin-run-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: 500;
          color: #090a0f;
          background: #e4e4e7;
          border: 1px solid #ffffff;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.12s ease;
          line-height: 1.3;
        }

        .stdin-run-btn:hover:not(:disabled) {
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .stdin-run-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .stdin-editor-frame {
          flex: 1;
          display: flex;
          min-height: 0;
          position: relative;
        }

        .stdin-textarea {
          flex: 1;
          width: 100%;
          background: #06070a;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 8px 10px;
          color: #f4f4f5;
          font-size: 11.5px;
          line-height: 1.55;
          resize: none;
          outline: none;
          transition: border-color 0.14s ease, background-color 0.14s ease;
        }

        .stdin-textarea:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .stdin-textarea:focus {
          border-color: rgba(255, 255, 255, 0.22);
          background: #07080d;
        }

        .stdin-textarea::placeholder {
          color: #3f3f46;
          font-family: inherit;
        }

        .stdin-footer-note {
          font-size: 10px;
          color: #52525b;
          line-height: 1.3;
          display: flex;
          align-items: center;
        }

        .stdin-footer-note code {
          background: rgba(255, 255, 255, 0.05);
          padding: 1px 4px;
          border-radius: 3px;
          color: #71717a;
          margin: 0 3px;
        }
      `}</style>
    </div>
  );
};

export default OutputPanel;
