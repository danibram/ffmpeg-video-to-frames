import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import type React from 'react';
import { FFmpegProvider } from './contexts/FFmpegContext';
import './globals.css';

import localFont from 'next/font/local';

const pcFont = localFont({
  src: [
    {
      path: './fonts/PrintChar21.woff2',
    },
    {
      path: './fonts/PrintChar21.woff',
    },
    {
      path: './fonts/PrintChar21.ttf',
    },
  ],
  variable: '--pc-font',
  display: 'swap',
  weight: 'medium',
  style: 'medium',
});

export const metadata: Metadata = {
  title: 'Video Editor',
  description: 'Video Editor with FFmpeg WASM',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pcFont.variable}`}>
      <body className={'antialiased'}>
        <FFmpegProvider>{children}</FFmpegProvider>
        <Analytics />
      </body>
    </html>
  );
}
