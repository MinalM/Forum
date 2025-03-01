# AI/ML Career Transition Forum

A community platform for professionals transitioning to careers in Artificial Intelligence and Machine Learning. This forum software is similar to Discourse but specifically focused on enabling career transitions to AI/ML fields.

## Features

- User authentication and profiles with AI/ML experience levels
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
- RESTful API

### Frontend
- React
- React Router
- Context API for state management
- Axios for API requests
- CSS with responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

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
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
```

### Running the Application

1. Run both the server and client concurrently
```
npm run dev
```

2. The server will run on http://localhost:5000 and the client on http://localhost:3000

## API Endpoints

### Authentication
- POST /api/users/register - Register a new user
- POST /api/users/login - Login user
- GET /api/users/logout - Logout user
- GET /api/users/me - Get current user

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
