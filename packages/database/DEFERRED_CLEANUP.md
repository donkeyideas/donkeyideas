# Deferred DB Cleanup — Pre-Launch Backup Tables

## Context

Before the pre-launch clean wipe on **2026-05-XX**, we snapshotted four tables
from the live Supabase Postgres DB so we could roll back if anything went
wrong with the wipe + 500-coin compensation grant. The wipe affected 144
users; these tables are the only record of what their state looked like
before.

Tables retained:

| Table | Row count at snapshot |
|---|---|
| `_backup_bet_records_pre_wipe` | 88 |
| `_backup_coin_transactions_pre_wipe` | 258 |
| `_backup_game_players_pre_wipe` | 144 |
| `_backup_race_records_pre_wipe` | 477 |

They cost near-zero storage. They are not in the Prisma schema (intentionally
— `db push` will warn about dropping them if you run it; **always say NO**).

## When to drop these

Only after **all** of:

- [ ] At least 2 weeks of stable production traffic on the wiped economy
- [ ] No user complaints about missing coins / lost progress that would
      require pre-wipe data to investigate
- [ ] No outstanding support tickets referencing pre-2026-05-XX state

If any user emails "where did my coins go" before then, look them up in
`_backup_game_players_pre_wipe` first.

## How to drop

Open the Supabase SQL Editor:
https://supabase.com/dashboard/project/ykoyslpioeidwoxaluyy/sql

Run **one statement at a time** (so if anything goes wrong with the first,
you can stop). Each returns "Success — No rows returned":

```sql
DROP TABLE _backup_bet_records_pre_wipe;
```

```sql
DROP TABLE _backup_coin_transactions_pre_wipe;
```

```sql
DROP TABLE _backup_game_players_pre_wipe;
```

```sql
DROP TABLE _backup_race_records_pre_wipe;
```

After running all four, verify they're gone:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE '_backup_%';
```

Should return 0 rows.

## Once dropped — no going back

There is no undo. After these drops, the only history of pre-wipe player
state is in any application logs you retained (Vercel, Sentry, etc.) — and
those don't have coin balances or race records.
