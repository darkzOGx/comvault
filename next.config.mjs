/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_S3_PUBLIC_HOST || "**"
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Fix for pdf-parse trying to access test files during build
    if (isServer) {
      config.externals.push({
        canvas: "commonjs canvas"
      });
    }
    return config;
  }
};

export default nextConfig;
