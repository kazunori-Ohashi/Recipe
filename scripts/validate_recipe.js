#!/usr/bin/env node
'use strict';

const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const record = {};
    header.forEach((key, idx) => {
      record[key] = cells[idx];
    });
    return record;
  });
}

function buildNutritionIndex(records) {
  const map = new Map();
  for (const record of records) {
    map.set(record.ingredient, {
      sodium_g: Number(record.sodium_mg) / 1000,
      carbs_g: Number(record.carbs_g),
      protein_g: Number(record.protein_g),
      fat_g: Number(record.fat_g),
      serving_size_g: Number(record.serving_size_g)
    });
  }
  return map;
}

function estimateMacros(recipe, nutritionIndex) {
  const totals = { sodium_g: 0, carbs_g: 0, protein_g: 0, fat_g: 0 };
  const unknownIngredients = [];

  for (const item of recipe.ingredients) {
    const base = nutritionIndex.get(item.name);
    if (!base) {
      unknownIngredients.push(item.name);
      continue;
    }
    const multiplier = 1; // TODO: parse amount to scale serving
    totals.sodium_g += base.sodium_g * multiplier;
    totals.carbs_g += base.carbs_g * multiplier;
    totals.protein_g += base.protein_g * multiplier;
    totals.fat_g += base.fat_g * multiplier;
  }

  return { totals, unknownIngredients };
}

function evaluateTargets(recipe, totals) {
  const result = [];
  const targets = recipe.nutrition_targets || {};
  if (targets.sodium_g_max != null && totals.sodium_g > targets.sodium_g_max) {
    result.push({ metric: 'sodium_g', status: 'fail', detail: `${totals.sodium_g.toFixed(2)} > ${targets.sodium_g_max}` });
  }
  if (targets.protein_g_min != null && totals.protein_g < targets.protein_g_min) {
    result.push({ metric: 'protein_g', status: 'fail', detail: `${totals.protein_g.toFixed(2)} < ${targets.protein_g_min}` });
  }
  if (Array.isArray(targets.carbs_g_range)) {
    const [min, max] = targets.carbs_g_range;
    if (totals.carbs_g < min || totals.carbs_g > max) {
      result.push({ metric: 'carbs_g', status: 'fail', detail: `${totals.carbs_g.toFixed(2)} not in [${min}, ${max}]` });
    }
  }
  if (result.length === 0) {
    result.push({ metric: 'overall', status: 'pass', detail: 'all targets satisfied' });
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node scripts/validate_recipe.js --converted <converted.json> [--nutrition <data.csv>]');
    process.exit(0);
  }

  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--converted') {
      options.convertedPath = resolve(args[++i]);
    } else if (args[i] === '--nutrition') {
      options.nutritionPath = resolve(args[++i]);
    }
  }

  if (!options.convertedPath) {
    throw new Error('--converted is required');
  }

  const nutritionPath = options.nutritionPath || resolve('data/nutrition.csv');
  const converted = JSON.parse(await readFile(options.convertedPath, 'utf8'));
  const nutritionRecords = parseCsv(await readFile(nutritionPath, 'utf8'));
  const nutritionIndex = buildNutritionIndex(nutritionRecords);

  const { totals, unknownIngredients } = estimateMacros(converted, nutritionIndex);
  const totalsForEvaluation = converted.estimates || totals;
  const evaluation = evaluateTargets(converted, totalsForEvaluation);

  if (unknownIngredients.length > 0) {
    console.warn(`栄養データ未登録: ${unknownIngredients.join(', ')}`);
  }
  console.log('推定マクロ (使用値):', totalsForEvaluation);
  for (const item of evaluation) {
    console.log(`${item.metric}: ${item.status} (${item.detail})`);
  }

  const hasFail = evaluation.some((item) => item.status === 'fail');
  if (hasFail) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('validate_recipe failed:', error.message);
  process.exit(1);
});
