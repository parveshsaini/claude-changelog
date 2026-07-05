/**
 * Tracks which changelog version was last posted so we never post twice.
 *
 * State is a single version string in `.state/last_posted_version.txt`, committed
 * back to the repo by the GitHub Action after each run.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { ChangelogEntry } from "./changelog.js";

export const STATE_FILE = ".state/last_posted_version.txt";

/** Reads the last-posted version, or null if the bot has never run. */
export async function readState(file: string = STATE_FILE): Promise<string | null> {
  try {
    const raw = await readFile(file, "utf8");
    const version = raw.trim();
    return version.length > 0 ? version : null;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Persists the last-posted version, creating the `.state` dir if needed. */
export async function writeState(version: string, file: string = STATE_FILE): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${version}\n`, "utf8");
}

/**
 * Compares two dotted numeric versions (e.g. "2.1.201" vs "2.1.99").
 * Returns >0 if a is newer, <0 if older, 0 if equal. Compares segment by
 * segment numerically so 201 correctly sorts above 99.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/**
 * Given all changelog entries (newest-first, as parsed) and the last-posted
 * version, returns the entries that still need to be posted, ordered
 * oldest-first so a backlog is tweeted in chronological order.
 *
 * When `lastPosted` is null (first ever run) this returns an empty array — the
 * caller should treat that as the seed case and simply record the latest
 * version without posting the entire history.
 */
export function selectNewEntries(
  entries: ChangelogEntry[],
  lastPosted: string | null,
): ChangelogEntry[] {
  if (lastPosted === null) return [];
  const newer = entries.filter((e) => compareVersions(e.version, lastPosted) > 0);
  // `entries` is newest-first; reverse to post oldest → newest.
  return newer.reverse();
}
