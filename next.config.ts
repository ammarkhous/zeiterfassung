import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
});

const nextConfig: NextConfig = {
  ...(isGithubPages ? { output: 'export' } : {}),
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
