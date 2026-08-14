import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

export const metadata: Metadata = {
  title: { default: 'GRIT', template: '%s · GRIT' },
  description: 'Adaptive hypertrophy programming and workout tracking.',
  applicationName: 'GRIT',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GRIT' },
};

export const viewport: Viewport = { themeColor: '#101216', colorScheme: 'dark light', viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
