import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { themeBootstrapScript } from '@/components/theme-select';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './program-schedule-compact.css';
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
