export const EXTENSION_TO_LANGUAGE = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  pyw: 'python',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  java: 'java',
  rs: 'rust',
  go: 'go',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  sh: 'shell',
  bash: 'shell',
};

export const LANGUAGE_METADATA = {
  javascript: {
    name: 'JavaScript',
    defaultExt: 'js',
    color: '#facc15', // Amber-yellow
    badgeBg: 'rgba(250, 204, 21, 0.12)',
    badgeText: 'JS',
  },
  typescript: {
    name: 'TypeScript',
    defaultExt: 'ts',
    color: '#38bdf8', // Sky blue
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeText: 'TS',
  },
  python: {
    name: 'Python',
    defaultExt: 'py',
    color: '#34d399', // Emerald green
    badgeBg: 'rgba(52, 211, 153, 0.12)',
    badgeText: 'PY',
  },
  cpp: {
    name: 'C++',
    defaultExt: 'cpp',
    color: '#818cf8', // Indigo
    badgeBg: 'rgba(129, 140, 248, 0.12)',
    badgeText: 'C++',
  },
  java: {
    name: 'Java',
    defaultExt: 'java',
    color: '#fb923c', // Orange
    badgeBg: 'rgba(251, 146, 60, 0.12)',
    badgeText: 'JV',
  },
  rust: {
    name: 'Rust',
    defaultExt: 'rs',
    color: '#f87171', // Coral red
    badgeBg: 'rgba(248, 113, 113, 0.12)',
    badgeText: 'RS',
  },
  go: {
    name: 'Go',
    defaultExt: 'go',
    color: '#22d3ee', // Cyan
    badgeBg: 'rgba(34, 211, 238, 0.12)',
    badgeText: 'GO',
  },
  json: {
    name: 'JSON',
    defaultExt: 'json',
    color: '#fbbf24', // Amber
    badgeBg: 'rgba(251, 191, 36, 0.12)',
    badgeText: '{}',
  },
  markdown: {
    name: 'Markdown',
    defaultExt: 'md',
    color: '#94a3b8', // Slate
    badgeBg: 'rgba(148, 163, 184, 0.12)',
    badgeText: 'MD',
  },
};

export const getLanguageFromFilename = (filename) => {
  if (!filename) return 'javascript';
  const parts = filename.split('.');
  if (parts.length < 2) return 'javascript';
  const ext = parts.pop().toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'javascript';
};

export const getFileBadgeInfo = (filename) => {
  const lang = getLanguageFromFilename(filename);
  return LANGUAGE_METADATA[lang] || {
    name: 'Text',
    defaultExt: 'txt',
    color: '#a1a1aa',
    badgeBg: 'rgba(161, 161, 170, 0.12)',
    badgeText: 'FILE',
  };
};

export const getTemplateContent = (filename, language) => {
  const lang = language || getLanguageFromFilename(filename);
  switch (lang) {
    case 'python':
      return `"""\nMulti-file session module: ${filename}\n"""\n\ndef run():\n    print("Executing ${filename}...")\n\nif __name__ == "__main__":\n    run()\n`;
    case 'cpp':
      return `#include <iostream>\nusing namespace std;\n\n// Module: ${filename}\nvoid compute() {\n    cout << "Executing ${filename}..." << endl;\n}\n`;
    case 'java': {
      const className = filename.replace(/\.java$/i, '') || 'Module';
      return `public class ${className} {\n    public static void main(String[] args) {\n        System.out.println("Executing ${className} in SyncPad...");\n    }\n}\n`;
    }
    case 'rust':
      return `// Module: ${filename}\npub fn execute() {\n    println!("Executing ${filename}...");\n}\n`;
    case 'go':
      return `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Executing ${filename}...")\n}\n`;
    case 'json':
      return `{\n  "name": "${filename}",\n  "version": "1.0.0"\n}\n`;
    case 'markdown':
      return `# ${filename}\n\nDocumentation and notes for this collaborative workspace.\n`;
    case 'typescript':
      return `// Multi-file TypeScript module: ${filename}\nexport interface Config {\n  id: string;\n  active: boolean;\n}\n\nexport const init = (): void => {\n  console.log("Initialized ${filename}");\n};\n`;
    case 'javascript':
    default:
      return `// Multi-file module: ${filename}\nexport function execute() {\n  return "Result from ${filename}";\n}\n\nconsole.log(execute());\n`;
  }
};

/**
 * Extracts 1-2 character uppercase initials from a user's display name
 * e.g. "Amit Mishra" -> "AM", "John" -> "JO", "Developer" -> "DE"
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};
