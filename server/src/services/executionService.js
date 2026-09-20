import axios from 'axios';
import vm from 'vm';
import path from 'path';

/**
 * Strips comments safely from code without corrupting strings or syntax.
 * Ensures commented code is never executed.
 */
export const stripComments = (code, lang) => {
  if (!code) return '';

  if (lang === 'python') {
    // Strip triple quote docstrings/comments
    let clean = code.replace(/"""[\s\S]*?"""/g, '').replace(/'''[\s\S]*?'''/g, '');
    // Strip single line # comments that aren't inside quotes
    const lines = clean.split('\n');
    return lines
      .map((line) => {
        let inSingle = false;
        let inDouble = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === "'" && !inDouble && (i === 0 || line[i - 1] !== '\\')) {
            inSingle = !inSingle;
          } else if (char === '"' && !inSingle && (i === 0 || line[i - 1] !== '\\')) {
            inDouble = !inDouble;
          } else if (char === '#' && !inSingle && !inDouble) {
            return line.substring(0, i);
          }
        }
        return line;
      })
      .join('\n');
  }

  // C-family (Java, C++, JavaScript, TypeScript, Go, Rust)
  // 1. Strip block comments /* ... */
  let clean = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Strip single-line comments // that aren't inside quotes
  const lines = clean.split('\n');
  return lines
    .map((line) => {
      let inSingle = false;
      let inDouble = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === "'" && !inDouble && (i === 0 || line[i - 1] !== '\\')) {
          inSingle = !inSingle;
        } else if (char === '"' && !inSingle && (i === 0 || line[i - 1] !== '\\')) {
          inDouble = !inDouble;
        } else if (
          char === '/' &&
          i + 1 < line.length &&
          line[i + 1] === '/' &&
          !inSingle &&
          !inDouble
        ) {
          return line.substring(0, i);
        }
      }
      return line;
    })
    .join('\n');
};

/**
 * Checks if code contains a Java class declaration (ignoring comments)
 */
const hasJavaClass = (code) => {
  const stripped = stripComments(code, 'java');
  return /\bclass\s+[A-Za-z0-9_$]+/.test(stripped);
};

/**
 * Normalizes Java code:
 * 1. Renames any public class to Main so standard OpenJDK compiler can compile without file-name errors.
 * 2. If no class or main exists, wraps statements into public class Main with standard imports.
 */
export const normalizeJavaCode = (code) => {
  if (!code || !code.trim()) {
    return `public class Main { public static void main(String[] args) {} }`;
  }

  // If user only wrote statements without any class declaration
  if (!hasJavaClass(code)) {
    return `import java.util.*;
import java.io.*;
import java.math.*;

public class Main {
    public static void main(String[] args) throws Exception {
${code}
    }
}
`;
  }

  let updated = code;

  // If there is a public class named something other than Main, rename it to Main
  if (/public\s+class\s+([A-Za-z0-9_$]+)/.test(updated)) {
    updated = updated.replace(/public\s+class\s+([A-Za-z0-9_$]+)/g, (match, className) => {
      return className === 'Main' ? match : 'public class Main';
    });
  } else {
    // If no class is marked public, ensure one class is public class Main
    if (/\bclass\s+Main\b/.test(updated)) {
      updated = updated.replace(/\bclass\s+Main\b/, 'public class Main');
    } else {
      updated = updated.replace(/\bclass\s+([A-Za-z0-9_$]+)/, 'public class Main');
    }
  }

  return updated;
};

/**
 * Normalizes C++ code:
 * 1. Checks if main function exists. If not, auto-wraps statements into int main().
 * 2. Auto-includes standard libraries if missing.
 */
export const normalizeCppCode = (code) => {
  if (!code || !code.trim()) {
    return `#include <iostream>\nint main() { return 0; }`;
  }

  const stripped = stripComments(code, 'cpp');
  const hasMain = /\b(?:int|void)\s+main\s*\(/.test(stripped);

  if (!hasMain) {
    return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
using namespace std;

int main() {
${code}
    return 0;
}
`;
  }

  // If main exists, make sure iostream is included
  let updated = code;
  if (!updated.includes('#include <iostream>') && !updated.includes('#include<iostream>')) {
    updated = `#include <iostream>\n${updated}`;
  }
  return updated;
};

/**
 * Paiza.io Language Mapping
 */
const PAIZA_LANG_MAP = {
  javascript: 'javascript',
  python: 'python3',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  rust: 'rust',
  typescript: 'javascript', // Handled via transpilation to JS
};

/**
 * Executes code via Paiza.io real compiler sandbox
 */
const executeViaPaiza = async ({ language, code, stdin = '' }) => {
  const paizaLang = PAIZA_LANG_MAP[language];
  if (!paizaLang) {
    throw new Error(`Unsupported compiler language: ${language}`);
  }

  // Pre-normalize code per language
  let preparedCode = code;
  if (language === 'java') {
    preparedCode = normalizeJavaCode(code);
  } else if (language === 'cpp') {
    preparedCode = normalizeCppCode(code);
  }

  // Strip comments so commented snippets are NEVER executed even if compiler has loose parsing
  preparedCode = stripComments(preparedCode, language);

  const createRes = await axios.post(
    'https://api.paiza.io/runners/create',
    {
      source_code: preparedCode,
      language: paizaLang,
      input: stdin || '',
      api_key: 'guest',
    },
    { timeout: 15000 }
  );

  const runnerId = createRes.data.id;
  if (!runnerId) {
    throw new Error('Failed to obtain runner ID from execution sandbox.');
  }

  // Poll for completion (up to 18 seconds)
  const maxAttempts = 25;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 700));

    const detailsRes = await axios.get(
      `https://api.paiza.io/runners/get_details?id=${runnerId}&api_key=guest`,
      { timeout: 8000 }
    );

    const data = detailsRes.data;
    if (data.status === 'completed') {
      const stdout = data.stdout || '';
      const stderr = data.stderr || '';
      const buildStderr = data.build_stderr || '';
      const combinedError = [buildStderr, stderr].filter(Boolean).join('\n');
      const isSuccess = data.result === 'success' && !buildStderr;

      return {
        success: isSuccess,
        stdout: stdout || (!combinedError ? 'Program finished with no output.' : ''),
        stderr: combinedError,
        output: stdout || combinedError || 'Program executed successfully.',
        exitCode: isSuccess ? 0 : 1,
        time: data.time || '0.05',
        engine: `syncpad ${language.toUpperCase()} Cloud Runtime`,
      };
    }
  }

  throw new Error('Code execution timed out (exceeded limit).');
};

/**
 * Local Isolated Sandbox for JavaScript / Node.js with hierarchical multi-file support
 */
const executeLocalJS = ({ code, stdin = '', files = [], entrypoint }) => {
  const cleanCode = stripComments(code, 'javascript');
  const logs = [];
  const errors = [];
  let buffer = '';

  const rawTokens = stdin ? stdin.trim().split(/\s+/).filter(Boolean) : [];
  const rawLines = stdin ? stdin.split(/\r?\n/) : [];
  let tokenIdx = 0;
  let lineIdx = 0;

  const nextToken = () => (tokenIdx < rawTokens.length ? rawTokens[tokenIdx++] : '');
  const nextLine = () => (lineIdx < rawLines.length ? rawLines[lineIdx++] : '');
  const hasNext = () => tokenIdx < rawTokens.length;

  // File resolution map for require('./...') with full hierarchical path support
  const fileMap = new Map();
  if (Array.isArray(files)) {
    files.forEach((f) => {
      if (f && f.name && f.type !== 'directory') {
        const rawContent = f.content || '';
        const nameLower = f.name.toLowerCase();
        const bareName = nameLower.replace(/\.[^/.]+$/, '');
        fileMap.set(nameLower, rawContent);
        fileMap.set(bareName, rawContent);

        if (f.path) {
          const normPath = f.path.startsWith('/') ? f.path.toLowerCase() : `/${f.path.toLowerCase()}`;
          const noLead = normPath.replace(/^\//, '');
          const barePath = normPath.replace(/\.[^/.]+$/, '');
          const bareNoLead = noLead.replace(/\.[^/.]+$/, '');

          fileMap.set(normPath, rawContent);
          fileMap.set(noLead, rawContent);
          fileMap.set(barePath, rawContent);
          fileMap.set(bareNoLead, rawContent);
        }
      }
    });
  }

  // Determine starting directory of the entrypoint file
  let startDir = '/';
  if (entrypoint) {
    const epLower = String(entrypoint).toLowerCase();
    const matched =
      Array.isArray(files) &&
      files.find(
        (f) =>
          f.name?.toLowerCase() === epLower ||
          f.path?.toLowerCase() === epLower ||
          f.path?.toLowerCase() === `/${epLower}`
      );
    if (matched && matched.path) {
      startDir = path.posix.dirname(matched.path.startsWith('/') ? matched.path : `/${matched.path}`);
    }
  }

  const createRequire = (currentDir = '/') => {
    return (modulePath) => {
      if (!modulePath) throw new Error('Module path cannot be empty');

      // Resolve relative path using POSIX semantics
      let resolved = modulePath.startsWith('.')
        ? path.posix.resolve(currentDir, modulePath)
        : modulePath.startsWith('/')
        ? path.posix.normalize(modulePath)
        : path.posix.resolve(currentDir, modulePath);

      resolved = resolved.toLowerCase();
      const resolvedBare = resolved.replace(/\.[^/.]+$/, '');
      const cleanRelative = modulePath.replace(/^\.?\//, '').toLowerCase();
      const cleanRelativeBare = cleanRelative.replace(/\.[^/.]+$/, '');

      let content =
        fileMap.get(resolved) ??
        fileMap.get(`${resolvedBare}.js`) ??
        fileMap.get(resolvedBare) ??
        fileMap.get(cleanRelative) ??
        fileMap.get(`${cleanRelativeBare}.js`) ??
        fileMap.get(cleanRelativeBare);

      if (content !== undefined) {
        const moduleObj = { exports: {} };
        const nextDir = path.posix.dirname(resolved);
        const subSandbox = {
          ...sandbox,
          exports: moduleObj.exports,
          module: moduleObj,
          require: createRequire(nextDir),
          __dirname: nextDir,
          __filename: resolved,
        };
        const subScript = new vm.Script(stripComments(content, 'javascript'));
        const subContext = vm.createContext(subSandbox);
        subScript.runInContext(subContext, { timeout: 3000 });
        return moduleObj.exports;
      }

      throw new Error(`Cannot find module '${modulePath}'. Ensure file is saved in the room explorer.`);
    };
  };

  const customRequire = createRequire(startDir);

  const sandbox = {
    console: {
      log: (...args) => {
        const line = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        if (buffer) {
          logs.push(buffer + line);
          buffer = '';
        } else {
          logs.push(line);
        }
      },
      error: (...args) => errors.push('[ERROR] ' + args.join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
      info: (...args) => logs.push('[INFO] ' + args.join(' ')),
    },
    print: (...args) => {
      logs.push(args.map(String).join(' '));
    },
    printRaw: (text) => {
      buffer += String(text);
    },
    flush: () => {
      if (buffer) {
        logs.push(buffer);
        buffer = '';
      }
    },
    require: customRequire,
    module: { exports: {} },
    exports: {},
    // Stdin Helpers
    nextToken,
    nextLine,
    hasNext,
    input: (promptText) => {
      if (promptText) logs.push(String(promptText));
      return nextLine() || nextToken();
    },
    prompt: (promptText) => {
      if (promptText) logs.push(String(promptText));
      return nextLine() || nextToken();
    },
    readline: nextLine,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    setTimeout: (fn) => fn(),
  };

  try {
    const script = new vm.Script(cleanCode);
    const context = vm.createContext(sandbox);
    script.runInContext(context, { timeout: 3000 });
    sandbox.flush();

    const stdout = logs.join('\n');
    const stderr = errors.join('\n');

    return {
      success: errors.length === 0,
      stdout: stdout || (errors.length === 0 ? 'Program finished with no output.' : ''),
      stderr,
      output: stdout || stderr || 'Program executed successfully.',
      exitCode: errors.length === 0 ? 0 : 1,
      engine: 'syncpad JavaScript Local VM',
    };
  } catch (err) {
    sandbox.flush();
    return {
      success: false,
      stdout: logs.join('\n'),
      stderr: err.message || String(err),
      output: (logs.length > 0 ? logs.join('\n') + '\n' : '') + (err.message || String(err)),
      exitCode: 1,
      engine: 'syncpad JavaScript Local VM',
    };
  }
};

/**
 * Main unified executeCode method
 */
export const executeCode = async ({ language = 'javascript', code = '', stdin = '', files = [], entrypoint }) => {
  const startTime = Date.now();
  const langKey = language?.toLowerCase() || 'javascript';

  // If multiple files are provided for JS/TS, use local isolated VM to resolve sibling modules (require('./...'))
  if (Array.isArray(files) && files.length > 1 && (langKey === 'javascript' || langKey === 'typescript')) {
    const localRes = executeLocalJS({ code, stdin, files, entrypoint });
    return {
      ...localRes,
      executionTimeMs: Date.now() - startTime,
      language: langKey,
    };
  }

  // Fast-path: cloud container execution for single-file runs
  try {
    const result = await executeViaPaiza({
      language: langKey,
      code,
      stdin,
    });

    const executionTimeMs = Date.now() - startTime;
    return {
      ...result,
      executionTimeMs,
      language: langKey,
    };
  } catch (err) {
    console.warn(`[Execution Warning] Cloud runtime failed (${err.message}). Attempting fallback.`);

    // If JavaScript, fallback to local Node VM sandbox
    if (langKey === 'javascript' || langKey === 'typescript') {
      const localRes = executeLocalJS({ code, stdin, files, entrypoint });
      return {
        ...localRes,
        executionTimeMs: Date.now() - startTime,
        language: langKey,
      };
    }

    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      stdout: '',
      stderr: `Execution Service Error: ${err.message}`,
      output: `Could not complete execution: ${err.message}`,
      exitCode: 1,
      executionTimeMs,
      language: langKey,
      engine: `syncpad ${langKey.toUpperCase()} Sandbox`,
    };
  }
};
