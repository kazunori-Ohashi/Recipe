# Recipe LLM Pipeline

高血圧かつ糖尿病予備群向けにSNSレシピを自動変換するGitHub Actionsパイプラインのリポジトリです。

## ディレクトリ概要
- `docs/` – 機能仕様書とテスト計画書。
- `prompts/` – LLMへのプロンプトテンプレートとコンテキストパック。
- `data/` – 栄養ルール・味付けルール・栄養データセット。
- `scripts/` – テキスト抽出・変換・検証・Markdown化などの実行スクリプト。
- `fixtures/` – テストフィクスチャとモックレスポンス。
- `snapshots/` – 回帰検知用のスナップショット格納先。
- `site/` – 静的サイト生成用のMarkdown出力先。
- `assets/` – 画像プロンプトおよび生成画像の保存先。

## ローカル実行の流れ
1. `USE_MOCK_LLM=1 node scripts/parse_with_llm.js --input fixtures/raw/main_karaage.txt --mock fixtures/claude_responses/parse/main_karaage.json`
2. `USE_MOCK_LLM=1 node scripts/transform_with_llm.js --input recipes/src/original/main_karaage.json --mock fixtures/claude_responses/transform/main_karaage.json`
3. `USE_MOCK_LLM=1 node scripts/verify_with_llm.js --original recipes/src/original/main_karaage.json --converted recipes/out/converted/main_karaage.json --mock fixtures/claude_responses/verify/main_karaage.json`
4. `node scripts/validate_recipe.js --converted recipes/out/converted/main_karaage.json`
5. `node scripts/build_markdown.js --input recipes/out/converted/main_karaage.json`

## GitHub Actions
`.github/workflows/convert-and-publish.yml` が、テキスト抽出→変換→検証→Markdown生成→Pagesデプロイのジョブで構成されています。

## Secrets
- `CLAUDE_CODE_OAUTH_TOKEN` – Claude Code SDK用トークン。
- `ANTHROPIC_API_KEY` – Claude API呼び出し用（必要に応じて）。
- `IMAGE_API_KEY` – 画像生成API用。

