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

## 環境初期化用メモ

プログラム側に初期化処理を仕込むのも冗長なので。

### DB初期化用SQL

```sql
CREATE TABLE IF NOT EXISTS ranking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bsky_did TEXT NOT NULL,
    bsky_handle TEXT NOT NULL,
    bsky_display_name TEXT NOT NULL,
    bsky_icon_url TEXT NOT NULL,
    score INTEGER NOT NULL,
    score_accumulated INTEGER NOT NULL,
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bsky_did ON ranking (bsky_did);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bsky_handle ON ranking (bsky_handle);
CREATE INDEX IF NOT EXISTS idx_score ON ranking (score);
```
