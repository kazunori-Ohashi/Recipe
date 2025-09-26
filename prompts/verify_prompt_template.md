## 目的
元レシピの材料・工程と変換後レシピを比較し、置換ルールや栄養ポリシーが守られているか検証する。

## 入力
- 元テキストの材料・手順（抽出JSONから再構成）
- 変換済みレシピJSON
- 検証チェックリスト（栄養閾値、置換ルール、材料欠落など）

## 出力要件
```
{
  "materials_check": [{"original": string, "converted": [string], "status": "pass"|"warn"|"fail", "notes": string}],
  "rule_checks": [{"rule": string, "status": "pass"|"warn"|"fail", "llm_comment": string}],
  "overall_assessment": "pass"|"warn"|"fail",
  "suggested_actions": [string]
}
```

## 検証ガイド
1. 元材料ごとに変換後材料の対応関係を記述。
2. 置換ルール違反（例: 醤油を塩のまま使用など）は`fail`。
3. 糖質や塩分が高そうな記述があれば`warn`または`fail`。
4. 工程が複雑化している場合は簡素化を提案。
5. 新規追加材料がコアリスト外なら理由を確認。
6. 必要に応じて調整案を`suggested_actions`に箇条書きで提示。

## 禁止事項
- JSON以外のテキストを出力しない。
- コンテキストにない独自の基準で`fail`判定しない。
- 断定不能な場合は`warn`で留め、追記コメントを付ける。

