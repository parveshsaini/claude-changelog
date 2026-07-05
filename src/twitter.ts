/**
 * Posts a tweet to X using OAuth 1.0a user-context credentials.
 *
 * Requires an X developer app with Read+Write permission and the four tokens
 * below. We use the v2 tweet endpoint via twitter-api-v2.
 */

import { TwitterApi } from "twitter-api-v2";

export interface XCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

/** Reads X credentials from the environment, throwing if any are missing. */
export function loadCredentials(env: NodeJS.ProcessEnv = process.env): XCredentials {
  const creds: XCredentials = {
    appKey: env.X_API_KEY ?? "",
    appSecret: env.X_API_SECRET ?? "",
    accessToken: env.X_ACCESS_TOKEN ?? "",
    accessSecret: env.X_ACCESS_TOKEN_SECRET ?? "",
  };
  const missing = Object.entries(creds)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`Missing X credentials: ${missing.join(", ")}`);
  }
  return creds;
}

/** Posts `text` to X and returns the new tweet's id. */
export async function postTweet(text: string, creds: XCredentials): Promise<string> {
  const client = new TwitterApi({
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
  const { data } = await client.v2.tweet(text);
  return data.id;
}
