/**
 * Google OAuth client credentials for `rvf auth sheets`.
 *
 * ─────────────────────────────────────────────────────────────────────
 *  MAINTAINER: replace the placeholder values below before publishing.
 * ─────────────────────────────────────────────────────────────────────
 *
 * One-time setup (≈30 min, no Google review needed because we only use
 * the non-sensitive `drive.file` scope):
 *
 *   1. https://console.cloud.google.com/projectcreate
 *      Create a new project named "react-visual-feedback".
 *
 *   2. APIs & Services → Library → enable BOTH:
 *      · Google Sheets API
 *      · Google Drive API
 *
 *   3. APIs & Services → OAuth consent screen
 *      · User type: External
 *      · App name: react-visual-feedback
 *      · User support email + developer contact: yours
 *      · Scopes: add only `.../auth/drive.file` (NOT `spreadsheets`)
 *      · Publishing status: click "Publish app" → "In production"
 *        (instant, no review required for non-sensitive scopes)
 *
 *   4. APIs & Services → Credentials → Create credentials → OAuth client ID
 *      · Application type: **Desktop app**
 *      · Name: react-visual-feedback CLI
 *      · Paste the resulting client ID + secret below.
 *
 * The "client_secret" for a Desktop app is not actually a secret in
 * Google's threat model — they explicitly allow it to be embedded in
 * distributed installers. See
 * https://developers.google.com/identity/protocols/oauth2/native-app
 *
 * For local development (without modifying this file), the adapter
 * also accepts process.env.RVF_GOOGLE_CLIENT_ID / _CLIENT_SECRET.
 */
const PLACEHOLDER = '__REPLACE_BEFORE_PUBLISH__';

export const GOOGLE_OAUTH_CLIENT_ID =
  process.env.RVF_GOOGLE_CLIENT_ID || PLACEHOLDER;

export const GOOGLE_OAUTH_CLIENT_SECRET =
  process.env.RVF_GOOGLE_CLIENT_SECRET || PLACEHOLDER;

export function credentialsConfigured() {
  return GOOGLE_OAUTH_CLIENT_ID !== PLACEHOLDER &&
         GOOGLE_OAUTH_CLIENT_SECRET !== PLACEHOLDER;
}

export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
