const { withGradleProperties } = require('expo/config-plugins');

/**
 * expo-build-properties only exposes enableMinifyInReleaseBuilds (which
 * already runs R8, not legacy ProGuard) and enableShrinkResourcesInReleaseBuilds.
 * It has no toggle for R8 "full mode" or AGP's optimized resource shrinker,
 * so those two gradle.properties keys are added directly here.
 */
const withAndroidR8FullMode = (config) =>
  withGradleProperties(config, (config) => {
    const props = [
      { type: 'property', key: 'android.enableR8.fullMode', value: 'true' },
      { type: 'property', key: 'android.experimental.enableNewResourceShrinker', value: 'true' },
    ];

    for (const prop of props) {
      const existing = config.modResults.find(
        (item) => item.type === 'property' && item.key === prop.key
      );
      if (existing) {
        existing.value = prop.value;
      } else {
        config.modResults.push(prop);
      }
    }

    return config;
  });

module.exports = withAndroidR8FullMode;
