/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    styledComponents: true,
  },
  experimental: {
    instrumentationHook: false,
  },
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
