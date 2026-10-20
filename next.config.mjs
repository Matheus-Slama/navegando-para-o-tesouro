/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  devIndicators: false,
  ...(process.env.GITHUB_PAGES === 'true' && {
    output: 'export',
    basePath: process.env.PAGES_BASE_PATH || '',
    trailingSlash: true,
    images: { unoptimized: true }
  }),
  allowedDevOrigins: ['127.0.0.1', '192.168.101.10']
};

export default nextConfig;
