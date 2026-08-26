import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { themeBootstrapScript } from '@/components/theme-select';
import type { Metadata, Viewport } from 'next';
import { inter, sora } from './fonts';
import './globals.css';
import './program-schedule.css';
import './rest-timer.css';
import './template-editor.css';

export const metadata: Metadata = {
  title: { default: 'GRIT', template: '%s · GRIT' },
  description: 'Adaptive hypertrophy programming and workout tracking.',
  applicationName: 'GRIT',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GRIT' },
  icons: { icon: '/plate-icon.png', apple: '/plate-icon.png' },
};

export const viewport: Viewport = { themeColor: '#101216', colorScheme: 'dark light', viewportFit: 'cover' };

/**
 * iOS shows nothing but the manifest's flat background_color during the native launch
 * screen unless apple-touch-startup-image links are provided - these give it the plate
 * icon on that same background instead of a blank screen. Media queries use CSS px
 * (device-width/height) + DPR, matched exactly per Apple's spec; the linked images are
 * pre-rendered at the corresponding physical-pixel size in public/splash/.
 */
const APPLE_SPLASH_SCREENS = [
  { cw: 375, ch: 667, dpr: 2, file: 'se-750x1334.png' },
  { cw: 375, ch: 812, dpr: 3, file: 'mini-1125x2436.png' },
  { cw: 390, ch: 844, dpr: 3, file: 'standard-1170x2532.png' },
  { cw: 393, ch: 852, dpr: 3, file: 'pro-1179x2556.png' },
  { cw: 428, ch: 926, dpr: 3, file: 'plusmax-1284x2778.png' },
  { cw: 430, ch: 932, dpr: 3, file: 'promax-1290x2796.png' },
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {APPLE_SPLASH_SCREENS.map(({ cw, ch, dpr, file }) => (
          <link
            key={file}
            rel="apple-touch-startup-image"
            href={`/splash/${file}`}
            media={`screen and (device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr})`}
          />
        ))}
      </head>
      <body className={`${inter.variable} ${sora.variable}`}><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
