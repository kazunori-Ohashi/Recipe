#!/usr/bin/env node
'use strict';

const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve, dirname, basename } = require('node:path');
const { slugify } = require('./utils/slug');

function toYamlValue(value) {
  if (typeof value === 'number') return value;
  return String(value ?? '');
}

function renderMarkdown(recipe) {
  const lines = [];
  lines.push('---');
  lines.push(`title: "${recipe.title}"`);
  lines.push(`servings: ${recipe.servings}`);
  lines.push('tags: [減塩, 糖尿病予備群, 高たんぱく, 低GI]');
  lines.push(`sodium_g: "${recipe.estimates?.sodium_g ?? ''}"`);
  lines.push(`carbs_g: "${recipe.estimates?.carbs_g ?? ''}"`);
  lines.push(`protein_g: "${recipe.estimates?.protein_g ?? ''}"`);
  lines.push(`fat_g: "${recipe.estimates?.fat_g ?? ''}"`);
  lines.push(`notes: "${recipe.notes ?? '塩は使わず酸味・旨味・香りで満足度を作る'}"`);
  lines.push('---\n');
  lines.push('## 材料');
  for (const item of recipe.ingredients) {
    const note = item.notes ? `（${item.notes}）` : '';
    lines.push(`- ${item.name}: ${item.amount}${note}`);
  }
  lines.push('\n## 作り方');
  recipe.steps.forEach((step, idx) => {
    lines.push(`${idx + 1}. ${step}`);
  });
  lines.push('\n## ポイント');
  for (const entry of recipe.checklist || []) {
    lines.push(`- ${entry.item}: ${entry.detail ?? entry.status}`);
  }
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node scripts/build_markdown.js --input <converted.json> [--output <recipe.md>]');
    process.exit(0);
  }

  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--input') {
      options.inputPath = resolve(args[++i]);
    } else if (args[i] === '--output') {
      options.outputPath = resolve(args[++i]);
    } else if (args[i] === '--slug') {
      options.slug = args[++i];
    }
  }

  if (!options.inputPath) {
    throw new Error('--input is required');
  }

  const recipe = JSON.parse(await readFile(options.inputPath, 'utf8'));
  const fallbackSlug = basename(options.inputPath, '.json');
  const slug = options.slug || fallbackSlug || slugify(recipe.title);
  const outputPath = options.outputPath || resolve(`site/content/recipes/${slug}.md`);
  const markdown = renderMarkdown(recipe);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, 'utf8');
  console.log(`Markdown saved to ${outputPath}`);
}

main().catch((error) => {
  console.error('build_markdown failed:', error.message);
  process.exit(1);
});
