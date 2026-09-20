import express from 'express';
import { executeCode } from '../services/executionService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    let { language = 'javascript', code = '', stdin = '', files = [], entrypoint } = req.body;

    if (!code && Array.isArray(files) && files.length > 0) {
      const target = files.find((f) => f.isEntrypoint || f.name === entrypoint || f.id === entrypoint) || files[0];
      if (target) {
        code = target.content;
        if (target.language) language = target.language;
      }
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        stdout: '',
        stderr: 'Code snippet or file content is required to execute',
        output: 'Error: Empty code',
        exitCode: 1,
      });
    }

    const result = await executeCode({ language, code, stdin, files, entrypoint });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      stdout: '',
      stderr: 'Execution engine error: ' + err.message,
      output: err.message,
      exitCode: 1,
    });
  }
});

export default router;
