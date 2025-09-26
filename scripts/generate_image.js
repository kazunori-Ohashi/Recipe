#!/usr/bin/env node
'use strict';

const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve, dirname } = require('node:path');

async function savePlaceholder(imagePath, prompt) {
  const placeholder = `Image generation skipped. Prompt was:\n${prompt}`;
  await mkdir(dirname(imagePath), { recursive: true });
  await writeFile(imagePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.txt'), placeholder, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node scripts/generate_image.js --prompt <prompt.txt> --output <image.webp>');
    process.exit(0);
  }

  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--prompt') {
      options.promptPath = resolve(args[++i]);
    } else if (args[i] === '--output') {
      options.outputPath = resolve(args[++i]);
    }
  }

  if (!options.promptPath || !options.outputPath) {
    throw new Error('--prompt と --output は必須です');
  }

  const prompt = await readFile(options.promptPath, 'utf8');
  const apiKey = process.env.IMAGE_API_KEY;

  if (!apiKey) {
    console.warn('IMAGE_API_KEY が設定されていないため、プレースホルダーを生成します。');
    await savePlaceholder(options.outputPath, prompt);
    return;
  }

  // TODO: 実際の画像生成API呼び出しを実装する。
  console.warn('画像生成API呼び出しは未実装です。プレースホルダーを生成します。');
  await savePlaceholder(options.outputPath, prompt);
}

main().catch((error) => {
  console.error('generate_image failed:', error.message);
  process.exit(1);
});
