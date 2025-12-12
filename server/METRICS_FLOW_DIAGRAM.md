# OpenTelemetry Metrics Flow Diagram

## User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Authentication                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ User Signup  │──────► user.signup ────────► { auth_method, role }
└──────────────┘

┌──────────────┐
│ User Login   │──────► user.login ────────► { auth_method, role }
│ (Email/Pass) │
└──────────────┘

┌──────────────┐
│ OAuth Login  │──────► user.login.oauth ──► { auth_method, provider, role }
│   (Google)   │
└──────────────┘

         │
         │ (All authentication methods)
         ▼
┌──────────────┐
│ JWT Token    │──────► user.sessions ─────► { role }
│   Issued     │
└──────────────┘
```

## Content Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Creation                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Create Post  │──────► posts.created ─────► { category, user_role }
└──────────────┘

┌──────────────┐
│ Add Comment  │──────► comments.created ──► { is_reply: false, user_role, post_id }
└──────────────┘

┌──────────────┐
│  Add Reply   │──────► comments.created ──► { is_reply: true, user_role, parent_comment_id }
└──────────────┘
```

## Engagement Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Engagement                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  View Post   │──────► posts.views ────────► { category, post_id }
└──────────────┘
```

## Metrics Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   users.js   │  │  posts.js    │  │ comments.js  │          │
│  │              │  │              │  │              │          │
│  │ - signup     │  │ - create     │  │ - add        │          │
│  │ - login      │  │ - view       │  │ - reply      │          │
│  │ - oauth      │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Metrics Layer                                 │
│                                                                   │
│              src/instrumentation/metrics.ts                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  OpenTelemetry Meter                                    │    │
│  │                                                          │    │
│  │  • user.signup                                          │    │
│  │  • user.login                                           │    │
│  │  • user.login.oauth                                     │    │
│  │  • user.sessions                                        │    │
│  │  • posts.created                                        │    │
│  │  • posts.views                                          │    │
│  │  • comments.created                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OpenTelemetry SDK                               │
│                                                                   │
│  • Collects metrics                                              │
│  • Aggregates data                                               │
│  • Exports via OTLP                                              │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenTelemetry Collector                             │
│                                                                   │
│  • Receives metrics via OTLP                                     │
│  • Processes and transforms                                      │
│  • Exports to backends                                           │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Grafana                                     │
│                                                                   │
│  • Visualizes metrics                                            │
│  • Creates dashboards                                            │
│  • Sets up alerts                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Metric Attributes Breakdown

### Authentication Metrics
- **auth_method**: Distinguishes between regular and OAuth authentication
- **provider**: Identifies the OAuth provider (e.g., "google")
- **role**: User's role in the system (user, moderator, admin)

### Content Metrics
- **category**: Post category for grouping and filtering
- **user_role**: Role of content creator for moderation insights
- **is_reply**: Distinguishes comments from replies
- **post_id**: Links views to specific posts
- **parent_comment_id**: Links replies to parent comments

## Data Flow Example

### User Signup Journey
```
1. User submits registration form
   ↓
2. POST /api/users/register
   ↓
3. User.create() in database
   ↓
4. userSignupCounter.add(1, { auth_method: 'regular', role: 'user' })
   ↓
5. sendTokenResponse() called
   ↓
6. userSessionCounter.add(1, { role: 'user' })
   ↓
7. Metrics exported to OTLP endpoint
   ↓
8. Visible in Grafana
```

### Post Creation Journey
```
1. User creates a post
   ↓
2. POST /api/posts
   ↓
3. Post.create() in database
   ↓
4. postCreatedCounter.add(1, { category: 'Machine Learning', user_role: 'user' })
   ↓
5. Metrics exported to OTLP endpoint
   ↓
6. Visible in Grafana
```
