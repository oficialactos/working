import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.servicosja.app',
  appName: 'ServiçosJá',
  // webDir is required by Capacitor even when using server.url.
  // Points to /public since no static export is used.
  webDir: 'public',
  // The app loads the production Vercel URL — no static bundle needed.
  // Change this to your actual Vercel URL before building for the stores.
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://your-app.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#07090E',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#07090E',
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#07090E',
      overlaysWebView: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#07090E',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
