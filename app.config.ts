export default {
  expo: {
    name: 'Scheduler for periodic tasks',
    slug: 'Make_your_routine_memorized',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/d3ebba24-5329-44c8-9da8-3f690347d755'
    },
    assetBundlePatterns: ['**/*'],
    androidStatusBar: {
      backgroundColor: '#000000'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hutsoliak.scheduler_app',
      buildNumber: '1.0.0'
    },
    android: {
      package: 'com.hutsoliak.scheduler_app',
      versionCode: 1,
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      }
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      eas: {
        projectId: 'd3ebba24-5329-44c8-9da8-3f690347d755'
      },
      WEBVIEW_URL: process.env.WEBVIEW_URL
    },
    runtimeVersion: {
      policy: 'sdkVersion'
    }
  }
};
