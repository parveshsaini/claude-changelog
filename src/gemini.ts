/**
 * Turns a changelog entry into a concise tweet using Google Gemini.
 *
 * The result is a single post that must fit X's 280-character limit, including
 * the trailing changelog link. We ask the model to stay well under the limit and
 * defensively enforce it in code as a fallback.
 */

import { GoogleGenAI } from "@google/genai";
import type { ChangelogEntry } from "./changelog.js";

export const CHANGELOG_URL = "https://code.claude.com/docs/en/changelog";
const MODEL = "gemini-2.5-flash";
const TWEET_LIMIT = 280;

/** X counts every URL as 23 characters (t.co wrapping), regardless of length. */
const TCO_LENGTH = 23;

function buildPrompt(entry: ChangelogEntry): string {
  const bullets = entry.bullets.map((b) => `- ${b}`).join("\n");
  // Budget: 280 total − link (23) − " " − "vX.Y.Z " prefix room. Keep it tight.
  return [
    `Write a single tweet announcing Claude Code version ${entry.version}.`,
    "",
    "Changes in this release:",
    bullets,
    "",
    "Rules:",
    `- Start with "Claude Code ${entry.version} 🚀" (or a similar version-led opener).`,
    "- Summarize the most notable 1-3 changes in a natural, energetic voice.",
    "- Use 1-2 relevant emojis, no hashtags, no @mentions.",
    "- Do NOT include any URL or link (one is appended automatically).",
    "- Must be under 240 characters so a link fits. Prefer brevity.",
    "- Output ONLY the tweet text, no quotes, no preamble.",
  ].join("\n");
}

/** Removes surrounding quotes/backticks and collapses whitespace the model may add. */
function cleanText(text: string): string {
  return text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

/**
 * Truncates the summary so that `summary + "\n" + link` fits within 280 chars,
 * where the link counts as 23. Adds an ellipsis when it has to cut.
 */
function fitToLimit(summary: string): string {
  const budget = TWEET_LIMIT - TCO_LENGTH - 1; // 1 for the newline before link
  if (summary.length <= budget) return summary;
  return summary.slice(0, budget - 1).trimEnd() + "…";
}

/** Generates the final tweet text (summary + changelog link) for an entry. */
export async function generateTweet(
  entry: ChangelogEntry,
  apiKey: string = process.env.GEMINI_API_KEY ?? "",
): Promise<string> {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(entry),
  });

  const raw = response.text;
  if (!raw || raw.trim().length === 0) {
    throw new Error(`Gemini returned empty text for version ${entry.version}`);
  }

  const summary = fitToLimit(cleanText(raw));
  return `${summary}\n${CHANGELOG_URL}`;
}
