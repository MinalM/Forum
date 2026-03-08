# OpenTelemetry Counter Metrics Implementation

## Overview
This document describes the OpenTelemetry counter metrics that have been added to the Forum application to track key user actions and engagement metrics.

## Metrics Added

### 1. User Authentication Metrics

#### `user.signup`
- **Description**: Tracks user registrations (regular email/password signup)
- **Type**: Counter
- **Attributes**:
  - `auth_method`: "regular"
  - `role`: User role (user, moderator, admin)
- **Location**: `server/controllers/users.js` - `registerUser` function
- **Triggered**: When a new user successfully registers

#### `user.login`
- **Description**: Tracks regular user logins (email/password)
- **Type**: Counter
- **Attributes**:
  - `auth_method`: "regular"
  - `role`: User role (user, moderator, admin)
- **Location**: `server/controllers/users.js` - `loginUser` function
- **Triggered**: When a user successfully logs in with email/password

#### `user.login.oauth`
- **Description**: Tracks OAuth logins (currently Google)
- **Type**: Counter
- **Attributes**:
  - `auth_method`: "oauth"
  - `provider`: "google"
  - `role`: User role (user, moderator, admin)
- **Location**: `server/controllers/users.js` - `googleCallback` function
- **Triggered**: When a user successfully authenticates via Google OAuth

#### `user.sessions`
- **Description**: Tracks user session creation (both regular and OAuth)
- **Type**: Counter
- **Attributes**:
  - `role`: User role (user, moderator, admin)
- **Location**: `server/controllers/users.js` - `sendTokenResponse` function
- **Triggered**: Every time a JWT token is issued (login, signup, OAuth)

### 2. Content Creation Metrics

#### `posts.created`
- **Description**: Tracks new post creation
- **Type**: Counter
- **Attributes**:
  - `category`: Category name where the post was created
  - `user_role`: Role of the user creating the post
- **Location**: `server/controllers/posts.js` - `createPost` function
- **Triggered**: When a user successfully creates a new post

#### `comments.created`
- **Description**: Tracks new comment creation (including replies)
- **Type**: Counter
- **Attributes**:
  - `is_reply`: "true" or "false" (indicates if it's a reply to another comment)
  - `user_role`: Role of the user creating the comment
  - `post_id`: ID of the post (for direct comments)
  - `parent_comment_id`: ID of parent comment (for replies)
- **Location**: `server/controllers/comments.js` - `addComment` and `addReply` functions
- **Triggered**: When a user successfully creates a comment or reply

### 3. Engagement Metrics

#### `posts.views`
- **Description**: Tracks post views
- **Type**: Counter
- **Attributes**:
  - `category`: Category name of the viewed post
  - `post_id`: ID of the viewed post
- **Location**: `server/controllers/posts.js` - `getPost` function
- **Triggered**: Every time a post is viewed (GET request to a specific post)

## Files Modified

1. **`server/src/instrumentation/metrics.ts`**
   - Added all new counter metric definitions
   - Centralized metrics module for easy import across controllers

2. **`server/controllers/users.js`**
   - Imported metrics module
   - Added signup counter
   - Added login counter
   - Added OAuth login counter
   - Added session counter

3. **`server/controllers/posts.js`**
   - Imported metrics module
   - Updated post creation to use centralized counter
   - Added post view counter

4. **`server/controllers/comments.js`**
   - Imported metrics module
   - Added comment creation counter (for both comments and replies)

## Usage in Grafana

These metrics can be queried in Grafana using PromQL queries. Here are some example queries:

### Authentication Metrics
```promql
# Total signups
sum(user_signup_total)

# Signups by role
sum by (role) (user_signup_total)

# Login rate (per minute)
rate(user_login_total[5m])

# OAuth vs Regular logins
sum by (auth_method) (user_login_total)
```

### Content Metrics
```promql
# Posts created by category
sum by (category) (posts_created_total)

# Comments vs Replies
sum by (is_reply) (comments_created_total)

# Post views by category
sum by (category) (posts_views_total)
```

### Engagement Metrics
```promql
# Active sessions
sum(user_sessions_total)

# Content creation rate
rate(posts_created_total[5m]) + rate(comments_created_total[5m])
```

## Dashboard Recommendations

Consider creating dashboard panels for:

1. **User Growth**: Track signups over time
2. **Authentication Methods**: Pie chart of OAuth vs regular logins
3. **Content Activity**: Posts and comments created over time
4. **Popular Categories**: Bar chart of posts by category
5. **Engagement Rate**: Post views vs post creation ratio
6. **User Activity by Role**: Compare activity across user roles

## Next Steps

To extend this implementation, consider adding:

1. **Gauges** for active users, active sessions
2. **Histograms** for response times, content length
3. **Additional attributes** like user location, device type
4. **Custom events** for important business metrics
5. **Alerts** based on metric thresholds

## Testing

To verify metrics are being collected:

1. Visit `/api/otel-diagnostics` to check OTEL configuration
2. Perform actions (signup, login, create post, view post, add comment)
3. Check Grafana Explore with your metrics data source
4. Query for the specific metric names listed above

## Notes

- All counters use the `add()` method with a value of 1
- Attributes are added to provide dimensional data for filtering and grouping
- Metrics are exported via OTLP to the configured collector endpoint
- The metrics follow OpenTelemetry semantic conventions where applicable
