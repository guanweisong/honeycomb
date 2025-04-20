import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";
import { NextConfig } from "next";
import baseNextConfig from "../../next.config.base";

const withNextIntl = createNextIntlPlugin();
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {};

export default withBundleAnalyzer(
  withNextIntl({ ...baseNextConfig, ...nextConfig }),
);
