/**
 * example-express — minimal Express server using the connect API.
 *
 * Same `feedback.config.js` is consumed by both the React app (browser)
 * and this Express server. One catch-all route dispatches to every
 * destination in the config.
 *
 * Run:
 *
 *   cd example-express && npm install && npm start
 *
 * Submit feedback (dev mode — devSessionAuth lets you through):
 *
 *   curl -X POST -H 'Content-Type: application/json' \
 *        -d '{"feedback":"the pay button is broken"}' \
 *        http://localhost:3001/api/feedback/github
 *
 * In production (NODE_ENV=production), devSessionAuth() refuses and
 * tells you to swap in real auth.
 */

import express from 'express';
import {
  createFeedbackHandler,
  devSessionAuth,
} from 'react-visual-feedback/server';
import feedbackConfig from './feedback.config.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const handler = createFeedbackHandler({
  ...feedbackConfig,
  authorize: devSessionAuth(),
  // For production, swap to:
  //   authorize: devSessionAuth({ secret: process.env.FEEDBACK_SECRET })
  // OR your own session check (NextAuth / Clerk / lucia / custom).
});

// Catch-all — handles every destination in feedback.config.js
app.post('/api/feedback/*', async (req, res) => {
  const webRes = await handler(req);
  if (webRes instanceof Response) {
    res.status(webRes.status);
    webRes.headers.forEach((v, k) => res.setHeader(k, v));
    res.send(await webRes.text());
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Express feedback server listening on http://localhost:${port}`);
  console.log(`  POST /api/feedback/*   — feedback dispatch`);
});
