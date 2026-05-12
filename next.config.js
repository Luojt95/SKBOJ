/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack 配置（Next.js 16 默认）
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
};

module.exports = nextConfig;
