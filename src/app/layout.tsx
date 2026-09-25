import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { UpdatePrompt } from '@/components/nav/UpdatePrompt';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Zeiterfassung',
  description: 'Freelance Zeiterfassung mit AE-System',
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zeiterfassung',
  },
};

export const viewport: Viewport = {
  themeColor: '#f4f5f0',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} antialiased`}>
        <UpdatePrompt />
        {children}
      </body>
    </html>
  );
}
