// apps/parent/babel.config.js — mirrors apps/kid (NativeWind jsx source +
// preset). No reanimated/worklets here: the parent app does not ship them.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
