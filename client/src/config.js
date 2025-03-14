// Determine if we're running in CI
const isCI = process.env.CI === 'true';

// Set API URL based on environment
const API_URL = isCI 
  ? 'http://localhost:5000'  // CI environment
  : (process.env.REACT_APP_API_URL || 'http://localhost:2000'); // Local development

export const config = {
  apiUrl: API_URL,
  withCredentials: true
};

export default config;