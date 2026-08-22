import tseslint from 'typescript-eslint';

const browserGlobals = {
  AbortController: 'readonly',
  Blob: 'readonly',
  BroadcastChannel: 'readonly',
  caches: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  document: 'readonly',
  Event: 'readonly',
  EventSource: 'readonly',
  fetch: 'readonly',
  File: 'readonly',
  FormData: 'readonly',
  Headers: 'readonly',
  indexedDB: 'readonly',
  IntersectionObserver: 'readonly',
  localStorage: 'readonly',
  location: 'readonly',
  navigator: 'readonly',
  Notification: 'readonly',
  performance: 'readonly',
  Promise: 'readonly',
  queueMicrotask: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  self: 'readonly',
  ServiceWorkerGlobalScope: 'readonly',
  sessionStorage: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...tseslint.config({
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: false, ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@expo/*',
            '@react-native/*',
            'expo',
            'expo-*',
            'react-native',
            'react-native-*',
          ],
        },
      ],
    },
  }),
];
