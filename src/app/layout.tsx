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

// GitHub Pages cannot send response headers, so the policy is a meta tag (production only:
// the dev server needs websockets and eval). Its main job is to confine network traffic to
// this app and the Supabase project, so injected script could not send data anywhere else.
// 'unsafe-inline' is required by Next's bootstrap scripts; 'unsafe-eval' by docx-templates,
// whose commands are restricted by validateTemplate().
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return '';
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}`.trim(),
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const metadata: Metadata = {
  title: 'Zeiterfassung',
  description: 'Freelance Zeiterfassung mit AE-System',
  manifest: `${basePath}/manifest.json`,
  referrer: 'no-referrer',
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
      <head>
        {process.env.NODE_ENV === 'production' && (
          <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy} />
        )}
      </head>
      <body className={`${inter.variable} antialiased`}>
        <UpdatePrompt />
        {children}
      </body>
    </html>
  );
}
