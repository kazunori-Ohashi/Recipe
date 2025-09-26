#!/usr/bin/env node
'use strict';

const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { dirname, basename, resolve } = require('node:path');
const { runClaude } = require('./utils/llm');
const { slugify } = require('./utils/slug');

const CONVERTER_VERSION = '0.1.0';

async function loadJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function applyDefaultTargets(result, category, nutritionRules) {
  if (result.nutrition_targets) {
    return result;
  }
  const key = category && nutritionRules.targets[category] ? category : 'default';
  return {
    ...result,
    nutrition_targets: nutritionRules.targets[key]
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node scripts/transform_with_llm.js --input <original.json> [--output <converted.json>] [--mock <fixture.json>]');
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
    } else if (args[i] === '--slug') {
      options.slug = args[++i];
    }
  }

  if (!options.inputPath) {
    throw new Error('--input is required');
  }

  const original = await loadJson(options.inputPath);
  const contextPack = await readFile(resolve('prompts/context_pack.md'), 'utf8');
  const nutritionRules = await loadJson(resolve('data/rules/nutrition_rules.json'));
  const flavorRules = await loadJson(resolve('data/rules/flavor_rules.json'));

  const llmInput = {
    original_recipe: original,
    context_pack: contextPack,
    nutrition_rules: nutritionRules,
    flavor_rules: flavorRules
  };

  const promptPath = resolve('prompts/transform_prompt_template.md');

  const response = await runClaude({
    mode: 'transform-recipe',
    promptPath,
    inputJson: llmInput,
    mockPath: options.mockPath,
    traceLabel: 'transform'
  });

  const withTargets = applyDefaultTargets(response, original.category, nutritionRules);

  const fallbackSlug = basename(options.inputPath, '.json');
  const slug = options.slug || fallbackSlug || slugify(response.title || original.title);
  const outputPath = options.outputPath || resolve(`recipes/out/converted/${slug}.json`);

  const nowIso = new Date().toISOString();
  const enriched = {
    ...withTargets,
    metadata: {
      source_file: options.inputPath,
      processed_at: nowIso,
      converter_version: CONVERTER_VERSION,
      ...(withTargets.metadata || {})
    }
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`Converted recipe saved to ${outputPath}`);
}

main().catch((error) => {
  console.error('transform_with_llm failed:', error.message);
  process.exit(1);
});
