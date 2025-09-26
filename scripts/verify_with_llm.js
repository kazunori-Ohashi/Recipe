#!/usr/bin/env node
'use strict';

const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { dirname, resolve, basename } = require('node:path');
const { runClaude } = require('./utils/llm');
const { slugify } = require('./utils/slug');

const CHECKLIST = [
  '塩分は閾値内か',
  '糖質は役割に応じて適正か',
  '25g以上のたんぱく質を確保しているか',
  '酸味・旨味・香りで塩を置換しているか',
  'ワンパン/ワンポットで現実的か',
  '常備リストで再現可能か',
  '旨味リソースの使い方に過不足がないか',
  '仕上げの香辛料で締めているか'
];

async function loadJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function hasFailure(report) {
  if (!report) return true;
  if (report.overall_assessment === 'fail') return true;
  const failedMaterial = (report.materials_check || []).some((item) => item.status === 'fail');
  const failedRule = (report.rule_checks || []).some((item) => item.status === 'fail');
  return failedMaterial || failedRule;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node scripts/verify_with_llm.js --original <original.json> --converted <converted.json> [--output <report.json>] [--mock <fixture.json>]');
    process.exit(0);
  }

  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--original') {
      options.originalPath = resolve(args[++i]);
    } else if (args[i] === '--converted') {
      options.convertedPath = resolve(args[++i]);
    } else if (args[i] === '--output') {
      options.outputPath = resolve(args[++i]);
    } else if (args[i] === '--mock') {
      options.mockPath = resolve(args[++i]);
    } else if (args[i] === '--slug') {
      options.slug = args[++i];
    }
  }

  if (!options.originalPath || !options.convertedPath) {
    throw new Error('--original と --converted は必須です');
  }

  const original = await loadJson(options.originalPath);
  const converted = await loadJson(options.convertedPath);
  const promptPath = resolve('prompts/verify_prompt_template.md');

  const llmInput = {
    original_recipe: original,
    converted_recipe: converted,
    checklist: CHECKLIST
  };

  const report = await runClaude({
    mode: 'verify-recipe',
    promptPath,
    inputJson: llmInput,
    mockPath: options.mockPath,
    traceLabel: 'verify'
  });

  const fallbackSlug = basename(options.convertedPath, '.json');
  const slug = options.slug || fallbackSlug || slugify(converted.title);
  const outputPath = options.outputPath || resolve(`artifacts/verify/${slug}.json`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(`Verification report saved to ${outputPath}`);

  if (hasFailure(report)) {
    console.error('Verification reported failures. See report for details.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('verify_with_llm failed:', error.message);
  process.exit(1);
});
