import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'GRIT — Intelligent Training',
    short_name: 'GRIT',
    description: 'Adaptive hypertrophy programming and workout tracking.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#101216',
    theme_color: '#101216',
    categories: ['health', 'fitness', 'productivity'],
    shortcuts: [
      { name: 'Today', short_name: 'Today', description: 'Open the fast training home.', url: '/today', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Start workout', short_name: 'Workout', description: 'Open the active workout flow.', url: '/workout', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Programs', short_name: 'Programs', description: 'Review and manage training programs.', url: '/programs', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
