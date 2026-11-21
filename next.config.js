/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for S3 deployment
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  
  devIndicators : false,
  // Add trailing slash for better S3 compatibility
  trailingSlash: true,
  
  // No base path needed for QA environment since it uses a separate subdomain
  // basePath: '/next',   // Only needed if deploying to a subfolder
  // assetPrefix: '/next', // Only needed if assets are in a different location
  
  // Disable StrictMode to prevent double API calls in development
  reactStrictMode: false,

  // Ensure proper handling of routes for S3 static hosting
  experimental: {
    // Improve client-side routing for static export
    scrollRestoration: true
  },
//  assetPrefix: process.env.NODE_ENV==='production'?'https://preprod.next.1channel.co':'',

}

module.exports = nextConfig