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
  // Vercel部署优化
  output: 'standalone',
  // 禁用 Turbopack，使用 Webpack 构建
  experimental: {
    turbo: undefined,
  },
};

module.exports = nextConfig;
