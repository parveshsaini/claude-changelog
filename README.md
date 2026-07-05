# claude-changelog

A small bot that watches the [Claude Code changelog](https://code.claude.com/docs/en/changelog)
and posts a tweet to X whenever a new version ships.

It reads the official [`CHANGELOG.md`](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md),
detects versions it hasn't posted yet, uses Google Gemini to write a concise summary, and posts
it to X. It runs on a schedule via GitHub Actions — no server required.

## How it works

```
GitHub Actions (hourly cron)
        │
        ▼
  1. Fetch + parse CHANGELOG.md            → src/changelog.ts
  2. Read last-posted version from state   → src/state.ts
  3. Diff → versions not yet posted (oldest → newest)
        │  (first run = seed: record latest, post nothing)
  4. For each new version:
        ├─ generate a tweet with Gemini     → src/gemini.ts
        ├─ post it to X                      → src/twitter.ts
        └─ advance state
  5. Action commits the updated state file back to the repo
```

- **State** lives in `.state/last_posted_version.txt`, committed by the Action after each run.
- **Seed-on-first-run:** with no state yet, the bot records the current latest version and posts
  nothing, so it never floods the timeline with the entire changelog history.
- **Tweets** are a single post: a short Gemini-written summary plus a link to the changelog,
  kept within X's 280-character limit.

## Setup

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Configure credentials

Copy `.env.example` to `.env` and fill in:

| Variable | Where to get it |
|----------|-----------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `X_API_KEY`, `X_API_SECRET` | X developer app (API key & secret) |
| `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | X app access token & secret (needs **Read+Write**) |

### 3. Run locally

```bash
# Dry run — prints the tweet it *would* post, changes nothing:
npm run dry

# Real run — posts to X and advances state:
npm start
```

> Tip: to preview a specific release, temporarily set `.state/last_posted_version.txt` to the
> version *before* it and run `npm run dry`.

## Deploy (GitHub Actions)

The workflow in [`.github/workflows/changelog.yml`](.github/workflows/changelog.yml) runs hourly
and can also be triggered manually (**Actions → changelog-to-x → Run workflow**, with an optional
dry-run checkbox).

Add these as **repository secrets** (Settings → Secrets and variables → Actions):

- `GEMINI_API_KEY`
- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

The first scheduled run seeds the state without posting; subsequent runs post any new versions and
commit the updated state back to the repo.

## Project layout

```
src/
  changelog.ts   fetch + parse CHANGELOG.md
  state.ts       read/write state, version compare, diff
  gemini.ts      generate tweet text (Gemini)
  twitter.ts     post to X (twitter-api-v2)
  index.ts       orchestrator
.github/workflows/changelog.yml   hourly schedule
```

## License

MIT
