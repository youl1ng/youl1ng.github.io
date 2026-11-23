import type { NextConfig } from 'next';

// Static export for GitHub Pages (ooniverse.me). No server features are used.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
