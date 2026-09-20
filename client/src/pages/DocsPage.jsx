import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import {
  Compass,
  Layers,
  Cpu,
  Terminal,
  ShieldCheck,
  Command,
  ArrowUpRight,
  Check,
  Copy,
  FileCode,
  Sparkles,
} from 'lucide-react';

const DOC_SECTIONS = [
  { id: 'overview', title: 'Architecture & Overview', icon: Compass },
  { id: 'realtime-protocol', title: 'Sync Engine & CRDTs', icon: Layers },
  { id: 'sandboxed-runtimes', title: 'Execution Sandboxes', icon: Cpu },
  { id: 'stdin-streams', title: 'I/O & Stdin Streaming', icon: Terminal },
  { id: 'keybindings', title: 'Command Shortcuts', icon: Command },
  { id: 'security-model', title: 'Security & Isolation', icon: ShieldCheck },
];

export const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedSnippet, setCopiedSnippet] = useState(null);

  const copyCode = (snippet, id) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 1800);
  };

  return (
    <div className="docs-root">
      <Navbar />

      <div className="docs-container">
        {/* Left Minimalist Navigation Sidebar */}
        <aside className="docs-nav-sidebar">
          <div className="docs-nav-kicker font-code">
            <span className="kicker-dot" />
            <span>REFERENCE MANUAL</span>
          </div>

          <nav className="docs-nav-list">
            {DOC_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`docs-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={14} className="nav-item-icon" />
                  <span className="nav-item-text">{sec.title}</span>
                </button>
              );
            })}
          </nav>

          <div className="docs-nav-meta">
            <div className="meta-label font-code">SPECIFICATION</div>
            <div className="meta-val">v2.4.0-stable</div>
            <div className="meta-note">Sub-millisecond socket sync protocol</div>
          </div>
        </aside>

        {/* Main Minimalist Documentation Body */}
        <main className="docs-main-body">
          {/* 1. Architecture & Overview */}
          {activeSection === 'overview' && (
            <article className="doc-section">
              <header className="doc-section-header">
                <span className="doc-tag font-code">FOUNDATION</span>
                <h1 className="doc-headline">Architecture & Core Principles</h1>
                <p className="doc-lead">
                  SyncPad is engineered as a deterministic, distributed code collaboration platform.
                  It combines Monaco Editor primitives with low-overhead operational synchronization
                  and ephemeral sandboxed compilation engines.
                </p>
              </header>

              <div className="doc-card-grid">
                <div className="doc-feature-panel">
                  <div className="feature-panel-icon">
                    <Layers size={16} />
                  </div>
                  <h3 className="feature-panel-title">Deterministic State</h3>
                  <p className="feature-panel-text">
                    All document mutations are verified against a causal clock hierarchy to resolve
                    concurrent edits with zero telemetry loss.
                  </p>
                </div>

                <div className="doc-feature-panel">
                  <div className="feature-panel-icon">
                    <Cpu size={16} />
                  </div>
                  <h3 className="feature-panel-title">Isolated Container Nodes</h3>
                  <p className="feature-panel-text">
                    Code executions operate in short-lived cgroups with constrained disk buffers,
                    memory barriers, and CPU throttling.
                  </p>
                </div>

                <div className="doc-feature-panel">
                  <div className="feature-panel-icon">
                    <Compass size={16} />
                  </div>
                  <h3 className="feature-panel-title">Zero-Configuration Rooms</h3>
                  <p className="feature-panel-text">
                    Ephemeral and persistent workspaces initialize instantly with unified WebSockets
                    and REST persistence.
                  </p>
                </div>
              </div>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">System Topology</h2>
                <p>
                  The platform is structured into three decoupled layers to maintain fault tolerance
                  and sub-10ms UI latency:
                </p>
                <div className="doc-step-list">
                  <div className="step-row">
                    <span className="step-num font-code">01</span>
                    <div className="step-desc">
                      <strong>Client Workspace Runtime:</strong> React 18 and Monaco Editor provide
                      virtualized DOM text rendering, syntax tokenization, and cursor interpolation.
                    </div>
                  </div>
                  <div className="step-row">
                    <span className="step-num font-code">02</span>
                    <div className="step-desc">
                      <strong>Distributed Sync Coordinator:</strong> Node.js and Socket.io manage
                      room broadcast channels, heartbeat probes, and presence dispatch.
                    </div>
                  </div>
                  <div className="step-row">
                    <span className="step-num font-code">03</span>
                    <div className="step-desc">
                      <strong>Sandbox Execution Cluster:</strong> Isolated compiler runners compile,
                      stream stdin, and capture stdout/stderr safely.
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* 2. Realtime Sync Engine */}
          {activeSection === 'realtime-protocol' && (
            <article className="doc-section">
              <header className="doc-section-header">
                <span className="doc-tag font-code">SYNCHRONIZATION</span>
                <h1 className="doc-headline">Sync Engine & Remote Presence</h1>
                <p className="doc-lead">
                  Bi-directional delta streaming ensures that simultaneous keystrokes, remote cursor
                  highlights, and user states propagate across distributed peers seamlessly.
                </p>
              </header>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">Operational Delta Protocol</h2>
                <p>
                  Every keystroke in Monaco is transformed into atomic change events (range offsets,
                  text mutations, and author metadata) rather than sending full file buffers.
                </p>

                <div className="code-card">
                  <div className="code-card-header">
                    <span className="code-card-title font-code">socket-payload.json</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyCode(
                          JSON.stringify(
                            {
                              event: 'editor:delta',
                              roomId: 'ws-781920',
                              sender: 'usr_81a7b',
                              timestamp: 1716309820120,
                              changes: [
                                {
                                  range: [14, 1, 14, 18],
                                  text: 'public static void main',
                                },
                              ],
                            },
                            null,
                            2
                          ),
                          'delta-sample'
                        )
                      }
                      className="code-copy-btn font-code"
                    >
                      {copiedSnippet === 'delta-sample' ? (
                        <>
                          <Check size={12} className="text-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="code-card-pre font-code">
{`{
  "event": "editor:delta",
  "roomId": "ws-781920",
  "sender": "usr_81a7b",
  "timestamp": 1716309820120,
  "changes": [
    {
      "range": [14, 1, 14, 18],
      "text": "public static void main"
    }
  ]
}`}
                  </pre>
                </div>
              </div>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">Presence & Liveness Lifecycle</h2>
                <ul className="clean-bullet-list">
                  <li>
                    <strong>Heartbeat Probes:</strong> Sockets emit ping/pong frames every 15
                    seconds. Broken connections are purged automatically.
                  </li>
                  <li>
                    <strong>Clean Tab Disconnects:</strong> Unmount event listeners broadcast a
                    graceful leave frame, removing remote cursor overlays in under 20ms.
                  </li>
                  <li>
                    <strong>Focus Loss Detection:</strong> Inactive browser tabs throttle presence
                    broadcasts to preserve client bandwidth and battery life.
                  </li>
                </ul>
              </div>
            </article>
          )}

          {/* 3. Execution Sandboxes */}
          {activeSection === 'sandboxed-runtimes' && (
            <article className="doc-section">
              <header className="doc-section-header">
                <span className="doc-tag font-code">COMPILATION ENGINE</span>
                <h1 className="doc-headline">Execution Sandboxes & Runtimes</h1>
                <p className="doc-lead">
                  Code submitted to SyncPad executes within isolated micro-sandboxes with pre-configured
                  toolchains, memory limits, and strict process termination policies.
                </p>
              </header>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">Supported Toolchains</h2>
                <div className="doc-table-container">
                  <table className="doc-table font-code">
                    <thead>
                      <tr>
                        <th>Language</th>
                        <th>Compiler / Toolchain</th>
                        <th>Memory Cap</th>
                        <th>Timeout</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Java</strong></td>
                        <td>OpenJDK 21 (LTS)</td>
                        <td>256 MB</td>
                        <td>8.0s</td>
                      </tr>
                      <tr>
                        <td><strong>Python</strong></td>
                        <td>Python 3.12 (CPython)</td>
                        <td>128 MB</td>
                        <td>6.0s</td>
                      </tr>
                      <tr>
                        <td><strong>C++</strong></td>
                        <td>GCC 13 (g++ -O2 -std=c++20)</td>
                        <td>256 MB</td>
                        <td>7.0s</td>
                      </tr>
                      <tr>
                        <td><strong>JavaScript</strong></td>
                        <td>Node.js v20 (V8 Engine)</td>
                        <td>128 MB</td>
                        <td>5.0s</td>
                      </tr>
                      <tr>
                        <td><strong>TypeScript</strong></td>
                        <td>TypeScript 5.4 Toolchain</td>
                        <td>192 MB</td>
                        <td>6.0s</td>
                      </tr>
                      <tr>
                        <td><strong>Go</strong></td>
                        <td>Go 1.22 Runtime (gc)</td>
                        <td>256 MB</td>
                        <td>6.0s</td>
                      </tr>
                      <tr>
                        <td><strong>Rust</strong></td>
                        <td>Rustc 1.77 (Cargo)</td>
                        <td>384 MB</td>
                        <td>9.0s</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">Comment Filtering & Sanitization</h2>
                <p>
                  Execution passes automatically preprocess code files. Multiline comment blocks and
                  inline comments are handled natively without disrupting source map line coordinates.
                </p>
              </div>
            </article>
          )}

          {/* 4. I/O & Stdin Streaming */}
          {activeSection === 'stdin-streams' && (
            <article className="doc-section">
              <header className="doc-section-header">
                <span className="doc-tag font-code">I/O SUBSYSTEM</span>
                <h1 className="doc-headline">Interactive Stdin Streaming</h1>
                <p className="doc-lead">
                  Test competitive programming solutions, algorithmic input streams, and CLI-based
                  logic with dedicated standard input piping.
                </p>
              </header>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">Providing Standard Input</h2>
                <p>
                  The interactive console tab at the bottom of the editor allows users to provide raw
                  text buffers before executing code:
                </p>
                <div className="doc-step-list">
                  <div className="step-row">
                    <span className="step-num font-code">01</span>
                    <div className="step-desc">
                      Switch to the <strong>Input (stdin)</strong> sub-tab in the terminal dock.
                    </div>
                  </div>
                  <div className="step-row">
                    <span className="step-num font-code">02</span>
                    <div className="step-desc">
                      Type or paste sample test cases (e.g., space or newline delimited tokens).
                    </div>
                  </div>
                  <div className="step-row">
                    <span className="step-num font-code">03</span>
                    <div className="step-desc">
                      Press <kbd>Ctrl + Enter</kbd> or click <strong>Run Code</strong>. The buffer is
                      piped directly into the process's <code>stdin</code> descriptor.
                    </div>
                  </div>
                </div>
              </div>

              <div className="doc-content-block">
                <h2 className="doc-subheadline">Idiomatic I/O Patterns</h2>
                <div className="code-card">
                  <div className="code-card-header">
                    <span className="code-card-title font-code">python_stdin_example.py</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyCode(
                          `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n = int(lines[0])\n    nums = [int(x) for x in lines[1:n+1]]\n    print(f"Sum of {n} integers: {sum(nums)}")\n\nif __name__ == "__main__":\n    solve()`,
                          'py-stdin'
                        )
                      }
                      className="code-copy-btn font-code"
                    >
                      {copiedSnippet === 'py-stdin' ? (
                        <>
                          <Check size={12} className="text-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="code-card-pre font-code">
{`import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    print(f"Sum of {n} integers: {sum(nums)}")

if __name__ == "__main__":
    solve()`}
                  </pre>
                </div>
              </div>
            </article>
          )}

          {/* 5. Command Shortcuts */}
          {activeSection === 'keybindings' && (
            <article className="doc-section">
              <header className="doc-section-header">
                <span className="doc-tag font-code">SHORTCUT MAP</span>
                <h1 className="doc-headline">Keyboard Shortcuts & Commands</h1>
                <p className="doc-lead">
                  Accelerate your workflow with editor keybindings designed for rapid pair-programming
                  and continuous execution.
                </p>
              </header>

              <div className="doc-content-block">
                <div className="doc-table-container">
                  <table className="doc-table font-code">
                    <thead>
                      <tr>
                        <th>Command Action</th>
                        <th>Windows / Linux</th>
                        <th>macOS</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Run Code</strong></td>
                        <td><kbd>Ctrl + Enter</kbd></td>
                        <td><kbd>⌘ + Enter</kbd></td>
                        <td>Compiles and runs code against stdin buffer</td>
                      </tr>
                      <tr>
                        <td><strong>Save Document</strong></td>
                        <td><kbd>Ctrl + S</kbd></td>
                        <td><kbd>⌘ + S</kbd></td>
                        <td>Stores permanent snapshot to database</td>
                      </tr>
                      <tr>
                        <td><strong>Toggle Line Comment</strong></td>
                        <td><kbd>Ctrl + /</kbd></td>
                        <td><kbd>⌘ + /</kbd></td>
                        <td>Comment/uncomment active line or selection</td>
                      </tr>
                      <tr>
                        <td><strong>Format Document</strong></td>
                        <td><kbd>Alt + Shift + F</kbd></td>
                        <td><kbd>⌥ + ⇧ + F</kbd></td>
                        <td>Applies language-specific code formatting</td>
                      </tr>
                      <tr>
                        <td><strong>Command Palette</strong></td>
                        <td><kbd>F1</kbd></td>
                        <td><kbd>F1</kbd></td>
                        <td>Opens Monaco Editor command search</td>
                      </tr>
                      <tr>
                        <td><strong>Duplicate Line</strong></td>
                        <td><kbd>Shift + Alt + ↓</kbd></td>
                        <td><kbd>⇧ + ⌥ + ↓</kbd></td>
                        <td>Duplicates current line below</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          )}

          {/* 6. Security Model */}
          {activeSection === 'security-model' && (
            <article className="doc-section">
              <header className="doc-section-header">
                <span className="doc-tag font-code">ZERO TRUST</span>
                <h1 className="doc-headline">Security & Sandbox Isolation</h1>
                <p className="doc-lead">
                  SyncPad is architected around strict isolation boundaries to safeguard host
                  infrastructure and prevent malicious process escalation.
                </p>
              </header>

              <div className="doc-card-grid">
                <div className="doc-feature-panel">
                  <div className="feature-panel-icon">
                    <ShieldCheck size={16} />
                  </div>
                  <h3 className="feature-panel-title">Isolated Network Namespace</h3>
                  <p className="feature-panel-text">
                    Compiler containers lack external outbound routing, preventing SSRF attacks and
                    prohibiting internal subnet scanning.
                  </p>
                </div>

                <div className="doc-feature-panel">
                  <div className="feature-panel-icon">
                    <Terminal size={16} />
                  </div>
                  <h3 className="feature-panel-title">Resource Quotas</h3>
                  <p className="feature-panel-text">
                    Fork bombs and unbounded recursion are neutralized by strict process count limits
                    and memory ceilings.
                  </p>
                </div>

                <div className="doc-feature-panel">
                  <div className="feature-panel-icon">
                    <Compass size={16} />
                  </div>
                  <h3 className="feature-panel-title">Stateless Discard</h3>
                  <p className="feature-panel-text">
                    Temporary directories and source artifacts are deleted from memory and disk as
                    soon as execution finishes.
                  </p>
                </div>
              </div>
            </article>
          )}
        </main>
      </div>

      <Footer />

      <style>{`
        .docs-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #090a0f);
          color: var(--text-primary, #f3f4f6);
        }

        /* Minimalist Outer Container */
        .docs-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 24px 96px;
          display: flex;
          gap: 48px;
          flex: 1;
          width: 100%;
          align-items: flex-start;
        }

        /* Minimalist Navigation Sidebar */
        .docs-nav-sidebar {
          width: 250px;
          flex-shrink: 0;
          position: sticky;
          top: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .docs-nav-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #71717a;
          padding: 0 8px;
        }

        .kicker-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        .docs-nav-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .docs-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 400;
          color: #8e95a5;
          background: transparent;
          border: 1px solid transparent;
          text-align: left;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .docs-nav-item:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.04);
        }

        .docs-nav-item.active {
          color: #ffffff;
          font-weight: 500;
          background: #11131a;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .nav-item-icon {
          color: #71717a;
          flex-shrink: 0;
          transition: color 0.12s ease;
        }

        .docs-nav-item.active .nav-item-icon {
          color: #ffffff;
        }

        .docs-nav-meta {
          margin-top: 12px;
          padding: 16px;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
        }

        .meta-label {
          font-size: 10px;
          letter-spacing: 0.06em;
          color: #71717a;
          margin-bottom: 4px;
        }

        .meta-val {
          font-size: 13px;
          font-weight: 500;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .meta-note {
          font-size: 11px;
          color: #71717a;
          line-height: 1.4;
        }

        /* Minimalist Main Documentation Body */
        .docs-main-body {
          flex: 1;
          min-width: 0;
          max-width: 880px;
        }

        .doc-section {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .doc-section-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 28px;
        }

        .doc-tag {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #71717a;
        }

        .doc-headline {
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1.15;
          margin: 0;
        }

        .doc-lead {
          font-size: 15px;
          color: #9ca3af;
          line-height: 1.6;
          margin: 0;
        }

        .doc-subheadline {
          font-size: 18px;
          font-weight: 500;
          letter-spacing: -0.015em;
          color: #ffffff;
          margin: 0 0 12px 0;
        }

        .doc-content-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.6;
        }

        .doc-content-block p {
          margin: 0;
        }

        /* Feature Cards Grid */
        .doc-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .doc-feature-panel {
          padding: 20px;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .feature-panel-icon {
          color: #71717a;
        }

        .feature-panel-title {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          margin: 0;
        }

        .feature-panel-text {
          font-size: 12.5px;
          color: #71717a;
          line-height: 1.5;
          margin: 0;
        }

        /* Numbered Step List */
        .doc-step-list {
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          background: #0c0e14;
          overflow: hidden;
        }

        .step-row {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .step-row:last-child {
          border-bottom: none;
        }

        .step-num {
          font-size: 11px;
          color: #71717a;
          padding-top: 2px;
          flex-shrink: 0;
        }

        .step-desc {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.5;
        }

        .step-desc strong {
          color: #ffffff;
        }

        /* Bullet List */
        .clean-bullet-list {
          padding-left: 20px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .clean-bullet-list li {
          font-size: 13.5px;
          color: #9ca3af;
          line-height: 1.5;
        }

        .clean-bullet-list strong {
          color: #ffffff;
        }

        /* Clean Table Style */
        .doc-table-container {
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          background: #0c0e14;
          overflow: hidden;
        }

        .doc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          text-align: left;
        }

        .doc-table th {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          color: #71717a;
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .doc-table td {
          padding: 12px 16px;
          color: #9ca3af;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .doc-table tr:last-child td {
          border-bottom: none;
        }

        .doc-table td strong {
          color: #ffffff;
        }

        /* Code Cards */
        .code-card {
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          background: #0c0e14;
          overflow: hidden;
          margin-top: 4px;
        }

        .code-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .code-card-title {
          font-size: 11px;
          color: #71717a;
        }

        .code-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          font-size: 11px;
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .code-copy-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .text-success {
          color: #10b981;
        }

        .code-card-pre {
          padding: 16px;
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #e5e7eb;
          overflow-x: auto;
        }

        /* Keyboard tags */
        kbd {
          display: inline-block;
          padding: 2px 6px;
          font-size: 11px;
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
          font-family: inherit;
        }

        code {
          padding: 1px 5px;
          font-size: 12px;
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 3px;
        }

        /* Responsive */
        @media (max-width: 960px) {
          .docs-container {
            flex-direction: column;
            gap: 32px;
            padding: 40px 16px 64px;
          }

          .docs-nav-sidebar {
            width: 100%;
            position: static;
          }

          .docs-nav-list {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 6px;
          }

          .doc-card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

