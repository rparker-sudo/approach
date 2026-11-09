// Reads app.json, then adds settings that come from the environment.
// EXPO_BASE_URL: the path the browser version is served from on GitHub Pages,
// e.g. "/load-and-launch" for https://yourname.github.io/load-and-launch
module.exports = ({ config }) => {
  const baseUrl = (process.env.EXPO_BASE_URL || '').replace(/\/+$/, '');
  return {
    ...config,
    experiments: { ...(config.experiments || {}), ...(baseUrl ? { baseUrl } : {}) },
  };
};
