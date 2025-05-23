## 動作確認用メモ

### ローカルで起動

```bash
cd ranking
wrangler dev --test-scheduled --local
```

### JSONレスポンス確認

- ランキング表示
    - http://localhost:8787/ranking
- 任意ユーザのスコア表示
    - http://localhost:8787/ranking/<ユーザID>

### スケジュール実行

```bash
curl http://localhost:8787/__scheduled?cron=*+*+*+*+*
```