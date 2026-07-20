module.exports = {
  dependencies: {
    // iOS-only package — uses deprecated jcenter() in its Android build.gradle.
    // Exclude from Android auto-linking; iOS linking handled by EAS build.
    'react-native-shared-group-preferences': {
      platforms: {
        android: null,
      },
    },
  },
};
