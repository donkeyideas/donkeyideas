const path = require('path');

module.exports = function (api) {
  api.cache(true);

  // Resolve babel-preset-expo from within expo's own node_modules
  // to ensure it can find expo-router and enable the router babel plugin.
  // The root monorepo copy can't resolve expo-router.
  const presetPath = require.resolve('babel-preset-expo', {
    paths: [path.resolve(__dirname, 'node_modules', 'expo')],
  });

  return {
    presets: [presetPath],
    plugins: ['react-native-reanimated/plugin'],
  };
};
