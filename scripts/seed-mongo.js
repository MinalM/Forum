
// Switch to the forum database
db = db.getSiblingDB('ai_ml_forum');

// Clear existing data
db.users.deleteMany({});
db.categories.deleteMany({});
db.posts.deleteMany({});
db.comments.deleteMany({});

print('Data cleared...');

// Create users
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: '$2b$10$4X0FgUyJq5.TCmWEAuaOPuvPy5BM6AtSDqsXkx7VRl3U9EPqjN4q2',
    role: 'admin',
    currentRole: 'Software Engineer',
    targetRole: 'AI Research Scientist',
    aiMlExperience: 'advanced',
    bio: 'Administrator of the AI/ML Career Forum',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision'],
    authProvider: 'local',
    avatar: 'default-avatar.jpg',
    createdAt: new Date()
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2b$10$4X0FgUyJq5.TCmWEAuaOPuvPy5BM6AtSDqsXkx7VRl3U9EPqjN4q2',
    currentRole: 'Data Analyst',
    targetRole: 'Machine Learning Engineer',
    aiMlExperience: 'intermediate',
    bio: 'Transitioning from data analysis to machine learning',
    skills: ['Python', 'SQL', 'Data Analysis', 'Scikit-learn'],
    authProvider: 'local',
    role: 'user',
    avatar: 'default-avatar.jpg',
    createdAt: new Date()
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: '$2b$10$4X0FgUyJq5.TCmWEAuaOPuvPy5BM6AtSDqsXkx7VRl3U9EPqjN4q2',
    currentRole: 'Web Developer',
    targetRole: 'AI Application Developer',
    aiMlExperience: 'beginner',
    bio: 'Web developer looking to incorporate AI into applications',
    skills: ['JavaScript', 'React', 'Node.js', 'Python basics'],
    authProvider: 'local',
    role: 'user',
    avatar: 'default-avatar.jpg',
    createdAt: new Date()
  }
];

const createdUsers = db.users.insertMany(users);
print(`${createdUsers.insertedCount} users created...`);

// Create categories
const categories = [
  {
    name: 'Machine Learning Fundamentals',
    description: 'Discussions about core machine learning concepts, algorithms, and techniques',
    icon: 'brain',
    isAiMlSpecific: true
  },
  {
    name: 'Deep Learning',
    description: 'Topics related to neural networks, deep learning frameworks, and applications',
    icon: 'network-wired',
    isAiMlSpecific: true
  },
  {
    name: 'Career Advice',
    description: 'Guidance on transitioning to AI/ML roles, job hunting, and career development',
    icon: 'briefcase',
    isAiMlSpecific: true
  },
  {
    name: 'Learning Resources',
    description: 'Recommendations for courses, books, tutorials, and other learning materials',
    icon: 'book',
    isAiMlSpecific: true
  },
  {
    name: 'Project Showcase',
    description: 'Share and discuss your AI/ML projects and portfolios',
    icon: 'project-diagram',
    isAiMlSpecific: true
  }
];

const createdCategories = db.categories.insertMany(categories);
print(`${createdCategories.insertedCount} categories created...`);

// Create posts
const posts = [
  {
    title: 'Getting Started with Machine Learning',
    content: 'What are the best resources for someone completely new to machine learning? I have a background in software development but no experience with ML.',
    category: createdCategories.insertedIds[0],
    user: createdUsers.insertedIds[1],
    tags: ['beginner', 'resources', 'machine learning'],
    aiMlLevel: 'beginner',
    createdAt: new Date()
  },
  {
    title: 'Transitioning from Data Analysis to ML Engineering',
    content: 'I\'ve been working as a data analyst for 3 years and want to move into machine learning engineering. What skills should I focus on developing?',
    category: createdCategories.insertedIds[2],
    user: createdUsers.insertedIds[1],
    tags: ['career transition', 'skills', 'machine learning engineer'],
    aiMlLevel: 'intermediate',
    createdAt: new Date()
  },
  {
    title: 'Best Deep Learning Frameworks in 2025',
    content: 'What deep learning frameworks are most in-demand in the industry right now? I\'m trying to decide which one to focus on learning.',
    category: createdCategories.insertedIds[1],
    user: createdUsers.insertedIds[2],
    tags: ['deep learning', 'frameworks', 'pytorch', 'tensorflow'],
    aiMlLevel: 'intermediate',
    createdAt: new Date()
  },
  {
    title: 'Portfolio Projects for AI Job Applications',
    content: 'What kinds of projects should I include in my portfolio when applying for AI/ML positions? Looking for ideas that will impress recruiters.',
    category: createdCategories.insertedIds[4],
    user: createdUsers.insertedIds[2],
    tags: ['portfolio', 'projects', 'job hunting'],
    aiMlLevel: 'all',
    createdAt: new Date()
  },
  {
    title: 'Online Courses for NLP Specialization',
    content: 'Can anyone recommend good online courses specifically for Natural Language Processing? I\'m particularly interested in transformer models and large language models.',
    category: createdCategories.insertedIds[3],
    user: createdUsers.insertedIds[0],
    tags: ['nlp', 'courses', 'transformers', 'llm'],
    aiMlLevel: 'advanced',
    createdAt: new Date()
  }
];

const createdPosts = db.posts.insertMany(posts);
print(`${createdPosts.insertedCount} posts created...`);

// Create comments
const comments = [
  {
    content: 'I recommend starting with Andrew Ng\'s Machine Learning course on Coursera. It\'s a great introduction to the fundamentals.',
    user: createdUsers.insertedIds[0],
    post: createdPosts.insertedIds[0],
    createdAt: new Date()
  },
  {
    content: 'Fast.ai is also excellent for beginners, especially if you prefer a more practical approach.',
    user: createdUsers.insertedIds[2],
    post: createdPosts.insertedIds[0],
    createdAt: new Date()
  },
  {
    content: 'Focus on strengthening your Python skills, learning scikit-learn, and getting comfortable with the ML workflow. Also, start building projects to demonstrate your skills.',
    user: createdUsers.insertedIds[0],
    post: createdPosts.insertedIds[1],
    createdAt: new Date()
  },
  {
    content: 'PyTorch and TensorFlow/Keras are still the dominant frameworks. PyTorch is gaining popularity in research while TensorFlow is widely used in production.',
    user: createdUsers.insertedIds[1],
    post: createdPosts.insertedIds[2],
    createdAt: new Date()
  },
  {
    content: 'I\'d recommend building a diverse portfolio that includes: a classification project, a regression project, a clustering project, and something with deep learning if possible.',
    user: createdUsers.insertedIds[0],
    post: createdPosts.insertedIds[3],
    createdAt: new Date()
  },
  {
    content: 'Stanford\'s CS224N is excellent for NLP. For transformers specifically, Hugging Face has great tutorials and courses.',
    user: createdUsers.insertedIds[1],
    post: createdPosts.insertedIds[4],
    createdAt: new Date()
  }
];

const createdComments = db.comments.insertMany(comments);
print(`${createdComments.insertedCount} comments created...`);

print('Data imported successfully!');
