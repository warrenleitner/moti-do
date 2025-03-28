/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Resolve case sensitivity issues for Vercel deployment
    config.resolve.symlinks = false;
    
    return config;
  },
};

module.exports = nextConfig; 