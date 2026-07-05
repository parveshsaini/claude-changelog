# claude-changelog

A small bot that watches the [Claude Code changelog](https://code.claude.com/docs/en/changelog)
and posts a tweet to X whenever a new version ships.

It reads the official [`CHANGELOG.md`](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md),
detects versions it hasn't posted yet, uses Google Gemini to write a concise summary, and posts
it to X. It runs on a schedule via GitHub Actions — no server required.

> 🚧 Work in progress. Full setup instructions land with the docs commit.
