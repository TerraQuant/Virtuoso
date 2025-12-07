const {
  withPlugins,
  withInfoPlist,
  withAndroidManifest,
  withProjectBuildGradle,
  withSettingsGradle,
  createRunOncePlugin
} = require("@expo/config-plugins");

/**
 * Expo config plugin to register native PcmStreaming module.
 * Configures iOS microphone permission and Android audio permissions.
 * Links the local native module during EAS prebuild.
 */
function withPcmStreamingPlugin(config, { microphonePermission } = {}) {
  // iOS: Add microphone permission
  config = withInfoPlist(config, (config) => {
    config.modResults.NSMicrophoneUsageDescription =
      microphonePermission ||
      "Allow Virtuoso to access the microphone to listen to your piano.";
    return config;
  });

  // Android: Ensure RECORD_AUDIO permission
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest;

    // Ensure uses-permission array exists
    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }

    // Check if RECORD_AUDIO already exists
    const hasRecordAudio = mainApplication["uses-permission"].some(
      (perm) => perm.$?.["android:name"] === "android.permission.RECORD_AUDIO"
    );

    if (!hasRecordAudio) {
      mainApplication["uses-permission"].push({
        $: { "android:name": "android.permission.RECORD_AUDIO" }
      });
    }

    return config;
  });

  // Android: Include local module in settings.gradle
  config = withSettingsGradle(config, (config) => {
    const moduleInclude = `
// PcmStreaming native module
include ':pcm-streaming'
project(':pcm-streaming').projectDir = new File(rootProject.projectDir, '../modules/pcm-streaming/android')
`;

    if (!config.modResults.contents.includes(":pcm-streaming")) {
      config.modResults.contents += moduleInclude;
    }

    return config;
  });

  // Android: Add module dependency to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    // The module is linked via settings.gradle and will be picked up by expo-modules-autolinking
    return config;
  });

  return config;
}

// Create a run-once plugin to avoid duplicate modifications
module.exports = createRunOncePlugin(
  withPcmStreamingPlugin,
  "withPcmStreaming",
  "1.0.0"
);
