/**
 * Google Sheets adapter — OAuth loopback flow with auto-spreadsheet.
 *
 * Unlike paste-flow adapters, this one drives an end-to-end OAuth dance:
 *   1. Generate PKCE
 *   2. Start a loopback HTTP server on a random port
 *   3. Open Google's consent screen in the browser
 *   4. Catch the redirect, exchange the code for a refresh token
 *   5. Create a new Sheets spreadsheet via Drive API (drive.file scope)
 *   6. Write GOOGLE_OAUTH_REFRESH_TOKEN + client creds + spreadsheet ID
 *
 * The maintainer must register a Desktop-app OAuth client one time —
 * see bin/lib/auth/credentials/google.mjs for instructions.
 *
 * User time target: ~130s (Phase 3).
 */
import { openBrowser } from '../helpers.mjs';
import {
  generatePkce, findFreePort, buildAuthUrl, startLoopbackServer,
  exchangeCodeForTokens, createSpreadsheet,
} from '../google-oauth.mjs';
import {
  GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_DRIVE_FILE_SCOPE, credentialsConfigured,
} from '../credentials/google.mjs';
import { randomBytes } from 'node:crypto';

export default {
  id: 'sheets',
  headline: 'Connect Google Sheets — feedback appended to a sheet you own.',
  envFile: { defaultsTo: '.env.local' },
  flow: 'oauth-loopback',

  checklist: [
    'We open Google\'s consent screen in your browser',
    'Pick the Google account that should own the new spreadsheet',
    'Click "Allow" to grant per-file access (drive.file scope only)',
    'We auto-create a new "react-visual-feedback" spreadsheet and save everything',
  ],

  async prerequisites() { return {}; },

  /**
   * Drive the full OAuth dance. Returns { ok, refreshToken, spreadsheet }
   * on success.
   */
  async runOAuth({ clack, flags }) {
    if (!credentialsConfigured()) {
      clack.log.error('This build is missing the Google OAuth client credentials.');
      clack.note(
        [
          'The maintainer needs to register a Desktop-app OAuth client once.',
          'See bin/lib/auth/credentials/google.mjs for the 4-step setup.',
          '',
          'For local testing, you can also set:',
          '  RVF_GOOGLE_CLIENT_ID=your-client-id',
          '  RVF_GOOGLE_CLIENT_SECRET=your-client-secret',
        ].join('\n'),
        'Setup required'
      );
      return { ok: false, message: 'Google OAuth credentials not configured.' };
    }

    const port = await findFreePort();
    const redirectUri = `http://127.0.0.1:${port}/callback`;
    const { verifier, challenge } = generatePkce();
    const state = randomBytes(16).toString('hex');

    const authUrl = buildAuthUrl({
      clientId: GOOGLE_OAUTH_CLIENT_ID,
      redirectUri,
      challenge,
      scopes: [GOOGLE_DRIVE_FILE_SCOPE],
      state,
    });

    const loopback = startLoopbackServer({ port, state });
    const opened = openBrowser(authUrl, { skip: flags.noOpen });

    if (opened) {
      clack.log.info(`Opened Google consent in your browser.`);
    } else {
      clack.log.info(`Open this URL: ${authUrl}`);
    }

    const s = clack.spinner();
    s.start('Waiting for you to finish in the browser…');

    let code;
    try {
      code = await loopback.codePromise;
    } catch (e) {
      s.stop('Sign-in failed');
      await loopback.close();
      return { ok: false, message: humanizeOAuthError(e) };
    }
    await loopback.close();
    s.stop('Authorization received');

    const xs = clack.spinner();
    xs.start('Exchanging for a refresh token…');
    let tokens;
    try {
      tokens = await exchangeCodeForTokens({
        clientId: GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
        code,
        verifier,
        redirectUri,
      });
      xs.stop('Got refresh token');
    } catch (e) {
      xs.stop('Token exchange failed');
      return { ok: false, message: e.message };
    }

    const cs = clack.spinner();
    cs.start('Creating spreadsheet…');
    let spreadsheet;
    try {
      spreadsheet = await createSpreadsheet({ accessToken: tokens.access_token });
      cs.stop(`Created: ${spreadsheet.name}`);
    } catch (e) {
      cs.stop('Spreadsheet create failed');
      return { ok: false, message: e.message };
    }

    clack.log.success(`Spreadsheet: ${spreadsheet.url}`);

    return {
      ok: true,
      refreshToken: tokens.refresh_token,
      spreadsheet,
    };
  },

  envEntries({ refreshToken, spreadsheet }) {
    return {
      GOOGLE_CLIENT_ID: GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: GOOGLE_OAUTH_CLIENT_SECRET,
      GOOGLE_OAUTH_REFRESH_TOKEN: refreshToken,
      GOOGLE_SPREADSHEET_ID: spreadsheet.id,
    };
  },

  successHint: 'Restart your dev server, press Alt+A, and submit feedback to land in sheets.',
};

function humanizeOAuthError(e) {
  const msg = e?.message || String(e);
  if (msg === 'access_denied') return 'You declined access. Re-run `rvf auth sheets` to try again.';
  if (msg === 'state_mismatch') return 'State mismatch — possible CSRF. Re-run `rvf auth sheets`.';
  return msg;
}
