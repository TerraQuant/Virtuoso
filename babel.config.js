module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          alias: {
            "@components": "./src/components",
            "@hooks": "./src/hooks",
            "@lib": "./src/lib"
          }
        }
      ]
    ]
  };
};
