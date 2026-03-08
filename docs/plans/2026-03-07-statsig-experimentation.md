# Statsig Experimentation Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Statsig as a full-stack experimentation platform (feature flags + A/B testing) behind an abstraction layer that Sentinel can later replace.

**Architecture:** An `ExperimentationService` interface sits between the app and Statsig. A `StatsigAdapter` implements this interface using the Statsig Server SDK. On the client, thin hooks wrap the Statsig React SDK. OTEL remains the source of truth for all business events; Statsig only receives exposures (automatic) and explicit outcome metrics forwarded via `logOutcome()`.

**Tech Stack:** `statsig-node` (server SDK), `statsig-react` (client SDK), TypeScript (server), React 18 (client), Jest + Supertest (server tests), React Testing Library (client tests).

---

## Pre-requisites

Before starting:
1. Sign up at [statsig.com](https://statsig.com) — free tier is sufficient
2. Create a new project called "Forum"
3. From **Settings → Keys & Environments**, copy:
   - **Server Secret Key** (`secret-...`)
   - **Client API Key** (`client-...`)
4. Add to `server/.env`:
   ```
   STATSIG_SERVER_SECRET_KEY=secret-your-key-here
   ```
5. Add to `client/.env` (create if it doesn't exist):
   ```
   REACT_APP_STATSIG_CLIENT_KEY=client-your-key-here
   ```

---

## Task 1: Install SDKs

**Files:**
- Modify: `server/package.json`
- Modify: `client/package.json`

**Step 1: Install server SDK**

```bash
cd server && npm install statsig-node
```

Expected output: `added 1 package` (or similar), no errors.

**Step 2: Install client SDK**

```bash
cd ../client && npm install statsig-react
```

Expected output: `added N packages`, no errors.

**Step 3: Verify installations**

```bash
cd ../server && node -e "require('statsig-node'); console.log('server SDK ok')"
cd ../client && node -e "require('statsig-react'); console.log('client SDK ok')"
```

Expected: both print `ok`.

**Step 4: Commit**

```bash
cd ..
git add server/package.json server/package-lock.json client/package.json client/package-lock.json
git commit -m "feat: install statsig-node and statsig-react SDKs"
```

---

## Task 2: Define Server Types and Interface

**Files:**
- Create: `server/src/types/experimentation.ts`
- Create: `server/src/services/experimentation/interface.ts`

**Step 1: Create the shared types file**

Create `server/src/types/experimentation.ts`:

```typescript
export interface ExperimentUser {
  userID: string;
  email?: string;
  custom?: {
    role?: string;
    authProvider?: string;
  };
}
```

**Step 2: Create the interface file**

Create `server/src/services/experimentation/interface.ts`:

```typescript
import { ExperimentUser } from '../../types/experimentation';

export interface ExperimentationService {
  evaluateFlag(key: string, user: ExperimentUser, defaultValue: boolean): Promise<boolean>;
  getVariant(experimentKey: string, user: ExperimentUser): Promise<string>;
  logOutcome(eventName: string, user: ExperimentUser, value?: number): void;
  shutdown(): Promise<void>;
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add server/src/types/experimentation.ts server/src/services/experimentation/interface.ts
git commit -m "feat: add ExperimentationService interface and ExperimentUser type"
```

---

## Task 3: Implement StatsigAdapter

**Files:**
- Create: `server/src/services/experimentation/statsig.adapter.ts`

**Step 1: Write the failing test**

Create `server/src/services/experimentation/statsig.adapter.test.ts`:

```typescript
import { StatsigAdapter } from './statsig.adapter';

// Mock the entire statsig-node module
jest.mock('statsig-node', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  checkGate: jest.fn(),
  getExperiment: jest.fn(),
  logEvent: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

import statsig from 'statsig-node';

const mockUser = { userID: 'user-123', email: 'test@example.com' };

describe('StatsigAdapter', () => {
  let adapter: StatsigAdapter;

  beforeEach(async () => {
    jest.clearAllMocks();
    adapter = new StatsigAdapter('fake-secret-key');
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.shutdown();
  });

  describe('evaluateFlag', () => {
    it('returns true when gate is enabled', async () => {
      (statsig.checkGate as jest.Mock).mockResolvedValue(true);
      const result = await adapter.evaluateFlag('test-flag', mockUser, false);
      expect(result).toBe(true);
    });

    it('returns defaultValue when statsig throws', async () => {
      (statsig.checkGate as jest.Mock).mockRejectedValue(new Error('network error'));
      const result = await adapter.evaluateFlag('test-flag', mockUser, false);
      expect(result).toBe(false);
    });
  });

  describe('getVariant', () => {
    it('returns experiment group name', async () => {
      (statsig.getExperiment as jest.Mock).mockResolvedValue({
        get: () => 'treatment',
      });
      const result = await adapter.getVariant('sort-order-test', mockUser);
      expect(result).toBe('treatment');
    });

    it('returns control when statsig throws', async () => {
      (statsig.getExperiment as jest.Mock).mockRejectedValue(new Error('error'));
      const result = await adapter.getVariant('sort-order-test', mockUser);
      expect(result).toBe('control');
    });
  });

  describe('logOutcome', () => {
    it('calls statsig.logEvent without throwing', () => {
      (statsig.logEvent as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
      // Should NOT throw even if statsig fails
      expect(() => adapter.logOutcome('post_created', mockUser)).not.toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd server && npx jest src/services/experimentation/statsig.adapter.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './statsig.adapter'`

**Step 3: Implement the adapter**

Create `server/src/services/experimentation/statsig.adapter.ts`:

```typescript
import statsig from 'statsig-node';
import { ExperimentationService } from './interface';
import { ExperimentUser } from '../../types/experimentation';
import { logger } from '../../utils/logger';

export class StatsigAdapter implements ExperimentationService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async initialize(): Promise<void> {
    try {
      await statsig.initialize(this.secretKey);
      logger.info('Statsig initialized');
    } catch (err) {
      logger.warn('Statsig initialization failed — flags will return defaults', { err });
    }
  }

  async evaluateFlag(key: string, user: ExperimentUser, defaultValue: boolean): Promise<boolean> {
    try {
      return await statsig.checkGate(user, key);
    } catch (err) {
      logger.warn('Statsig evaluateFlag failed', { key, err });
      return defaultValue;
    }
  }

  async getVariant(experimentKey: string, user: ExperimentUser): Promise<string> {
    try {
      const experiment = await statsig.getExperiment(user, experimentKey);
      return experiment.get<string>('variant', 'control');
    } catch (err) {
      logger.warn('Statsig getVariant failed', { experimentKey, err });
      return 'control';
    }
  }

  logOutcome(eventName: string, user: ExperimentUser, value?: number): void {
    try {
      statsig.logEvent(user, eventName, value);
    } catch (err) {
      logger.warn('Statsig logOutcome failed', { eventName, err });
    }
  }

  async shutdown(): Promise<void> {
    try {
      await statsig.shutdown();
    } catch (err) {
      logger.warn('Statsig shutdown failed', { err });
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest src/services/experimentation/statsig.adapter.test.ts --no-coverage
```

Expected: PASS — all 5 tests green.

**Step 5: Commit**

```bash
git add server/src/services/experimentation/
git commit -m "feat: implement StatsigAdapter with fallback error handling"
```

---

## Task 4: Wire StatsigAdapter into Server Startup

**Files:**
- Create: `server/src/services/experimentation/index.ts`
- Modify: `server/src/server.ts`

**Step 1: Create the singleton export**

Create `server/src/services/experimentation/index.ts`:

```typescript
import { StatsigAdapter } from './statsig.adapter';
import { ExperimentationService } from './interface';

let _service: ExperimentationService | null = null;

export const getExperimentationService = (): ExperimentationService => {
  if (!_service) {
    throw new Error('ExperimentationService not initialized. Call initExperimentation() first.');
  }
  return _service;
};

export const initExperimentation = async (): Promise<void> => {
  const secretKey = process.env.STATSIG_SERVER_SECRET_KEY;
  if (!secretKey) {
    // No key — service stays null, evaluateFlag will never be called
    return;
  }
  const adapter = new StatsigAdapter(secretKey);
  await adapter.initialize();
  _service = adapter;
};

export const shutdownExperimentation = async (): Promise<void> => {
  if (_service) {
    await _service.shutdown();
    _service = null;
  }
};
```

**Step 2: Initialize in server.ts**

In `server/src/server.ts`, find the `startServer` function and add initialization after MongoDB connects:

```typescript
// Add this import near the top with other imports
import { initExperimentation, shutdownExperimentation } from './services/experimentation';
```

In the `startServer` function, after `logger.info('MongoDB Connected')`:

```typescript
await initExperimentation();
logger.info('Experimentation service initialized');
```

Also add graceful shutdown — after the `app.listen` call:

```typescript
process.on('SIGTERM', async () => {
  await shutdownExperimentation();
  process.exit(0);
});
```

**Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add server/src/services/experimentation/index.ts server/src/server.ts
git commit -m "feat: wire StatsigAdapter into server startup and shutdown"
```

---

## Task 5: Update experimentContext Middleware

**Files:**
- Create: `server/src/middleware/experimentContext.ts`
- Modify: `server/src/server.ts` (swap `ldContextMiddleware` for `experimentContextMiddleware`)

**Step 1: Write the failing test**

Create `server/src/middleware/experimentContext.test.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { experimentContextMiddleware } from './experimentContext';

const mockNext: NextFunction = jest.fn();
const mockRes = {} as Response;

describe('experimentContextMiddleware', () => {
  it('builds ExperimentUser from authenticated user', () => {
    const req = {
      user: { id: 'abc123', email: 'alice@example.com', role: 'user', authProvider: 'local' },
    } as any;

    experimentContextMiddleware(req, mockRes, mockNext);

    expect(req.experimentUser).toEqual({
      userID: 'abc123',
      email: 'alice@example.com',
      custom: { role: 'user', authProvider: 'local' },
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('builds anonymous ExperimentUser when no user on request', () => {
    const req = { user: undefined, sessionID: 'sess-xyz' } as any;

    experimentContextMiddleware(req, mockRes, mockNext);

    expect(req.experimentUser.userID).toBe('anon-sess-xyz');
    expect(mockNext).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd server && npx jest src/middleware/experimentContext.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './experimentContext'`

**Step 3: Implement the middleware**

Create `server/src/middleware/experimentContext.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { ExperimentUser } from '../types/experimentation';

export const experimentContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  const experimentUser: ExperimentUser = user
    ? {
        userID: user.id.toString(),
        email: user.email,
        custom: {
          role: user.role,
          authProvider: user.authProvider,
        },
      }
    : {
        userID: `anon-${(req as any).sessionID || 'unknown'}`,
      };

  (req as any).experimentUser = experimentUser;

  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('experiment.user.id', experimentUser.userID);
  }

  next();
};
```

**Step 4: Run test to verify it passes**

```bash
npx jest src/middleware/experimentContext.test.ts --no-coverage
```

Expected: PASS

**Step 5: Swap middleware in server.ts**

In `server/src/server.ts`, replace:

```typescript
import { ldContextMiddleware } from './middleware/ldContext';
app.use(ldContextMiddleware);
```

With:

```typescript
import { experimentContextMiddleware } from './middleware/experimentContext';
app.use(experimentContextMiddleware);
```

**Step 6: Delete the old middleware file**

```bash
rm server/src/middleware/ldContext.ts
```

**Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 8: Commit**

```bash
git add server/src/middleware/experimentContext.ts server/src/middleware/experimentContext.test.ts server/src/server.ts
git rm server/src/middleware/ldContext.ts
git commit -m "feat: replace ldContextMiddleware with experimentContextMiddleware"
```

---

## Task 6: Update flags.ts to Use ExperimentationService

**Files:**
- Modify: `server/src/utils/flags.ts`

**Step 1: Update flags.ts**

Replace the entire contents of `server/src/utils/flags.ts`:

```typescript
import { getExperimentationService } from '../services/experimentation';
import { ExperimentUser } from '../types/experimentation';
import { logger } from './logger';

export const evaluateFlag = async (
  flagKey: string,
  defaultValue: boolean,
  user: ExperimentUser
): Promise<boolean> => {
  try {
    const service = getExperimentationService();
    return await service.evaluateFlag(flagKey, user, defaultValue);
  } catch (err) {
    logger.warn('evaluateFlag failed — returning default', { flagKey, err });
    return defaultValue;
  }
};
```

**Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add server/src/utils/flags.ts
git commit -m "feat: wire flags.ts to ExperimentationService"
```

---

## Task 7: Create Statsig Feature Flag and Experiment in Dashboard

Before adding client code, set up the Statsig objects you'll reference:

**Step 1: Create the feature gate**
1. Go to [app.statsig.com](https://app.statsig.com) → your Forum project
2. Navigate to **Feature Gates** → **Create New**
3. Name: `trending_posts_section`
4. Description: `Shows trending posts widget on home page`
5. Leave targeting at 0% (off by default) → **Save**

**Step 2: Create the experiment**
1. Navigate to **Experiments** → **Create New**
2. Name: `default_sort_order`
3. Description: `Test whether top-rated sort increases post views`
4. Groups: `control` (50%) and `treatment` (50%)
5. Add a parameter to each group called `variant`:
   - control → `"control"`
   - treatment → `"treatment"`
6. Add metric: `posts_views` (custom event)
7. **Save** (do not start yet — you'll start it after client integration)

---

## Task 8: Set Up Client-Side Statsig Provider

**Files:**
- Modify: `client/src/index.js`

**Step 1: Update index.js to wrap app with StatsigProvider**

In `client/src/index.js`, add the import at the top:

```javascript
import { StatsigProvider } from 'statsig-react';
```

Replace the current `ReactDOM.render(...)` call with:

```javascript
const StatsigWrapper = () => {
  const { user } = React.useContext(React.createContext(null)) || {};
  return (
    <StatsigProvider
      sdkKey={process.env.REACT_APP_STATSIG_CLIENT_KEY || ''}
      user={{ userID: 'anonymous' }}
      waitForInitialization={false}
    >
      <App />
    </StatsigProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <AlertProvider>
            <StatsigProvider
              sdkKey={process.env.REACT_APP_STATSIG_CLIENT_KEY || ''}
              user={{ userID: 'anonymous' }}
              waitForInitialization={false}
            >
              <App />
            </StatsigProvider>
          </AlertProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
```

> Note: `waitForInitialization={false}` means the app renders immediately with defaults while Statsig loads config in the background — no blocking spinner.

**Step 2: Verify app starts without errors**

```bash
cd client && npm start
```

Open browser console — no Statsig errors expected (it will warn about missing SDK key if `.env` isn't set, which is fine for now).

**Step 3: Commit**

```bash
git add client/src/index.js
git commit -m "feat: wrap React app with StatsigProvider"
```

---

## Task 9: Sync Statsig User on Login/Logout

The `StatsigProvider` starts with `userID: 'anonymous'`. When a user logs in, we need to update Statsig with the real user ID.

**Files:**
- Create: `client/src/hooks/useStatsigUser.js`
- Modify: `client/src/context/AuthContext.js`

**Step 1: Create the hook**

Create `client/src/hooks/useStatsigUser.js`:

```javascript
import { useEffect } from 'react';
import { useStatsigClient } from 'statsig-react';
import { useAuth } from '../context/AuthContext';

export const useStatsigUser = () => {
  const { user } = useAuth();
  const { client } = useStatsigClient();

  useEffect(() => {
    if (!client) return;

    if (user) {
      client.updateUser({
        userID: user._id,
        email: user.email,
        custom: {
          role: user.role,
          authProvider: user.authProvider,
        },
      });
    } else {
      client.updateUser({ userID: 'anonymous' });
    }
  }, [user, client]);
};
```

**Step 2: Use the hook in App.js**

In `client/src/App.js`, add the import:

```javascript
import { useStatsigUser } from './hooks/useStatsigUser';
```

Inside the `App` component (at the top, before the return):

```javascript
useStatsigUser();
```

**Step 3: Verify no console errors on login**

```bash
npm start
```

Log in with a test account. Check browser console — Statsig should update user silently.

**Step 4: Commit**

```bash
git add client/src/hooks/useStatsigUser.js client/src/App.js
git commit -m "feat: sync Statsig user on auth state change"
```

---

## Task 10: Create Client Abstraction Hooks

**Files:**
- Create: `client/src/hooks/useFeatureFlag.js`
- Create: `client/src/hooks/useExperiment.js`

**Step 1: Create useFeatureFlag**

Create `client/src/hooks/useFeatureFlag.js`:

```javascript
import { useFeatureGate } from 'statsig-react';

/**
 * Returns true if the named feature gate is enabled for the current user.
 * Falls back to defaultValue if Statsig is unavailable.
 */
export const useFeatureFlag = (flagKey, defaultValue = false) => {
  try {
    const gate = useFeatureGate(flagKey);
    return gate.value;
  } catch {
    return defaultValue;
  }
};
```

**Step 2: Create useExperiment**

Create `client/src/hooks/useExperiment.js`:

```javascript
import { useExperiment as useStatsigExperiment } from 'statsig-react';

/**
 * Returns the variant string for the named experiment.
 * Falls back to 'control' if Statsig is unavailable.
 */
export const useExperiment = (experimentKey) => {
  try {
    const experiment = useStatsigExperiment(experimentKey);
    return experiment.get('variant', 'control');
  } catch {
    return 'control';
  }
};
```

**Step 3: Commit**

```bash
git add client/src/hooks/useFeatureFlag.js client/src/hooks/useExperiment.js
git commit -m "feat: add useFeatureFlag and useExperiment abstraction hooks"
```

---

## Task 11: Implement Trending Posts Feature Flag

This validates the `trending_posts_section` gate end-to-end.

**Files:**
- Modify: `client/src/pages/Home.js`
- Create: `client/src/components/TrendingPosts.js`

**Step 1: Create TrendingPosts component**

Create `client/src/components/TrendingPosts.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const TrendingPosts = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    axios.get('/api/posts?sort=-views&limit=3')
      .then(res => setPosts(res.data.data || []))
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="trending-posts">
      <h3>Trending</h3>
      <ul>
        {posts.map(post => (
          <li key={post._id}>
            <Link to={`/posts/${post._id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendingPosts;
```

**Step 2: Add flag check to Home.js**

In `client/src/pages/Home.js`, add these imports:

```javascript
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import TrendingPosts from '../components/TrendingPosts';
```

At the top of the `Home` component (before return):

```javascript
const showTrending = useFeatureFlag('trending_posts_section', false);
```

Inside the JSX, add before or after the posts list:

```javascript
{showTrending && <TrendingPosts />}
```

**Step 3: Test manually**

1. With flag OFF (default): TrendingPosts widget should not appear
2. In Statsig dashboard → Feature Gates → `trending_posts_section` → set to 100% → Save
3. Hard refresh browser — widget should appear
4. Set back to 0% — widget disappears

**Step 4: Commit**

```bash
git add client/src/components/TrendingPosts.js client/src/pages/Home.js
git commit -m "feat: gate trending posts widget behind trending_posts_section feature flag"
```

---

## Task 12: Implement Sort Order A/B Experiment

This validates the `default_sort_order` experiment end-to-end, including server-side outcome tracking.

**Files:**
- Modify: `client/src/pages/Home.js`
- Modify: `server/src/routes/posts.js` (add `logOutcome` call on post view)

**Step 1: Add experiment variant to Home.js**

In `client/src/pages/Home.js`, add:

```javascript
import { useExperiment } from '../hooks/useExperiment';
```

At the top of the `Home` component:

```javascript
const sortVariant = useExperiment('default_sort_order');
```

Update the posts fetch inside `useEffect` to use the variant:

```javascript
const sortParam = sortVariant === 'treatment' ? '-upvotes' : '-createdAt';
const postsRes = await axios.get(`/api/posts?sort=${sortParam}&limit=5`);
```

**Step 2: Find the posts view route on the server**

Open `server/routes/posts.js` and find the route that handles `GET /api/posts/:id` (the individual post view). It will have something like `post.views++` or similar.

**Step 3: Add logOutcome call to post view route**

In the post view handler (after the post is fetched and returned), add:

```javascript
const { getExperimentationService } = require('../src/services/experimentation');
const { } = require('../src/middleware/experimentContext'); // experimentUser is on req

// After fetching the post, before sending response:
try {
  const experimentationService = getExperimentationService();
  if (req.experimentUser) {
    experimentationService.logOutcome('posts_views', req.experimentUser, 1);
  }
} catch (err) {
  // Never block the response
}
```

**Step 4: Start the experiment in Statsig dashboard**

1. Go to **Experiments** → `default_sort_order`
2. Click **Start Experiment**
3. Confirm — the experiment is now live, assigning users to control/treatment

**Step 5: Verify in Statsig dashboard**

1. Browse the forum as two different users (or incognito)
2. Check **Experiments** → `default_sort_order` → **Pulse Results**
3. You should see exposure events appearing

**Step 6: Commit**

```bash
git add client/src/pages/Home.js server/routes/posts.js
git commit -m "feat: implement default_sort_order A/B experiment with posts_views outcome metric"
```

---

## Task 13: Add Environment Variables to Documentation

**Files:**
- Modify: `DEPLOYMENT.md`

**Step 1: Add Statsig env vars section**

Find the environment variables section in `DEPLOYMENT.md` and add:

```markdown
### Statsig Experimentation

| Variable | Required | Description |
|---|---|---|
| `STATSIG_SERVER_SECRET_KEY` | Yes (if using flags) | Server SDK secret from Statsig dashboard |
| `REACT_APP_STATSIG_CLIENT_KEY` | Yes (if using flags) | Client SDK key from Statsig dashboard |

If these variables are not set, the ExperimentationService will not initialize and all flags will return their default values. The app continues to function normally.
```

**Step 2: Commit**

```bash
git add DEPLOYMENT.md
git commit -m "docs: add Statsig environment variables to deployment docs"
```

---

## Verification Checklist

Run through these before considering the integration complete:

- [ ] `cd server && npx tsc --noEmit` — no TypeScript errors
- [ ] `cd server && npx jest --no-coverage` — all tests pass
- [ ] Server starts with `STATSIG_SERVER_SECRET_KEY` set — logs "Statsig initialized"
- [ ] Server starts WITHOUT `STATSIG_SERVER_SECRET_KEY` — logs warning, starts normally
- [ ] `trending_posts_section` gate ON → widget visible, OFF → hidden
- [ ] `default_sort_order` experiment → Statsig dashboard shows exposure events
- [ ] Post view → Statsig dashboard shows `posts_views` outcome events
- [ ] Browser console has no Statsig errors
