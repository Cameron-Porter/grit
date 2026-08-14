import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GRIT — Intelligent Training',
    short_name: 'GRIT',
    description: 'Adaptive hypertrophy programming and workout tracking.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#101216',
    theme_color: '#101216',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
