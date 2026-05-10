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
    // 强烈建议仅在迁移或调试时临时开启，完成后请恢复类型检查
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
