/**
 * @type {import('next').NextConfig}
 */

// Check if we're in production mode
const isProd = process.env.NODE_ENV === 'production';

// Optional: Bundle analyzer for production builds
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Base configuration
const nextConfig = {
  // Improve build speed by skipping type checking in production build
  // (assuming you run type checking separately in CI)
  typescript: {
    ignoreBuildErrors: isProd,
  },
  
  // Skip ESLint during builds for speed (assuming you run ESLint separately in CI)
  eslint: {
    ignoreDuringBuilds: isProd,
  },
  
  // Image optimization settings
  images: {
    // Enable image optimization in production for better performance
    unoptimized: !isProd,
    domains: ['images.pexels.com', 'via.placeholder.com'],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
  },
  
  // Enable compression in production
  compress: isProd,
  
  // Optimize output for production
  output: isProd ? 'standalone' : undefined,
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Experimental features
  experimental: {
    // External packages for server components
    serverComponentsExternalPackages: ['mongoose'],
    // Optimize server components
    serverActions: true,
    // Optimize for production
    optimizeCss: isProd,
    // Improve memory usage during builds
    memoryBasedWorkersCount: isProd,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Add Content Security Policy in production
          ...(isProd ? [
            {
              key: 'Content-Security-Policy',
              value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.example.com",
            }
          ] : []),
          // Add caching headers for static assets in production
          ...(isProd ? [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            }
          ] : []),
        ],
      },
      // Add specific caching for static assets
      ...(isProd ? [
        {
          source: '/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            }
          ],
        },
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            }
          ],
        }
      ] : []),
    ];
  },
  
  // Optimize bundle
  webpack: (config, { isServer, dev }) => {
    // Client-side polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Production optimizations
    if (!dev) {
      // Enable tree shaking
      config.optimization.usedExports = true;
      
      // Minimize CSS
      if (config.optimization.minimizer) {
        const TerserPlugin = config.optimization.minimizer.find(
          (plugin) => plugin.constructor.name === 'TerserPlugin'
        );
        if (TerserPlugin) {
          TerserPlugin.options.terserOptions.compress.drop_console = true;
        }
      }
    }
    
    return config;
  },
  
  // Enable powered by header in development only
  poweredByHeader: !isProd,
};

// Export with bundle analyzer if enabled
module.exports = process.env.ANALYZE === 'true'
  ? withBundleAnalyzer(nextConfig)
  : nextConfig;