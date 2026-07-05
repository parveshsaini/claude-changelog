/**
 * Fetches and parses the official Claude Code changelog.
 *
 * The docs page at https://code.claude.com/docs/en/changelog is generated from a
 * plain-markdown source, which we read directly to avoid any HTML scraping:
 *   https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md
 *
 * The format is simple:
 *   ## 2.1.201
 *   - bullet one
 *   - bullet two
 */

export const CHANGELOG_RAW_URL =
  "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md";

/** A single released version and its list of changes. */
export interface ChangelogEntry {
  version: string;
  bullets: string[];
}

/** Downloads the raw CHANGELOG.md text. */
export async function fetchChangelog(url: string = CHANGELOG_RAW_URL): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "claude-changelog-bot" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch changelog: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Parses raw changelog markdown into structured entries, preserving the file's
 * order (newest first, as published upstream).
 */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    // "## <version>" starts a new entry. The top-level "# Changelog" title has
    // one hash and is ignored by this two-hash match.
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { version: heading[1].trim(), bullets: [] };
      entries.push(current);
      continue;
    }

    // "- " or "* " bullet lines belong to the current entry.
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet && current) {
      current.bullets.push(bullet[1].trim());
    }
  }

  // Drop any heading that carried no bullets (defensive; shouldn't happen).
  return entries.filter((e) => e.bullets.length > 0);
}

/** Convenience: fetch + parse in one call. */
export async function getChangelogEntries(
  url: string = CHANGELOG_RAW_URL,
): Promise<ChangelogEntry[]> {
  return parseChangelog(await fetchChangelog(url));
}

// Allow `tsx src/changelog.ts` for a quick manual smoke test.
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  getChangelogEntries()
    .then((entries) => {
      console.log(`Parsed ${entries.length} entries. Latest 3:\n`);
      for (const e of entries.slice(0, 3)) {
        console.log(`## ${e.version} (${e.bullets.length} bullets)`);
        for (const b of e.bullets) console.log(`  - ${b}`);
        console.log();
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
