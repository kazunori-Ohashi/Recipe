## 目的
抽出LLMが生成した中間JSONと高血圧×糖尿病予備群向けコンテキストを用い、減塩・低GI・高たんぱくのレシピに再構成する。

## 入力
- 中間JSON（title, servings, ingredients, steps, category）
- コンテキストパック全文
- 栄養・置換ルール（JSON）

## 出力要件
以下のJSONスキーマに準拠:
```
{
  "title": string,
  "servings": number,
  "nutrition_targets": {
    "sodium_g_max": number,
    "protein_g_min": number,
    "carbs_g_range": [number, number]
  },
  "swaps": [{"from": string, "to": string, "rationale": string}],
  "ingredients": [{"name": string, "amount": string, "notes": string|null}],
  "steps": [string],
  "estimates": {
    "sodium_g": number,
    "carbs_g": number,
    "protein_g": number,
    "fat_g": number
  },
  "image_prompt": string,
  "checklist": [{"item": string, "status": "pass"|"warn"|"fail", "detail": string|null}],
  "notes": string
}
```

## 変換ガイド
1. 栄養ルールを満たすよう材料・手順を調整する。
2. 置換内容は`swaps`に記録。置換しない場合でも塩分削減策を明記。
3. 新しく追加する材料はコア食材リストを優先。
4. `steps`はワンパン/ワンポットなど簡素な流れを意識。
5. `image_prompt`にはコンテキストのスタイル指定を含める。
6. `checklist`はコンテキスト9の各項目を評価し、要修正時は`warn`または`fail`。

## 禁止事項
- JSON以外のテキストを出力しない。
- 元のレシピ名を忘れずにタイトルへ `_減塩低GI版` を付与。
- 不明な材料や工程は推測で追加しない。可能な代替を提示する。

