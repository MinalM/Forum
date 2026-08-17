// CI sets REACT_APP_API_URL directly (see .github/workflows/node.js.yml),
// so no separate CI-detection branch is needed here.
const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:2000'; // Local development

export const config = {
  apiUrl: API_URL,
  withCredentials: true
};

export default config;