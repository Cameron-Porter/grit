import type { Metadata, Viewport } from 'next';
import './globals.css';
import './program-schedule.css';
import './program-schedule-compact.css';
import './template-editor.css';
import './rest-timer.css';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { themeBootstrapScript } from '@/components/theme-select';

export const metadata: Metadata = {
  title: { default: 'GRIT', template: '%s · GRIT' },
  description: 'Adaptive hypertrophy programming and workout tracking.',
  applicationName: 'GRIT',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GRIT' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport: Viewport = { themeColor: '#101216', colorScheme: 'dark light', viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
