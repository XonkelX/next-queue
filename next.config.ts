import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/demo', destination: '/create', permanent: true }];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
