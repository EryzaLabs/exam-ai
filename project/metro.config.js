// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add json to assetExts if not already present (usually it is sourceExts in older versions)
// In newer expo, json is in sourceExts by default.
// Ensure we can import .json files
if (!config.resolver.sourceExts.includes('json')) {
  config.resolver.sourceExts.push('json');
}

module.exports = config;
