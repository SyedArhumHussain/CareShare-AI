// Backend base URL. Set REACT_APP_API_URL in .env (or in your host's build
// environment) before running `npm run build`, e.g. https://api.yourdomain.com
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
