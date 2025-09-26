'use strict';

const { execFile } = require('node:child_process');
const { readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

function execFileAsync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
    if (options.input) {
      child.stdin.end(options.input);
    }
  });
}

async function loadMockResponse(mockPath) {
  const raw = await readFile(mockPath, 'utf8');
  return JSON.parse(raw);
}

async function runClaude({
  mode,
  promptPath,
  inputJson,
  mockPath,
  traceLabel,
  allowMockFallback = true,
  temperature = 0
}) {
  if (!promptPath) {
    throw new Error('promptPath is required');
  }

  const needsMock = process.env.USE_MOCK_LLM === '1' || (!process.env.CLAUDE_CODE_OAUTH_TOKEN && allowMockFallback);
  if (needsMock) {
    if (!mockPath) {
      throw new Error(`Mock requested for ${traceLabel ?? mode}, but no mockPath defined.`);
    }
    return loadMockResponse(mockPath);
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error('CLAUDE_CODE_OAUTH_TOKEN is not set. Set USE_MOCK_LLM=1 to use fixture responses.');
  }

  const payload = JSON.stringify(inputJson, null, 2);
  const tempInputPath = join(tmpdir(), `${traceLabel ?? mode}-input.json`);
  await writeFile(tempInputPath, payload, 'utf8');

  const args = [
    'prompt',
    '--mode', mode,
    '--prompt-file', promptPath,
    '--input-file', tempInputPath,
    '--format', 'json',
    '--temperature', String(temperature)
  ];

  const env = {
    ...process.env,
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN
  };

  try {
    const { stdout } = await execFileAsync('claude-code', args, { env });
    return JSON.parse(stdout.trim());
  } catch (error) {
    if (allowMockFallback && mockPath) {
      console.warn(`Claude call failed for ${traceLabel ?? mode}. Using mock.`, error.stderr || error.message);
      return loadMockResponse(mockPath);
    }
    throw error;
  }
}

module.exports = {
  runClaude
};
