import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const readJson = (relativePath: string) => JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));

const nativeRuntimePackages = [
  '@expo/vector-icons',
  '@react-native-async-storage/async-storage',
  '@sentry/react-native',
  'expo',
  'expo-apple-authentication',
  'expo-audio',
  'expo-constants',
  'expo-dev-client',
  'expo-device',
  'expo-file-system',
  'expo-font',
  'expo-glass-effect',
  'expo-haptics',
  'expo-image',
  'expo-linear-gradient',
  'expo-linking',
  'expo-notifications',
  'expo-router',
  'expo-sharing',
  'expo-splash-screen',
  'expo-status-bar',
  'expo-symbols',
  'expo-system-ui',
  'expo-web-browser',
  'jest-expo',
  'react-native',
  'react-native-gesture-handler',
  'react-native-get-random-values',
  'react-native-purchases',
  'react-native-reanimated',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-web',
  'react-native-worklets',
];

describe('PWA-only repository guard', () => {
  it('does not keep Expo/native runtime packages in the root package manifest', () => {
    const pkg = readJson('package.json');
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    expect(Object.keys(allDeps).filter((name) => nativeRuntimePackages.includes(name))).toEqual([]);
  });

  it('removes native app entrypoints and build configuration from the repository root', () => {
    for (const nativePath of ['app', 'app.json', 'eas.json', 'metro.config.js', 'babel.config.js', 'expo-env.d.ts']) {
      expect(existsSync(resolve(repoRoot, nativePath))).toBe(false);
    }
  });

  it('keeps shared training logic separate from deleted native UI/runtime code', () => {
    for (const sharedPath of ['src/rules', 'src/data', 'src/types', 'src/utils/volumeLandmarks.ts', 'src/utils/oneRepMax.ts']) {
      expect(existsSync(resolve(repoRoot, sharedPath))).toBe(true);
    }

    for (const nativePath of ['src/components', 'src/contexts', 'src/hooks', 'src/store', 'src/services/export']) {
      expect(existsSync(resolve(repoRoot, nativePath))).toBe(false);
    }
  });
});
