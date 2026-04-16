const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// REMOVED: disableHierarchicalLookup: true
// This was causing babel to load react-native-worklets from root
// node_modules AND react-native-reanimated/plugin from apps/mobile
// node_modules simultaneously, triggering the duplicate plugin error.
// Metro's default hierarchical lookup correctly deduplicates them.

module.exports = withNativeWind(config, { input: './global.css' });