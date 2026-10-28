/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This app serves no images through next/image, so the image optimizer (/_next/image) is switched off: one less
  // public endpoint to patch. instrumentation.ts (the self-ping keep-alive) needs no setting since Next 15.
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
