// Reads app.json, then adds settings that come from the environment.
// EXPO_BASE_URL: the path the browser version is served from. The app lives at the root of
// https://app.approachstrength.com, so it is "/" (2.2.1).
module.exports = ({ config }) => {
  const baseUrl = (process.env.EXPO_BASE_URL || '').replace(/\/+$/, '');
  return {
    ...config,
    experiments: { ...(config.experiments || {}), ...(baseUrl ? { baseUrl } : {}) },
  };
};
