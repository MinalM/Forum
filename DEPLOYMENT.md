## Deployment & Production Observability

This doc replaces and consolidates:

- `DEPLOYMENT_CHECKLIST.md`
- `QUICK_PRODUCTION_SETUP.md`
- `OTEL_PRODUCTION_DEPLOYMENT.md`
- `RENDER_DEPLOYMENT_INSTRUCTIONS.md`
- Other deployment / fix / summary markdowns

Use this as the single source of truth for deploying the forum and wiring up observability.

---

## Surfaces

- **Backend**: Render.com (`forum-server`)
- **Frontend**: (Netlify or equivalent SPA host)
- **Traces / Metrics**: typically **Grafana Cloud** (OTLP), or another OTEL backend

---

## Minimal Checklist (Happy Path)

1. **Local is green**
   - `npm test` passes
   - Local OTEL stack works (see `OBSERVABILITY.md`)
2. **Grafana Cloud account exists**
   - You have an OTLP endpoint + API token
3. **Render service configured**
   - All OTEL env vars set
4. **Deploy**
   - Push to main, Render auto‑deploys or manual redeploy
5. **Verify**
   - Health endpoint, Grafana traces

Details below.

---

## Step 1 – Grafana Cloud (OTEL backend)

If you’re using a different OTEL backend (DataDog, New Relic, self‑hosted Jaeger), adapt the endpoint and headers accordingly; the app itself only cares about OTLP.

### 1.1 Create account and stack

1. Go to `https://grafana.com` and create a (free) account.
2. Create an organization and a stack.
3. Find the **OTLP HTTP gateway** endpoint, usually:

```text
https://otlp-gateway-prod-xx.grafana.net/otlp
```

4. Create an API token and note:
   - `username` (numeric org ID)
   - `api_token`

### 1.2 Build the Authorization header

On your local machine:

```bash
USERNAME="123456"           # from Grafana
API_TOKEN="glc_xxxxx"       # from Grafana
echo -n "$USERNAME:$API_TOKEN" | base64
# → MTIzNDU2Omdsbl9xxxxx
```

You will use this value as `Authorization: Basic <base64>` in Render.

---

## Step 2 – Render.com Backend Configuration

In the Render dashboard for your `forum-server` service:

### 2.1 Core env vars (app + auth)

```bash
NODE_ENV=production
PORT=5000                # or your chosen port
MONGO_URI=...            # production MongoDB URI
JWT_SECRET=...           # strong secret

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://<your-domain>/api/users/auth/google/callback
```

For local dev callback setup details, see the quick reference at the end.

### 2.2 OTEL → Grafana Cloud

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20MTIzNDU2Omdsbl9xxxxx
OTEL_SERVICE_NAME=forum-server-prod
```

Notes:

- `%20` is a literal space; Render env UI can’t store spaces in values, so keep it URL‑encoded.
- If your backend only supports traces, leave `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` pointed at the same OTLP endpoint; OTEL SDK will send both traces and metrics.

### Statsig Experimentation

| Variable | Required | Description |
|---|---|---|
| `STATSIG_SERVER_SECRET_KEY` | Yes (if using flags) | Server SDK secret from Statsig dashboard (Settings → Keys & Environments) |
| `REACT_APP_STATSIG_CLIENT_KEY` | Yes (if using flags) | Client SDK key from Statsig dashboard (Settings → Keys & Environments) |

If these variables are not set, the ExperimentationService will not initialize and all flags will return their default values. The app continues to function normally.

---

## Step 3 – Deploy

From your local repo:

```bash
git status       # ensure clean / only intended changes
git add .
git commit -m "Deployable state with observability"
git push origin main
```

Render will auto‑deploy. To force a redeploy of the latest commit:

- Render dashboard → `forum-server` → ⋯ → **Manual Deploy / Redeploy latest commit**

This is the fix path for “old Docker image” style problems (e.g. stale JWT or OAuth code).

---

## Step 5 – Verification

After deployment:

### 4.1 Health endpoint

```bash
curl https://<your-render-app>.onrender.com/api/health
```

You should see a JSON payload with at least `status: "UP"` and a healthy DB state.

### 4.2 Render logs

In the Render UI, check logs for lines like:

- `✅ OpenTelemetry initialized`

You should **not** see:

- “Failed to export spans”
- `expiresIn should be a number of seconds or string representing a timespan`

### 4.3 Grafana

In Grafana:

- Tempo / Traces:
  - Filter by service `forum-server-prod`
  - You should see traces for hitting `/api/health`, `/api/posts`, etc.
- Prometheus / Metrics:
  - Query `forum_user_signup_total` and other `forum_*` metrics

---

## Troubleshooting

### No traces in Grafana

- Check `OTEL_EXPORTER_OTLP_ENDPOINT` is correct (exact copy/paste from Grafana).
- Confirm `OTEL_EXPORTER_OTLP_HEADERS` is URL‑encoded and includes the base64 header.
- In Render logs, search for `"export"` to see OTEL exporter errors.

If needed, temporarily remove headers and point at a public/test collector to isolate auth vs connectivity.

### No metrics in Grafana / Prometheus

- Confirm metrics are enabled and exported where your backend expects them.
- Ensure you waited long enough for:
  - export interval (≈60s)
  - backend ingestion

Locally, see `OBSERVABILITY.md` for Prometheus target debugging.

### OAuth 500s / redirect issues

- For local dev:

  ```env
  GOOGLE_CALLBACK_URL=http://localhost:2000/api/users/auth/google/callback
  ```

  And add this exact value (no trailing slash) to Google Cloud Console as an authorized redirect URI.

- For production:

  ```env
  GOOGLE_CALLBACK_URL=https://<your-domain>/api/users/auth/google/callback
  ```

- If you see 500s related to JWT expiration in production, it usually means the container is running old code; trigger a manual redeploy to rebuild the image from the latest commit.

---

## Alternatives & Variants (Short Version)

If you don’t want Grafana Cloud:

- **DataDog** – set `OTEL_EXPORTER_OTLP_ENDPOINT` and headers to DataDog’s OTLP intake URL + API key.
- **Self‑hosted Jaeger** on Render – run `jaegertracing/all-in-one:latest` as a separate service, expose OTLP and UI, and point `OTEL_EXPORTER_OTLP_ENDPOINT` at it.
The application code is structured to support OTEL; you mostly swap endpoints/keys.

---

## Reference: What Goes Where

**Grafana / OTEL backend**

- Full request traces (HTTP, Mongo, etc.)
- Business metrics (`forum_*`)
- Logs (if wired up)

Use Grafana (or your OTEL backend) to answer **“what happened technically?”**.
