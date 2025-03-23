/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    LINK_OBJECT_ID: "5349b4ddd2781d08c09890f3",
    FRONT_DOMAIN: "www.guanweisong.com",
  },
};

module.exports = nextConfig;
