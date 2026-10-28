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
  webpack(config) {
    // docx-templates' browser bundle carries JSZip's Node-only stream adapter behind an
    // optional require that only generateNodeStream() uses; the browser never calls it.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /docx-templates[\\/]lib[\\/]browser\.js/, message: /NodejsStreamOutputAdapter/ },
    ];
    return config;
  },
};

export default withSerwist(nextConfig);
