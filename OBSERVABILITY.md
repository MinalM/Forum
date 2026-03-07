## Observability & Metrics

This project is fully instrumented with OpenTelemetry for **traces, metrics, and logs**, plus optional LaunchDarkly observability. This doc replaces:

- `METRICS_README.md`
- `QUICK_START_METRICS.md`
- `LOCAL_METRICS_SETUP.md`
- `LOCAL_OBSERVABILITY_ARCHITECTURE.md`
- `DOCUMENTATION_INDEX.md`
- `server/README_OBSERVABILITY.md`
- `server/METRICS_DOCUMENTATION.md`
- OTEL/LD/JAEGER-related *.md helpers

If you only remember one thing: **Jaeger is for traces; Prometheus is for metrics.**

---

## Local Stack – 3 Commands

### 1. Start the observability stack

```bash
# From repo root
docker-compose -f docker-compose.observability.yml up -d

# Check status
docker-compose -f docker-compose.observability.yml ps
```

You should see `otel-collector`, `prometheus`, `jaeger`, and `grafana` all `Up`.

### 2. Start the app with OTEL envs

Make sure these are set in your local `.env` (or shell):

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_SERVICE_NAME=forum-server-local
```

Then run:

```bash
cd server
npm run dev
```

### 3. Hit the app and verify metrics

Do a few things in the UI:

- Sign up / log in (regular and Google OAuth)
- Create posts and comments
- View posts

Then:

- **Prometheus**: `http://localhost:9090` → query `forum_user_signup_total`
- **Grafana**: `http://localhost:3001` → Explore → Prometheus → `forum_user_signup_total`
- **Jaeger**: `http://localhost:16686` → service `forum-server-local`

If those work, local observability is healthy.

---

## Architecture (Local)

High‑level data flow:

```text
Your App (localhost:5000)
  └─ OpenTelemetry SDK
       - Generates metrics (forum_*)
       - Generates traces (HTTP, Mongo, custom spans)
       - Exports every ~60s to...

OTEL Collector (localhost:4318)
  - Receives OTLP /v1/traces + /v1/metrics
  - Trace pipeline  → Jaeger
  - Metrics pipeline → Prometheus

Jaeger (localhost:16686)
  - Traces UI only (no metrics)

Prometheus (localhost:9090)
  - Time‑series metrics

Grafana (localhost:3001)
  - Datasources: Prometheus + Jaeger
  - Dashboards, Alerts, Explore
```

Key ports:

| Service           | URL                           | Purpose                    |
|-------------------|-------------------------------|----------------------------|
| App               | `http://localhost:5000`       | Forum API                  |
| OTEL Collector    | `http://localhost:4318`       | OTLP HTTP endpoint         |
| OTEL Collector    | `http://localhost:8888/metrics` | Collector self‑metrics  |
| OTEL Collector    | `http://localhost:8889/metrics` | Prometheus scrape target |
| Prometheus        | `http://localhost:9090`       | Metrics UI                 |
| Jaeger            | `http://localhost:16686`      | Traces UI                  |
| Grafana           | `http://localhost:3001`       | Dashboards / Explore       |

---

## Metric Reference

All business metrics are exported with a `forum_` prefix. The most important counters:

### User lifecycle

- `forum_user_signup_total`  
  - When: successful registration  
  - Labels: `auth_method`, `role`

- `forum_user_login_total`  
  - When: successful email/password login  
  - Labels: `auth_method`, `role`

- `forum_user_login_oauth_total`  
  - When: successful Google OAuth login  
  - Labels: `auth_method`, `provider`, `role`

- `forum_user_sessions_total`  
  - When: JWT issued (signup, login, OAuth)  
  - Labels: `role`

### Content & engagement

- `forum_posts_created_total`  
  - When: post created  
  - Labels: `category`, `user_role`

- `forum_comments_created_total`  
  - When: comment or reply created  
  - Labels: `is_reply`, `user_role`, `post_id`, `parent_comment_id`

- `forum_posts_views_total`  
  - When: post fetched via `GET /api/posts/:id`  
  - Labels: `category`, `post_id`

Example PromQL:

```promql
# Total signups
sum(forum_user_signup_total)

# Signups by role
sum by (role) (forum_user_signup_total)

# Login rate per minute
rate(forum_user_login_total[5m])

# Posts by category
sum by (category) (forum_posts_created_total)

# Most viewed posts
topk(10, forum_posts_views_total)
```

---

## URLs & Quick Queries

### Prometheus

- UI: `http://localhost:9090`
- Good starter queries:

```promql
forum_user_signup_total
forum_user_login_total
forum_posts_created_total
forum_comments_created_total
```

### Grafana

- UI: `http://localhost:3001`
- Login: `admin` / `admin` (or anonymous)
- Use **Explore → Prometheus** with any `forum_*` metric.

### Jaeger

- UI: `http://localhost:16686`
- Service: `forum-server-local`
- Use to debug request timelines, DB calls, and LD flag spans.

---

## Troubleshooting (Local)

**No metrics in Prometheus?**

1. Check collector logs:

```bash
docker-compose -f docker-compose.observability.yml logs otel-collector
```

2. Check targets:

- `http://localhost:9090/targets` → `otel-collector` should be `UP`.

3. Hit the app and wait ~60–90 seconds (export interval + scrape interval).

**No traces in Jaeger?**

- Confirm `OTEL_EXPORTER_OTLP_ENDPOINT` is `http://localhost:4318/v1/traces`.
- Hit `http://localhost:5000/api/otel-diagnostics` and ensure exporterReachable is `YES`.

**Port conflicts?**

- Adjust ports in `docker-compose.observability.yml` (e.g. change Grafana to `3002:3000`).

---

## Production Observability (High Level)

Full production details live in `DEPLOYMENT.md`. TL;DR:

- Backend exports OTEL data over HTTPS to a managed backend (typically **Grafana Cloud** via OTLP gateway).
- Feature flag analytics and LaunchDarkly‑specific observability go to **LaunchDarkly** directly.
- You can:
  - Run **OTEL only** (Grafana/DataDog/New Relic/Self‑hosted Jaeger)
  - Run **LaunchDarkly Observability only**
  - Or run **both** (recommended)

Key production env vars (Render):

```bash
# OTEL → Grafana (example)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-prod-xx.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20<base64-username:token>
OTEL_SERVICE_NAME=forum-server-prod

# LaunchDarkly
LD_SDK_KEY=sdk-xxxxx
LD_LOG_LEVEL=info
```

For Grafana/DataDog/self‑hosted Jaeger options, LD observability SDK, and end‑to‑end checklists, see `DEPLOYMENT.md`.

