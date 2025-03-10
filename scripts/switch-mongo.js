#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env');

// Load existing .env file
let existingEnv = {};
try {
  existingEnv = dotenv.parse(fs.readFileSync(envPath));
} catch (err) {
  console.error('No .env file found. Please ensure your .env file exists with MONGO_URI.');
  process.exit(1);
}

// Store the Atlas URI from existing configuration
const atlasUri = existingEnv.MONGO_URI;

const configs = {
  container: 'mongodb://localhost:27017/ai_ml_forum',
  atlas: atlasUri
};

function saveEnv(uri) {
  // Preserve all existing environment variables
  const updatedEnv = {
    ...existingEnv,
    MONGO_URI: uri
  };

  // Convert env object to string
  const envContent = Object.entries(updatedEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent + '\n');
  console.log(`MongoDB URI updated to: ${uri}`);
}

function switchToContainer() {
  // Store the current Atlas URI before switching
  configs.atlas = existingEnv.MONGO_URI;
  saveEnv(configs.container);
  console.log('Switched to MongoDB Container');
  console.log('Original Atlas URI has been preserved.');
}

function switchToAtlas() {
  if (!configs.atlas || !configs.atlas.includes('mongodb+srv://')) {
    console.error('No valid Atlas URI found in .env file.');
    console.error('Please ensure your .env file contains a valid MongoDB Atlas URI.');
    process.exit(1);
  }
  saveEnv(configs.atlas);
  console.log('Switched to MongoDB Atlas');
}

const command = process.argv[2];

switch (command) {
  case 'container':
    switchToContainer();
    break;
  case 'atlas':
    switchToAtlas();
    break;
  default:
    console.log('Usage: node switch-mongo.js [container|atlas]');
    console.log('  container - Switch to local MongoDB container');
    console.log('  atlas    - Switch to MongoDB Atlas');
    console.log('\nCurrent MongoDB URI:', existingEnv.MONGO_URI);
}