/**
 * example-express — minimal Express app demonstrating the secure feedback
 * pipeline. Run with:
 *
 *   cd example-express && npm install && npm start
 *
 * Authorized request:
 *   curl -X POST -H 'Content-Type: application/json' \
 *        -H 'Cookie: demo-session=ok' \
 *        -d '{"feedback":"hi"}' http://localhost:3001/api/feedback/jira
 *
 * Unauthorized (returns 401):
 *   curl -X POST -H 'Content-Type: application/json' \
 *        -d '{"feedback":"hi"}' http://localhost:3001/api/feedback/jira
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import {
  withSecureDefaults,
  createJiraHandler,
  FeedbackAuthError,
} from 'react-visual-feedback/server';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const secureHandler = withSecureDefaults({
  authorize: async (req) => {
    // DEMO ONLY — replace with your real auth.
    // `req` is the normalized reqLike from withSecureDefaults — see types.d.ts.
    if (req.cookies?.['demo-session'] !== 'ok') throw new FeedbackAuthError();
    return { userId: 'demo-user', projectId: 'DEMO', role: 'developer' };
  },
})(createJiraHandler({ projectKey: process.env.JIRA_PROJECT_KEY || 'BUG' }));

app.post('/api/feedback/jira', async (req, res) => {
  // withSecureDefaults returns a Web Response — translate to Express.
  const webRes = await secureHandler(req);
  res.status(webRes.status);
  webRes.headers.forEach((v, k) => res.setHeader(k, v));
  const body = await webRes.text();
  res.send(body);
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Express example listening on http://localhost:${port}`);
});
