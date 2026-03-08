# Statsig Experimentation Integration Design

**Date:** 2026-03-07
**Branch:** experimentation
**Status:** Approved

## Context

The Forum project previously used LaunchDarkly for feature flags (removed in commit `b10868f`). The `flags.ts` utility is currently a no-op stub. Sentinel (an in-development SaaS experimentation platform) is partially integrated via `sentinel-reporter.ts`. This project serves as a learning sandbox for industry-standard experimentation practices that will inform the design of Sentinel.

**Goal:** Integrate Statsig as a full-stack experimentation platform (feature flags + A/B testing) using an abstraction layer that Sentinel can later replace.

## Architecture

```
React Client
  └── ExperimentHook (useFeatureFlag, useExperiment)
        └── Statsig React SDK  ← assignment + exposure logging only

Express Server
  ├── experimentContext middleware  ← builds ExperimentUser from JWT
  ├── ExperimentationService (interface)
  │     └── StatsigAdapter (implements interface)
  │           └── Statsig Server SDK  ← flag eval + exposure
  ├── Route handlers
  │     ├── OTEL instrumentation  ← source of truth for ALL business events
  │     └── ExperimentationService.logOutcome()  ← forwards goal metrics to Statsig only
  └── OTEL Collector → Prometheus / Jaeger / Grafana
```

**Key principle:** OTEL is the source of truth for all business event telemetry. Statsig receives only two categories of events:
1. **Exposures** — automatic via SDK when a flag or experiment is evaluated
2. **Outcome metrics** — explicitly forwarded via `logOutcome()` for statistical analysis

## User Assignment

Statsig uses deterministic hashing (`userID` + experiment key + per-experiment salt → MurmurHash → bucket 0–100) to assign users to control or treatment. Assignment is sticky and consistent — same user always gets the same variant for the same experiment.

- **Authenticated users:** bucketed by MongoDB `_id`
- **Anonymous users (client):** bucketed by Statsig-generated anonymous ID stored in `localStorage`; swapped for real `userID` on login via `statsig.updateUser()`
- **Anonymous users (server):** bucketed by session ID

Config is downloaded from Statsig's CDN once on SDK init, then **polled every 10 seconds** in the background. No restart required when new flags or experiments are created in the dashboard.

## ExperimentationService Interface

This is the contract that `StatsigAdapter` implements today and `SentinelAdapter` will implement in the future.

```typescript
// server/src/types/experimentation.ts
interface ExperimentUser {
  userID: string;
  email?: string;
  custom?: {
    role?: string;
    authProvider?: string;
  };
}

// server/src/services/experimentation/interface.ts
interface ExperimentationService {
  evaluateFlag(key: string, user: ExperimentUser, defaultValue: boolean): Promise<boolean>;
  getVariant(experimentKey: string, user: ExperimentUser): Promise<string>;
  logOutcome(eventName: string, user: ExperimentUser, value?: number): void;
  shutdown(): Promise<void>;
}
```

## Components

### Server-side

| Component | Location | Responsibility |
|---|---|---|
| `ExperimentUser` type | `server/src/types/experimentation.ts` | Shared user shape for flag evaluation |
| `ExperimentationService` interface | `server/src/services/experimentation/interface.ts` | Provider contract |
| `StatsigAdapter` | `server/src/services/experimentation/statsig.adapter.ts` | Implements interface using Statsig Server SDK |
| `experimentContext` middleware | `server/src/middleware/experimentContext.ts` | Replaces `ldContext.ts` — builds `ExperimentUser` from JWT, attaches to `req.experimentUser` |
| `flags.ts` | `server/src/utils/flags.ts` | Updated to delegate to `ExperimentationService` |

### Client-side

| Component | Location | Responsibility |
|---|---|---|
| `StatsigProvider` setup | `client/src/index.js` | Wraps app, initializes SDK with user from `AuthContext` |
| `useFeatureFlag` hook | `client/src/hooks/useFeatureFlag.js` | Thin wrapper over Statsig's `useFeatureGate` |
| `useExperiment` hook | `client/src/hooks/useExperiment.js` | Thin wrapper over Statsig's `useExperiment` |

## Data Flow

### Flag/Experiment Evaluation (server-side, request-time)

```
HTTP Request
  → experimentContext middleware
      → builds ExperimentUser from JWT
      → attaches to req.experimentUser
  → Route handler
      → calls ExperimentationService.evaluateFlag() or getVariant()
          → StatsigAdapter hashes userID locally (no network call)
          → returns control | treatment
      → OTEL records business event (source of truth)
      → ExperimentationService.logOutcome() forwards goal metric to Statsig
  → Response
```

### Client-side

```
App mounts
  → StatsigProvider initializes with userID from AuthContext
  → SDK fetches config from Statsig CDN (one-time + polls every 10s)

Component renders
  → useFeatureFlag('new-post-editor') → true | false
  → useExperiment('sort-order-test') → 'control' | 'treatment'
  → Statsig SDK auto-logs exposure event

User action (e.g. creates post)
  → API call → server OTEL records post_created (source of truth)
  → server calls logOutcome('post_created', user) → forwarded to Statsig
```

## Example Experiments

Two experiments to validate the integration end-to-end:

1. **Feature Flag:** `trending-posts-section` — gates a new trending posts widget on the home page. No metric tracking needed; pure on/off control.

2. **A/B Experiment:** `default-sort-order` — control sees "newest first", treatment sees "top rated first". Goal metric: `posts.views` count per session, forwarded via `logOutcome('posts.views', user)`.

## Error Handling

Statsig is **never in the critical path.** Flag evaluation failures must never break a user request.

| Scenario | Behavior |
|---|---|
| Statsig SDK fails to initialize | Log warning via Winston, service falls back to returning `defaultValue` for all calls |
| Statsig CDN unreachable at runtime | SDK serves last cached config; if no cache, returns defaults |
| `evaluateFlag` / `getVariant` throws | Caught in `StatsigAdapter`, returns `defaultValue`, logs to OTEL error counter |
| `logOutcome` fails | Fire-and-forget — never `await`, never throws, logged silently via Winston |
| Unauthenticated request hits flagged route | `experimentContext` builds anonymous `ExperimentUser` with session ID |

```typescript
async evaluateFlag(key, user, defaultValue) {
  try {
    return await statsig.checkGate(user, key);
  } catch (err) {
    logger.warn('Statsig flag evaluation failed', { key, err });
    return defaultValue;
  }
}
```

## Testing

| Layer | Approach |
|---|---|
| `StatsigAdapter` unit tests | Mock Statsig SDK; verify correct user shape passed; verify default fallback on error |
| `experimentContext` middleware | Jest + Supertest — assert `req.experimentUser` correctly built from JWT |
| Feature flag behaviour | Statsig local override mode — no network calls in CI |
| Client hooks | Mock `statsig-react` SDK in Jest; test component renders correct variant branch |
| E2E (Playwright) | Set flag overrides via Statsig local file override or test SDK |

## Environment Variables

```
STATSIG_SERVER_SECRET_KEY=     # Server SDK secret (from Statsig dashboard)
REACT_APP_STATSIG_CLIENT_KEY=  # Client SDK key (from Statsig dashboard)
```

## Future: Swapping to Sentinel

When Sentinel is ready, the migration path is:
1. Write `SentinelAdapter` implementing `ExperimentationService`
2. Replace `StatsigAdapter` with `SentinelAdapter` in the dependency injection point
3. Swap `statsig-react` for the Sentinel client SDK behind `useFeatureFlag` / `useExperiment` hooks
4. No route handler or component changes required
