# example-express

Minimal Express integration of `react-visual-feedback`.

The app proxies one feedback endpoint through `withSecureDefaults` so the
flow demonstrates origin allowlist, CSRF (when cookies present), in-memory
rate limit, demo cookie-session auth, validation, and redaction — without
relying on any external service except Jira.

## Run

```bash
cd example-express
npm install
JIRA_DOMAIN=yourcompany.atlassian.net \
JIRA_EMAIL=you@example.com \
JIRA_API_TOKEN=... \
JIRA_PROJECT_KEY=BUG \
npm start
```

## Try it

```bash
# Authorized:
curl -X POST -H 'Content-Type: application/json' \
     -H 'Cookie: demo-session=ok' \
     -d '{"feedback":"hi"}' http://localhost:3001/api/feedback/jira

# Unauthorized (401):
curl -X POST -H 'Content-Type: application/json' \
     -d '{"feedback":"hi"}' http://localhost:3001/api/feedback/jira

# Validation failure (400):
curl -X POST -H 'Content-Type: application/json' \
     -H 'Cookie: demo-session=ok' \
     -d '{"feedback":"   "}' http://localhost:3001/api/feedback/jira
```

## Production

Replace `demo-session` with your real auth. For multi-instance deployments
swap the in-memory rate limiter for a Redis-backed one — pass `rateLimit`
to `withSecureDefaults`.
