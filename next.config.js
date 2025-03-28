/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Resolve case sensitivity issues for Vercel deployment
    config.resolve.symlinks = false;
    
    // Add explicit path resolution for components
    config.resolve.modules = ['node_modules', './src'];
    
    // Ensure file extensions are properly resolved
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
    
    return config;
  },
};

module.exports = nextConfig; 