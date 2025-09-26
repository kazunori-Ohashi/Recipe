#!/usr/bin/env node
'use strict';

const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { dirname, basename, join, resolve } = require('node:path');
const { runClaude } = require('./utils/llm');
const { slugify } = require('./utils/slug');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node scripts/parse_with_llm.js --input <raw.txt> [--output <out.json>] [--mock <fixture.json>]');
    process.exit(0);
  }

  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--input') {
      options.inputPath = resolve(args[++i]);
    } else if (args[i] === '--output') {
      options.outputPath = resolve(args[++i]);
    } else if (args[i] === '--mock') {
      options.mockPath = resolve(args[++i]);
    } else if (args[i] === '--category') {
      options.category = args[++i];
    } else if (args[i] === '--slug') {
      options.slug = args[++i];
    }
  }

  if (!options.inputPath) {
    throw new Error('--input is required');
  }

  const rawText = await readFile(options.inputPath, 'utf8');
  const promptPath = resolve('prompts/parse_prompt_template.md');

  const llmInput = {
    text: rawText,
    hints: {
      category: options.category ?? null,
      filename: basename(options.inputPath)
    }
  };

  const parsed = await runClaude({
    mode: 'extract-json',
    promptPath,
    inputJson: llmInput,
    mockPath: options.mockPath,
    traceLabel: 'parse'
  });

  if (parsed.error) {
    throw new Error(`Parse LLM reported error: ${parsed.error}`);
  }

  const titleForSlug = parsed.title || basename(options.inputPath, '.txt');
  const slug = options.slug || slugify(titleForSlug); 
  const outputPath = options.outputPath || resolve(`recipes/src/original/${slug}.json`);

  const enriched = {
    ...parsed,
    title: parsed.title || basename(options.inputPath, '.txt'),
    source_text_path: options.inputPath
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(enriched, null, 2));

  console.log(`Parsed JSON saved to ${outputPath}`);
}

main().catch((error) => {
  console.error('parse_with_llm failed:', error.message);
  process.exit(1);
});
