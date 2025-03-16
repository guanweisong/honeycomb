import path from "path";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin();
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.guanweisong.com",
        port: "",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 600,
  },
  compiler: {
    // removeConsole:
    //   process.env.NODE_ENV === 'production'
    //     ? {
    //         exclude: ['error'],
    //       }
    //     : false,
  },
  poweredByHeader: false,
  webpack: (config, options) => {
    config.resolve.alias["@"] = path.join(process.cwd(), "./");
    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
