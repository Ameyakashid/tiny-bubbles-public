module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 (installed: react-native-reanimated@4.x with
    // react-native-worklets) uses the worklets babel plugin, not the
    // legacy reanimated babel plugin. It must remain the LAST plugin.
    plugins: ["react-native-worklets/plugin"],
  };
};
