import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { InvalidRoomModal } from '../components/InvalidRoomModal';
import {
  Zap,
  Terminal,
  Layers,
  Plus,
  ArrowRight,
  Copy,
  Check,
  Code2,
  Sparkles,
  Command,
  Users,
  Shield,
  Cpu,
  GitBranch,
  SplitSquareVertical,
  Activity,
  Boxes,
} from 'lucide-react';

const CODE_TABS = [
  {
    id: 'server',
    label: 'Create a Server',
    filename: 'server.mjs',
    language: 'JavaScript',
    lines: [
      { text: '// server.mjs', type: 'comment' },
      { text: "import { createServer } from 'node:http';", type: 'import' },
      { text: '', type: 'blank' },
      { text: 'const server = createServer((req, res) => {', type: 'code' },
      { text: "  res.writeHead(200, { 'Content-Type': 'text/plain' });", type: 'code' },
      { text: "  res.end('Hello, SyncPad World!\\n');", type: 'code' },
      { text: '});', type: 'code' },
      { text: '', type: 'blank' },
      { text: '// Starts a simple HTTP server on port 3000', type: 'comment' },
      { text: "server.listen(3000, '127.0.0.1', () => {", type: 'code' },
      { text: "  console.log('Listening on 127.0.0.1:3000');", type: 'code' },
      { text: '});', type: 'code' },
      { text: '', type: 'blank' },
      { text: '// run with `node server.mjs`', type: 'comment' },
    ],
    code: `// server.mjs\nimport { createServer } from 'node:http';\n\nconst server = createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'text/plain' });\n  res.end('Hello, SyncPad World!\\n');\n});\n\n// Starts a simple HTTP server on port 3000\nserver.listen(3000, '127.0.0.1', () => {\n  console.log('Listening on 127.0.0.1:3000');\n});\n\n// run with \`node server.mjs\`\n`,
  },
  {
    id: 'collab',
    label: 'Live Collaboration',
    filename: 'collab.ts',
    language: 'TypeScript',
    lines: [
      { text: '// collab.ts', type: 'comment' },
      { text: "import { RoomSession } from '@syncpad/realtime';", type: 'import' },
      { text: '', type: 'blank' },
      { text: "const room = await RoomSession.connect('distributed-algo');", type: 'code' },
      { text: '', type: 'blank' },
      { text: '// Broadcast peer cursor and synchronized keystrokes', type: 'comment' },
      { text: "room.on('peer:cursor', ({ user, line, ch }) => {", type: 'code' },
      { text: "  console.log(`${user.name} editing at line ${line}:${ch}`);", type: 'code' },
      { text: '});', type: 'code' },
      { text: '', type: 'blank' },
      { text: "room.broadcast({ type: 'selection', start: 12, end: 48 });", type: 'code' },
      { text: '', type: 'blank' },
      { text: '// Sub-millisecond WebSocket sync active', type: 'comment' },
    ],
    code: `// collab.ts\nimport { RoomSession } from '@syncpad/realtime';\n\nconst room = await RoomSession.connect('distributed-algo');\n\n// Broadcast peer cursor and synchronized keystrokes\nroom.on('peer:cursor', ({ user, line, ch }) => {\n  console.log(\`\${user.name} editing at line \${line}:\${ch}\`);\n});\n\nroom.broadcast({ type: 'selection', start: 12, end: 48 });\n\n// Sub-millisecond WebSocket sync active\n`,
  },
  {
    id: 'sandbox',
    label: 'Cloud Execution',
    filename: 'runner.py',
    language: 'Python 3',
    lines: [
      { text: '# runner.py', type: 'comment' },
      { text: 'import sys', type: 'import' },
      { text: 'import json', type: 'import' },
      { text: '', type: 'blank' },
      { text: 'def benchmark_cluster(nodes: int) -> dict:', type: 'code' },
      { text: '    return {', type: 'code' },
      { text: '        "cluster": "syncpad-isolated-vm",', type: 'code' },
      { text: '        "active_nodes": nodes,', type: 'code' },
      { text: '        "latency_ms": 4.2', type: 'code' },
      { text: '    }', type: 'code' },
      { text: '', type: 'blank' },
      { text: '# Zero container startup lag (<15ms)', type: 'comment' },
      { text: 'print(json.dumps(benchmark_cluster(8), indent=2))', type: 'code' },
    ],
    code: `# runner.py\nimport sys\nimport json\n\ndef benchmark_cluster(nodes: int) -> dict:\n    return {\n        "cluster": "syncpad-isolated-vm",\n        "active_nodes": nodes,\n        "latency_ms": 4.2\n    }\n\n# Zero container startup lag (<15ms)\nprint(json.dumps(benchmark_cluster(8), indent=2))\n`,
  },
  {
    id: 'stdin',
    label: 'Interactive Stdin',
    filename: 'compute.cpp',
    language: 'C++20',
    lines: [
      { text: '// compute.cpp', type: 'comment' },
      { text: '#include <iostream>', type: 'import' },
      { text: '#include <vector>', type: 'import' },
      { text: '#include <numeric>', type: 'import' },
      { text: '', type: 'blank' },
      { text: 'int main() {', type: 'code' },
      { text: '    int count;', type: 'code' },
      { text: '    if (std::cin >> count) {', type: 'code' },
      { text: '        std::vector<int> nums(count);', type: 'code' },
      { text: '        for (int i = 0; i < count; ++i) std::cin >> nums[i];', type: 'code' },
      { text: '        int total = std::accumulate(nums.begin(), nums.end(), 0);', type: 'code' },
      { text: '        std::cout << "Sum: " << total << std::endl;', type: 'code' },
      { text: '    }', type: 'code' },
      { text: '    return 0;', type: 'code' },
      { text: '}', type: 'code' },
    ],
    code: `// compute.cpp\n#include <iostream>\n#include <vector>\n#include <numeric>\n\nint main() {\n    int count;\n    if (std::cin >> count) {\n        std::vector<int> nums(count);\n        for (int i = 0; i < count; ++i) std::cin >> nums[i];\n        int total = std::accumulate(nums.begin(), nums.end(), 0);\n        std::cout << "Sum: " << total << std::endl;\n    }\n    return 0;\n}\n`,
  },
  {
    id: 'multimodule',
    label: 'Multi-File Modules',
    filename: 'main.go',
    language: 'Go',
    lines: [
      { text: '// main.go', type: 'comment' },
      { text: 'package main', type: 'import' },
      { text: '', type: 'blank' },
      { text: 'import (', type: 'import' },
      { text: '    "fmt"', type: 'import' },
      { text: '    "./utils"', type: 'import' },
      { text: ')', type: 'import' },
      { text: '', type: 'blank' },
      { text: 'func main() {', type: 'code' },
      { text: '    // Resolves intra-project file tree modules', type: 'comment' },
      { text: '    engine := utils.NewSyncEngine()', type: 'code' },
      { text: '    fmt.Printf("Engine Status: %s\\n", engine.Status())', type: 'code' },
      { text: '}', type: 'code' },
    ],
    code: `// main.go\npackage main\n\nimport (\n    "fmt"\n    "./utils"\n)\n\nfunc main() {\n    // Resolves intra-project file tree modules\n    engine := utils.NewSyncEngine()\n    fmt.Printf("Engine Status: %s\\n", engine.Status())\n}\n`,
  },
];

const RUNTIME_BADGES = [
  { label: 'JS', name: 'JavaScript', color: '#facc15', bg: 'rgba(250, 204, 21, 0.12)' },
  { label: 'TS', name: 'TypeScript', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
  { label: 'PY', name: 'Python', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  { label: 'C++', name: 'C++', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)' },
  { label: 'JV', name: 'Java', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)' },
  { label: 'GO', name: 'Go', color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.12)' },
  { label: 'RS', name: 'Rust', color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invalidRoomId, setInvalidRoomId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=create');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim() || isVerifying) return;
    const cleanId = joinCode.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/rooms/${cleanId}`);
      if (!res.ok) {
        setInvalidRoomId(cleanId);
        return;
      }
      const data = await res.json();
      if (!data || !data.room) {
        setInvalidRoomId(cleanId);
        return;
      }
      navigate(`/editor/${cleanId}`);
    } catch (err) {
      setInvalidRoomId(cleanId);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyCode = () => {
    const activeSnippet = CODE_TABS[activeTab]?.code || '';
    navigator.clipboard.writeText(activeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderCodeLine = (text, type) => {
    if (!text) return '\u00A0';
    if (type === 'comment') {
      return <span className="token-comment">{text}</span>;
    }
    if (type === 'import') {
      const parts = text.split(/(\bimport\b|\bfrom\b|\bpackage\b|\bdef\b|\bclass\b|'.*?'|".*?"|<.*?>)/g);
      return parts.map((part, i) => {
        if (['import', 'from', 'package', 'def', 'class'].includes(part)) {
          return <span key={i} className="token-keyword">{part}</span>;
        }
        if (/^['"].*['"]$/.test(part) || /^<.*>$/.test(part)) {
          return <span key={i} className="token-str">{part}</span>;
        }
        return part;
      });
    }
    const parts = text.split(/(\bconst\b|\blet\b|\bvar\b|\bfunction\b|\breturn\b|\bif\b|\bfor\b|\bint\b|\bvoid\b|\bfunc\b|\bstring\b|\bstd::\b|\bpublic\b|\bclass\b|'.*?'|".*?"|`.*?`|\b\d+\b)/g);
    return parts.map((part, i) => {
      if (['const', 'let', 'var', 'function', 'return', 'if', 'for', 'int', 'void', 'func', 'string', 'public', 'class'].includes(part)) {
        return <span key={i} className="token-keyword">{part}</span>;
      }
      if (/^['"`].*['"`]$/.test(part)) {
        return <span key={i} className="token-str">{part}</span>;
      }
      if (/^\d+$/.test(part)) {
        return <span key={i} className="token-num">{part}</span>;
      }
      if (part === 'std::') {
        return <span key={i} className="token-prefix">{part}</span>;
      }
      return part;
    });
  };

  const currentTab = CODE_TABS[activeTab];

  return (
    <div className="landing-root">
      <Navbar />

      {/* Hero Section - Minimalist Precision Architecture */}
      <section className="hero-section">
        <div className="hero-container">
          {/* Header Block */}
          <div className="hero-header-block">
            <div className="hero-status-pill">
              <span className="status-indicator-dot" />
              <span className="status-indicator-text">SyncPad 2.0</span>
              <span className="status-divider">/</span>
              <span className="status-subtext">Real-time Collaborative IDE</span>
            </div>

            <h1 className="hero-headline">
              Code together in realtime.
              <span className="hero-headline-sub">Minimal friction. Zero latency.</span>
            </h1>

            <p className="hero-summary">
              A refined workspace engineered for pairing, technical interviews, and collaborative engineering.
              Sub-millisecond state synchronization across distributed peers with sandboxed cloud execution.
            </p>

            {/* Actions Bar */}
            <div className="hero-controls-row">
              <button
                onClick={handleCreateRoom}
                className="hero-btn-primary"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create New Room</span>
              </button>

              <form onSubmit={handleJoinRoom} className="hero-join-input-group">
                <span className="join-prefix">#</span>
                <input
                  type="text"
                  placeholder="Room code (e.g. distributed-algo)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="join-input-element font-code"
                />
                <button
                  type="submit"
                  disabled={isVerifying || !joinCode.trim()}
                  className="join-action-btn"
                  title="Join Room"
                >
                  <ArrowRight size={13} />
                </button>
              </form>

              <button
                onClick={() => navigate('/rooms')}
                className="hero-btn-secondary"
              >
                <span>Browse Public Rooms</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Clean Monospace Interactive Code Workspace */}
          <div className="hero-preview-wrapper">
            <div className="preview-terminal-window">
              {/* Minimalist Tab & Window Bar */}
              <div className="terminal-header-bar">
                <div className="terminal-file-tabs">
                  {CODE_TABS.map((tab, idx) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(idx)}
                      className={`terminal-tab-item ${activeTab === idx ? 'active' : ''}`}
                    >
                      <span className="tab-file-name font-code">{tab.filename}</span>
                    </button>
                  ))}
                </div>

                <div className="terminal-actions-cluster">
                  <div className="presence-cluster">
                    <span className="presence-dot" />
                    <span className="presence-label font-code">2 peers connected</span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="terminal-copy-action font-code"
                    title="Copy snippet"
                  >
                    {copied ? (
                      <>
                        <Check size={12} className="text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editor Code Lines with Active Peer Cursors */}
              <div className="terminal-editor-body font-code">
                {currentTab.lines.map((line, idx) => (
                  <div key={idx} className="terminal-code-line">
                    <span className="line-num-gutter">{idx + 1}</span>
                    <div className="line-content-wrapper">
                      <span className="line-tokens">{renderCodeLine(line.text, line.type)}</span>

                      {/* Subtle minimalist peer markers */}
                      {activeTab === 1 && idx === 6 && (
                        <span className="peer-cursor-tag cursor-amber">
                          <span className="peer-cursor-caret" />
                          <span className="peer-cursor-bubble">alex</span>
                        </span>
                      )}
                      {activeTab === 1 && idx === 9 && (
                        <span className="peer-cursor-tag cursor-cyan">
                          <span className="peer-cursor-caret" />
                          <span className="peer-cursor-bubble">sarah</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Bar */}
              <div className="terminal-status-strip font-code">
                <div className="status-item">
                  <span className="status-key">RUNTIME</span>
                  <span className="status-val">{currentTab.language}</span>
                </div>
                <div className="status-item">
                  <span className="status-key">PROTOCOL</span>
                  <span className="status-val">WS // 0.8ms</span>
                </div>
                <div className="status-item">
                  <span className="status-key">SANDBOX</span>
                  <span className="status-val">ISOLATED-VM</span>
                </div>
                <div className="status-item status-right">
                  <span className="status-val">UTF-8</span>
                </div>
              </div>
            </div>

            {/* Architecture Metrics Row */}
            <div className="hero-metrics-strip">
              <div className="metric-cell">
                <span className="metric-figure font-code">&lt; 1ms</span>
                <span className="metric-desc">P99 Sync Latency</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-cell">
                <span className="metric-figure font-code">7+</span>
                <span className="metric-desc">Isolated Compilers</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-cell">
                <span className="metric-figure font-code">100%</span>
                <span className="metric-desc">Ephemeral Peer State</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-cell">
                <span className="metric-figure font-code">0ms</span>
                <span className="metric-desc">Setup Overhead</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimalist Precision Capabilities Section */}
      <section className="features-section">
        <div className="features-container">
          {/* Minimalist Section Header */}
          <div className="features-header-block">
            <div className="features-kicker-tag font-code">
              <span className="kicker-bullet" />
              <span>CAPABILITIES</span>
            </div>
            <h2 className="features-main-title">
              Engineered for precision collaborative development.
            </h2>
            <p className="features-main-subtitle">
              Every system layer is tuned for low latency, zero overhead, and predictable runtime behavior.
            </p>
          </div>

          {/* Minimalist 6-Feature Clean Grid */}
          <div className="minimal-features-grid">
            {/* Feature 1 */}
            <div className="feature-item-cell">
              <div className="feature-cell-header">
                <span className="feature-index font-code">01</span>
                <div className="feature-icon-box">
                  <Activity size={18} strokeWidth={2} />
                </div>
              </div>
              <h3 className="feature-item-title">Deterministic Operational Sync</h3>
              <p className="feature-item-description">
                Peer mutation streams are resolved conflict-free using an optimized delta pipeline over low-latency binary WebSockets.
              </p>
              <div className="feature-cell-meta font-code">
                <span className="meta-tag">P99 &lt; 1ms</span>
                <span className="meta-tag">Zero Desync</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="feature-item-cell">
              <div className="feature-cell-header">
                <span className="feature-index font-code">02</span>
                <div className="feature-icon-box">
                  <Cpu size={18} strokeWidth={2} />
                </div>
              </div>
              <h3 className="feature-item-title">Micro-Container Cloud Runtimes</h3>
              <p className="feature-item-description">
                Ephemeral isolated environments boot in sub-15ms for native execution across Node.js, Python, C++, Go, and Rust.
              </p>
              <div className="feature-cell-meta font-code">
                <span className="meta-tag">Cgroups v2</span>
                <span className="meta-tag">Interactive Stdin</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="feature-item-cell">
              <div className="feature-cell-header">
                <span className="feature-index font-code">03</span>
                <div className="feature-icon-box">
                  <SplitSquareVertical size={18} strokeWidth={2} />
                </div>
              </div>
              <h3 className="feature-item-title">Synchronized Multi-File Workspace</h3>
              <p className="feature-item-description">
                Navigate interconnected directories, modules, and import trees collaboratively without fragmented state across peers.
              </p>
              <div className="feature-cell-meta font-code">
                <span className="meta-tag">Tree Sync</span>
                <span className="meta-tag">Relative Imports</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="feature-item-cell">
              <div className="feature-cell-header">
                <span className="feature-index font-code">04</span>
                <div className="feature-icon-box">
                  <Users size={18} strokeWidth={2} />
                </div>
              </div>
              <h3 className="feature-item-title">Granular Role-Based Access</h3>
              <p className="feature-item-description">
                Switch between active co-pilot, observer-only, and moderator modes on the fly with instantaneous permission propagation.
              </p>
              <div className="feature-cell-meta font-code">
                <span className="meta-tag">Observer Mode</span>
                <span className="meta-tag">Instant Revoke</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="feature-item-cell">
              <div className="feature-cell-header">
                <span className="feature-index font-code">05</span>
                <div className="feature-icon-box">
                  <Shield size={18} strokeWidth={2} />
                </div>
              </div>
              <h3 className="feature-item-title">Cryptographic Session Isolation</h3>
              <p className="feature-item-description">
                End-to-end encrypted session transport with automated ephemeral memory reclamation once all participants disconnect.
              </p>
              <div className="feature-cell-meta font-code">
                <span className="meta-tag">Zero Residual</span>
                <span className="meta-tag">TLS 1.3</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="feature-item-cell">
              <div className="feature-cell-header">
                <span className="feature-index font-code">06</span>
                <div className="feature-icon-box">
                  <Command size={18} strokeWidth={2} />
                </div>
              </div>
              <h3 className="feature-item-title">Keyboard-Centric Palette Navigation</h3>
              <p className="feature-item-description">
                Rapid commands, tab hopping, compiler flags, and room settings accessible in milliseconds via an ergonomic command bar.
              </p>
              <div className="feature-cell-meta font-code">
                <span className="meta-tag">Cmd+K / Ctrl+K</span>
                <span className="meta-tag">Custom Binds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Creation Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Invalid Room Alert Modal */}
      <InvalidRoomModal
        isOpen={!!invalidRoomId}
        onClose={() => setInvalidRoomId(null)}
        roomId={invalidRoomId}
      />

      <style>{`
        .landing-root {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Minimalist Precision Hero Section */
        .hero-section {
          position: relative;
          padding: 80px 24px 72px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #0d0e12;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          /* Very subtle clean dot grid */
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        .hero-container {
          max-width: 1160px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        /* Centered Editorial Header Block */
        .hero-header-block {
          max-width: 820px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 48px;
        }

        /* Minimal Status Pill */
        .hero-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          background: #14161d;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          margin-bottom: 24px;
          font-family: var(--font-code);
          font-size: 12px;
          letter-spacing: 0.02em;
        }

        .status-indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
        }

        .status-indicator-text {
          font-weight: 600;
          color: #f3f4f6;
        }

        .status-divider {
          color: #4b5563;
        }

        .status-subtext {
          color: #9ca3af;
          font-weight: 400;
        }

        /* Minimalist Headline */
        .hero-headline {
          font-size: 56px;
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.035em;
          color: #f9fafb;
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .hero-headline-sub {
          color: #9ca3af;
          font-weight: 500;
          font-size: 38px;
          letter-spacing: -0.025em;
        }

        .hero-summary {
          font-size: 16px;
          line-height: 1.65;
          color: #94a3b8;
          max-width: 640px;
          margin-bottom: 32px;
          letter-spacing: -0.01em;
        }

        /* Clean Functional Controls Row */
        .hero-controls-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          width: 100%;
        }

        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f9fafb;
          color: #0b0c10;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
          border: 1px solid #ffffff;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }

        .hero-btn-primary:hover {
          background: #e5e7eb;
          border-color: #e5e7eb;
          transform: translateY(-1px);
        }

        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #14161d;
          color: #d1d5db;
          font-size: 13.5px;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .hero-btn-secondary:hover {
          background: #1a1d26;
          border-color: rgba(255, 255, 255, 0.2);
          color: #f9fafb;
        }

        /* Minimalist Room Join Input */
        .hero-join-input-group {
          display: flex;
          align-items: center;
          background: #12141a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 3px 4px 3px 12px;
          transition: border-color 0.15s ease;
        }

        .hero-join-input-group:focus-within {
          border-color: rgba(255, 255, 255, 0.35);
        }

        .join-prefix {
          color: #6b7280;
          font-size: 13px;
          font-family: var(--font-code);
          margin-right: 6px;
          user-select: none;
        }

        .join-input-element {
          background: transparent;
          border: none;
          color: #f3f4f6;
          font-size: 13px;
          outline: none;
          width: 220px;
        }

        .join-input-element::placeholder {
          color: #6b7280;
          font-family: var(--font-ui);
          font-size: 12.5px;
        }

        .join-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #1f232e;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #d1d5db;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .join-action-btn:hover:not(:disabled) {
          background: #f9fafb;
          color: #0b0c10;
        }

        .join-action-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /* Interactive Terminal Preview Window */
        .hero-preview-wrapper {
          width: 100%;
          max-width: 960px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .preview-terminal-window {
          width: 100%;
          background: #0f1015;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
        }

        /* Minimal Header Bar */
        .terminal-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #14161d;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 12px;
          height: 38px;
        }

        .terminal-file-tabs {
          display: flex;
          align-items: center;
          height: 100%;
          gap: 2px;
        }

        .terminal-tab-item {
          display: inline-flex;
          align-items: center;
          height: 100%;
          padding: 0 14px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #9ca3af;
          font-size: 12.5px;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }

        .terminal-tab-item:hover {
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.02);
        }

        .terminal-tab-item.active {
          color: #f9fafb;
          background: #0f1015;
          border-bottom-color: #f9fafb;
          font-weight: 500;
        }

        .terminal-actions-cluster {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .presence-cluster {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .presence-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
        }

        .presence-label {
          font-size: 11.5px;
          color: #9ca3af;
        }

        .terminal-copy-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: #1b1e28;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #cbd5e1;
          font-size: 11.5px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .terminal-copy-action:hover {
          background: #242834;
          color: #ffffff;
        }

        .text-success {
          color: #34d399 !important;
        }

        /* Editor Body */
        .terminal-editor-body {
          padding: 18px 20px;
          min-height: 290px;
          font-size: 13px;
          line-height: 1.65;
          background: #0f1015;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .terminal-code-line {
          display: flex;
          align-items: flex-start;
          min-height: 22px;
        }

        .line-num-gutter {
          color: #4b5563;
          width: 28px;
          text-align: right;
          margin-right: 18px;
          user-select: none;
          font-size: 12px;
          flex-shrink: 0;
        }

        .line-content-wrapper {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          color: #e5e7eb;
        }

        .line-tokens {
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Peer Cursors in minimal design */
        .peer-cursor-tag {
          display: inline-flex;
          align-items: center;
          height: 16px;
          user-select: none;
          margin-left: 2px;
        }

        .peer-cursor-caret {
          width: 2px;
          height: 15px;
          background: currentColor;
          animation: cursorBlink 1.2s infinite;
        }

        .peer-cursor-bubble {
          font-size: 10px;
          font-family: var(--font-code);
          padding: 1px 5px;
          border-radius: 2px;
          color: #0b0c10;
          font-weight: 600;
          line-height: 1.2;
          margin-left: 2px;
        }

        .cursor-amber {
          color: #f59e0b;
        }
        .cursor-amber .peer-cursor-bubble {
          background: #f59e0b;
        }

        .cursor-cyan {
          color: #06b6d4;
        }
        .cursor-cyan .peer-cursor-bubble {
          background: #06b6d4;
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Restrained Code Syntax Highlighting */
        .token-comment { color: #6b7280; font-style: italic; }
        .token-keyword { color: #e5e7eb; font-weight: 600; }
        .token-str { color: #a5b4fc; }
        .token-num { color: #f59e0b; }
        .token-prefix { color: #9ca3af; }

        /* Minimal Status Strip */
        .terminal-status-strip {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 16px;
          background: #14161d;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 11px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-key {
          color: #6b7280;
          font-weight: 600;
        }

        .status-val {
          color: #9ca3af;
        }

        .status-right {
          margin-left: auto;
        }

        /* Metrics Strip */
        .hero-metrics-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #12141a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 14px 24px;
        }

        .metric-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .metric-figure {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
        }

        .metric-desc {
          font-size: 11.5px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .metric-divider {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.08);
        }

        /* Minimalist Precision Capabilities Section */
        .features-section {
          position: relative;
          padding: 96px 24px;
          background: #090a0f;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .features-container {
          position: relative;
          z-index: 1;
          max-width: 1160px;
          margin: 0 auto;
        }

        /* Minimalist Header Block */
        .features-header-block {
          text-align: left;
          max-width: 760px;
          margin-bottom: 56px;
        }

        .features-kicker-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 14px;
        }

        .kicker-bullet {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #34d399;
        }

        .features-main-title {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.18;
          color: #f9fafb;
          margin-bottom: 12px;
        }

        .features-main-subtitle {
          font-size: 15.5px;
          line-height: 1.6;
          color: #9ca3af;
          letter-spacing: -0.01em;
          margin: 0;
        }

        /* Minimalist 6-Feature Grid */
        .minimal-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 6px;
          overflow: hidden;
        }

        .feature-item-cell {
          background: #0d0e14;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: background 0.15s ease;
        }

        .feature-item-cell:hover {
          background: #11131a;
        }

        .feature-cell-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .feature-index {
          font-size: 11.5px;
          font-weight: 600;
          color: #4b5563;
          letter-spacing: 0.06em;
        }

        .feature-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #e5e7eb;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .feature-item-cell:hover .feature-icon-box {
          border-color: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        .feature-item-title {
          font-size: 16.5px;
          font-weight: 600;
          line-height: 1.35;
          letter-spacing: -0.015em;
          color: #f3f4f6;
          margin-bottom: 10px;
        }

        .feature-item-description {
          font-size: 13.5px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0 0 24px 0;
          flex: 1;
        }

        .feature-cell-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: auto;
        }

        .meta-tag {
          font-size: 11px;
          padding: 2px 7px;
          background: #14161e;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 3px;
          color: #9ca3af;
          letter-spacing: 0.01em;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .hero-headline {
            font-size: 42px;
          }
          .hero-headline-sub {
            font-size: 28px;
          }
          .minimal-features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .hero-metrics-strip {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .metric-divider {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .hero-section {
            padding: 56px 16px 56px;
          }
          .hero-headline {
            font-size: 32px;
          }
          .hero-headline-sub {
            font-size: 22px;
          }
          .hero-controls-row {
            flex-direction: column;
            width: 100%;
          }
          .hero-btn-primary,
          .hero-btn-secondary {
            width: 100%;
            justify-content: center;
          }
          .hero-join-input-group {
            width: 100%;
          }
          .join-input-element {
            width: 100%;
          }
          .terminal-header-bar {
            overflow-x: auto;
          }
          .features-section {
            padding: 64px 16px;
          }
          .features-main-title {
            font-size: 26px;
          }
          .minimal-features-grid {
            grid-template-columns: 1fr;
          }
          .feature-item-cell {
            padding: 24px 20px;
          }
        }
      `}</style>
    </div>
  );
};
