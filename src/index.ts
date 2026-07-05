/**
 * Entry point: check the Claude Code changelog and post any new versions to X.
 *
 * Flow:
 *   1. Fetch + parse CHANGELOG.md.
 *   2. Read the last-posted version from state.
 *   3. First run (no state) → seed with the latest version, post nothing.
 *   4. Otherwise, for each newer version (oldest → newest): generate a tweet,
 *      post it (unless DRY_RUN), and advance state.
 *
 * Env:
 *   DRY_RUN=true  → print tweets instead of posting; do not advance state.
 *   GEMINI_API_KEY, X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */

import "dotenv/config";
import { getChangelogEntries } from "./changelog.js";
import { readState, writeState, selectNewEntries } from "./state.js";
import { generateTweet } from "./gemini.js";
import { loadCredentials, postTweet } from "./twitter.js";

const DRY_RUN = process.env.DRY_RUN === "true";

async function main(): Promise<void> {
  const entries = await getChangelogEntries();
  if (entries.length === 0) {
    console.log("No changelog entries parsed; nothing to do.");
    return;
  }

  const latest = entries[0].version;
  const lastPosted = await readState();

  // First run: record where we are, don't flood the timeline with history.
  if (lastPosted === null) {
    console.log(`Seeding state at latest version ${latest} (no posts on first run).`);
    if (!DRY_RUN) await writeState(latest);
    return;
  }

  const newEntries = selectNewEntries(entries, lastPosted);
  if (newEntries.length === 0) {
    console.log(`Up to date (last posted ${lastPosted}). Nothing new.`);
    return;
  }

  console.log(
    `Last posted ${lastPosted}; ${newEntries.length} new version(s): ` +
      newEntries.map((e) => e.version).join(", "),
  );

  // Only load X credentials when we actually intend to post.
  const creds = DRY_RUN ? null : loadCredentials();

  for (const entry of newEntries) {
    const tweet = await generateTweet(entry);
    console.log(`\n=== ${entry.version} (${tweet.length} chars) ===\n${tweet}\n`);

    if (DRY_RUN) {
      console.log("[DRY_RUN] not posting, not advancing state.");
      continue;
    }

    const id = await postTweet(tweet, creds!);
    console.log(`Posted https://x.com/i/web/status/${id}`);
    await writeState(entry.version);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
