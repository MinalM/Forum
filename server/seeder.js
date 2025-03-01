const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Load models
const User = require('./models/User');
const Category = require('./models/Category');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ml_forum');

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    currentRole: 'Software Engineer',
    targetRole: 'AI Research Scientist',
    aiMlExperience: 'advanced',
    bio: 'Administrator of the AI/ML Career Forum',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision']
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    currentRole: 'Data Analyst',
    targetRole: 'Machine Learning Engineer',
    aiMlExperience: 'intermediate',
    bio: 'Transitioning from data analysis to machine learning',
    skills: ['Python', 'SQL', 'Data Analysis', 'Scikit-learn']
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    currentRole: 'Web Developer',
    targetRole: 'AI Application Developer',
    aiMlExperience: 'beginner',
    bio: 'Web developer looking to incorporate AI into applications',
    skills: ['JavaScript', 'React', 'Node.js', 'Python basics']
  }
];

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

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Post.deleteMany();
    await Comment.deleteMany();

    console.log('Data cleared...'.red.inverse);

    // Create users
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users created...`.green.inverse);

    // Create categories
    const createdCategories = await Category.create(categories);
    console.log(`${createdCategories.length} categories created...`.green.inverse);

    // Create posts
    const posts = [
      {
        title: 'Getting Started with Machine Learning',
        content: 'What are the best resources for someone completely new to machine learning? I have a background in software development but no experience with ML.',
        category: createdCategories[0]._id,
        user: createdUsers[1]._id,
        tags: ['beginner', 'resources', 'machine learning'],
        aiMlLevel: 'beginner'
      },
      {
        title: 'Transitioning from Data Analysis to ML Engineering',
        content: 'I\'ve been working as a data analyst for 3 years and want to move into machine learning engineering. What skills should I focus on developing?',
        category: createdCategories[2]._id,
        user: createdUsers[1]._id,
        tags: ['career transition', 'skills', 'machine learning engineer'],
        aiMlLevel: 'intermediate'
      },
      {
        title: 'Best Deep Learning Frameworks in 2025',
        content: 'What deep learning frameworks are most in-demand in the industry right now? I\'m trying to decide which one to focus on learning.',
        category: createdCategories[1]._id,
        user: createdUsers[2]._id,
        tags: ['deep learning', 'frameworks', 'pytorch', 'tensorflow'],
        aiMlLevel: 'intermediate'
      },
      {
        title: 'Portfolio Projects for AI Job Applications',
        content: 'What kinds of projects should I include in my portfolio when applying for AI/ML positions? Looking for ideas that will impress recruiters.',
        category: createdCategories[4]._id,
        user: createdUsers[2]._id,
        tags: ['portfolio', 'projects', 'job hunting'],
        aiMlLevel: 'all'
      },
      {
        title: 'Online Courses for NLP Specialization',
        content: 'Can anyone recommend good online courses specifically for Natural Language Processing? I\'m particularly interested in transformer models and large language models.',
        category: createdCategories[3]._id,
        user: createdUsers[0]._id,
        tags: ['nlp', 'courses', 'transformers', 'llm'],
        aiMlLevel: 'advanced'
      }
    ];

    const createdPosts = await Post.create(posts);
    console.log(`${createdPosts.length} posts created...`.green.inverse);

    // Create comments
    const comments = [
      {
        content: 'I recommend starting with Andrew Ng\'s Machine Learning course on Coursera. It\'s a great introduction to the fundamentals.',
        user: createdUsers[0]._id,
        post: createdPosts[0]._id
      },
      {
        content: 'Fast.ai is also excellent for beginners, especially if you prefer a more practical approach.',
        user: createdUsers[2]._id,
        post: createdPosts[0]._id
      },
      {
        content: 'Focus on strengthening your Python skills, learning scikit-learn, and getting comfortable with the ML workflow. Also, start building projects to demonstrate your skills.',
        user: createdUsers[0]._id,
        post: createdPosts[1]._id
      },
      {
        content: 'PyTorch and TensorFlow/Keras are still the dominant frameworks. PyTorch is gaining popularity in research while TensorFlow is widely used in production.',
        user: createdUsers[1]._id,
        post: createdPosts[2]._id
      },
      {
        content: 'I\'d recommend building a diverse portfolio that includes: a classification project, a regression project, a clustering project, and something with deep learning if possible.',
        user: createdUsers[0]._id,
        post: createdPosts[3]._id
      },
      {
        content: 'Stanford\'s CS224N is excellent for NLP. For transformers specifically, Hugging Face has great tutorials and courses.',
        user: createdUsers[1]._id,
        post: createdPosts[4]._id
      }
    ];

    await Comment.create(comments);
    console.log(`${comments.length} comments created...`.green.inverse);

    console.log('Data imported successfully!'.green.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data from DB
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Category.deleteMany();
    await Post.deleteMany();
    await Comment.deleteMany();

    console.log('Data destroyed...'.red.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Check command line args
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please use -i to import data or -d to delete data'.yellow.inverse);
  process.exit();
}
