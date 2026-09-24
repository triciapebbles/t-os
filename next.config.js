/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enables instrumentation.ts, which schedules the self-ping keep-alive.
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
