const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro treats unknown extensions as source by default; .glb/.gltf need to
// be bundled as binary assets for `Asset.fromModule` (AvatarLipsync) to load
// them as URIs instead of trying to parse them as JS.
config.resolver.assetExts.push('glb', 'gltf', 'bin');

module.exports = config;
