# AI/ML Career Transition Forum

A community platform for professionals transitioning to careers in Artificial Intelligence and Machine Learning. This forum software is similar to Discourse but specifically focused on enabling career transitions to AI/ML fields.

## Recent Updates

### March 5, 2025
- Added Google OAuth integration for easy sign-in
- Fixed authentication error handling in Dashboard component
- Added proper null checks for user data to prevent "Cannot read properties of null" errors
- Improved token management in AuthContext
- Enhanced user experience with loading indicators during authentication

### February 28, 2025
- Fixed login persistence issues across page refreshes
- Improved error handling for authentication failures
- Enhanced token validation and refresh mechanism
- Added better error messages for login/registration failures

## Features

- User authentication and profiles with AI/ML experience levels
- Google OAuth integration for easy sign-in
- Categories and tags for organizing discussions
- Posts with upvoting/downvoting functionality
- Comments and nested replies
- Marking posts as solved
- User dashboard with career progress tracking
- Mobile-responsive design

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Passport.js with Google OAuth 2.0
- RESTful API

### Frontend
- React
- React Router
- Context API for state management
- Google OAuth integration with @react-oauth/google
- Axios for API requests
- CSS with responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Docker (optional, for containerized MongoDB)

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/ai-ml-career-forum.git
cd ai-ml-career-forum
```

2. Install server dependencies
```
npm install
```

3. Install client dependencies
```
cd client
npm install
cd ..
```

4. Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=2000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Google OAuth credentials (required for Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:2000/api/users/auth/google/callback
```

### Setting up MongoDB Container (Optional)

If you prefer using a containerized MongoDB instance for development:

1. Start MongoDB container:
```bash
docker run -d --name mongodb-test -p 27017:27017 \
  -v "$(pwd)/scripts:/seed" \
  mongo:6.0
```

2. Generate and run seed data:
```bash
# Install bcryptjs if not already installed
npm install bcryptjs

# Generate seed file with proper password hashing
node scripts/generate-seed.js

# Seed the database
docker exec mongodb-test mongosh -f /seed/seed-mongo.js --quiet
```

3. Switch between MongoDB configurations:
```bash
# Switch to container MongoDB
npm run mongo:container

# Switch back to Atlas MongoDB
npm run mongo:atlas
```

Test users after seeding:
- Admin: admin@example.com / password123
- User 1: john@example.com / password123
- User 2: jane@example.com / password123

To stop and remove the container:
```bash
docker stop mongodb-test
docker rm mongodb-test
```

### Running the Application

1. Run both the server and client concurrently
```
npm run dev
```

2. The server will run on http://localhost:2000 and the client on http://localhost:3000

## API Endpoints

### Authentication
- POST /api/users/register - Register a new user
- POST /api/users/login - Login user
- GET /api/users/logout - Logout user
- GET /api/users/me - Get current user
- GET /api/users/auth/google - Initiate Google OAuth login
- GET /api/users/auth/google/callback - Google OAuth callback
- GET /api/users/auth/google/success - Check Google OAuth authentication status

### Users
- GET /api/users - Get all users (admin)
- GET /api/users/:id - Get user by ID
- PUT /api/users/updatedetails - Update user details
- PUT /api/users/updatepassword - Update password

### Categories
- GET /api/categories - Get all categories
- GET /api/categories/:id - Get category by ID
- POST /api/categories - Create new category (admin)
- PUT /api/categories/:id - Update category (admin)
- DELETE /api/categories/:id - Delete category (admin)
- GET /api/categories/aiml - Get AI/ML specific categories

### Posts
- GET /api/posts - Get all posts
- GET /api/posts/:id - Get post by ID
- POST /api/posts - Create new post
- PUT /api/posts/:id - Update post
- DELETE /api/posts/:id - Delete post
- PUT /api/posts/:id/upvote - Upvote a post
- PUT /api/posts/:id/downvote - Downvote a post
- PUT /api/posts/:id/solve - Mark post as solved
- GET /api/posts/level/:level - Get posts by AI/ML level

### Comments
- GET /api/comments - Get all comments
- GET /api/posts/:postId/comments - Get comments for a post
- POST /api/posts/:postId/comments - Add comment to a post
- PUT /api/comments/:id - Update comment
- DELETE /api/comments/:id - Delete comment
- PUT /api/comments/:id/upvote - Upvote a comment
- PUT /api/comments/:id/downvote - Downvote a comment
- PUT /api/comments/:id/answer - Mark comment as answer
- GET /api/comments/:id/replies - Get replies to a comment
- POST /api/comments/:id/replies - Add reply to a comment

## License

This project is licensed under the MIT License.

## Deployment & Observability

For how this forum is monitored and deployed in both local and production environments, see:

- `OBSERVABILITY.md` – OpenTelemetry metrics/traces, local Docker stack (Prometheus, Jaeger, Grafana), and metric reference
- `DEPLOYMENT.md` – Production deployment checklist, Render/Grafana Cloud configuration, and verification steps

At a high level:

- The backend is instrumented with OpenTelemetry for HTTP, MongoDB, and business metrics (signups, posts, comments, etc.)
- Locally you can run a full observability stack via `docker-compose.observability.yml` and query all `forum_*` metrics
- In production, traces and metrics can be exported to Grafana Cloud (or another OTEL backend)

## Testing

The test suite is Jest-based with Supertest and an in-memory MongoDB.

- Unit tests cover models, middleware, and utilities
- Integration tests cover all main REST endpoints (auth, posts, comments, categories)

Common commands:

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

Target coverage is ~80%+ across statements, branches, functions, and lines.
