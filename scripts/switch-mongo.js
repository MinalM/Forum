#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const serverDir = path.join(process.cwd(), 'server');
const envPath = path.join(serverDir, '.env');
const envProdPath = path.join(serverDir, '.env.production');

// Production variables that should not be copied to local development
const PROD_ONLY_VARS = ['PORT', 'NODE_ENV', 'CORS_ORIGIN'];

// Load existing .env files
let existingEnv = {};
let prodEnv = {};

try {
  if (fs.existsSync(envPath)) {
    existingEnv = dotenv.parse(fs.readFileSync(envPath));
  }
  if (fs.existsSync(envProdPath)) {
    prodEnv = dotenv.parse(fs.readFileSync(envProdPath));
  }
  if (!existingEnv.MONGO_URI && !prodEnv.MONGO_URI) {
    console.error('No MONGO_URI found in either server/.env or server/.env.production files.');
    process.exit(1);
  }
} catch (err) {
  console.error('Error reading environment files:', err);
  process.exit(1);
}

// Store the Atlas URI from existing configuration or production
const atlasUri = existingEnv.MONGO_URI || prodEnv.MONGO_URI;

const configs = {
  container: 'mongodb://localhost:27017/ai_ml_forum',
  atlas: atlasUri
};

function saveEnv(uri, isAtlas) {
  let updatedEnv;
  
  if (isAtlas) {
    // When switching to Atlas, copy production env vars except PROD_ONLY_VARS
    updatedEnv = { 
      ...Object.entries(prodEnv).reduce((acc, [key, value]) => {
        if (!PROD_ONLY_VARS.includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {}),
      // Local development settings
      PORT: '2000',
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000',
      // Override MONGO_URI
      MONGO_URI: uri
    };
  } else {
    // When switching to container, preserve existing env vars but change MONGO_URI
    updatedEnv = { ...existingEnv, MONGO_URI: uri };
  }

  // Convert env object to string
  const envContent = Object.entries(updatedEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent + '\n');
  console.log(`Environment updated in server/.env`);
  console.log(`MongoDB URI set to: ${uri}`);
}

function switchToContainer() {
  // Store the current Atlas URI before switching
  configs.atlas = existingEnv.MONGO_URI || prodEnv.MONGO_URI;
  saveEnv(configs.container, false);
  console.log('Switched to MongoDB Container');
  console.log('Original Atlas URI has been preserved.');
}

function switchToAtlas() {
  if (!configs.atlas || !configs.atlas.includes('mongodb+srv://')) {
    console.error('No valid Atlas URI found in server/.env or server/.env.production files.');
    console.error('Please ensure one of your env files contains a valid MongoDB Atlas URI.');
    process.exit(1);
  }
  saveEnv(configs.atlas, true);
  console.log('Switched to MongoDB Atlas');
  console.log('Production environment variables have been copied (except PORT, NODE_ENV, and CORS_ORIGIN).');
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
    console.log('Usage: node scripts/switch-mongo.js [container|atlas]');
    console.log('  container - Switch to local MongoDB container');
    console.log('  atlas    - Switch to MongoDB Atlas and copy production env vars');
    console.log('\nCurrent MongoDB URI:', existingEnv.MONGO_URI || 'not set in server/.env');
    console.log('Production MongoDB URI:', prodEnv.MONGO_URI || 'not set in server/.env.production');
}