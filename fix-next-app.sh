#!/bin/bash

# Clean up any existing installations
echo "Cleaning up node_modules..."
rm -rf node_modules
rm -rf .next

# Restore package.json to use compatible versions
echo "Updating package.json with compatible versions..."
cat > package.json << 'EOF'
{
  "name": "retaility-nextjs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "parallel": "node ./scripts/run-parallel.js"
  },
  "dependencies": {
    "@ag-grid-community/client-side-row-model": "^31.0.1",
    "@ag-grid-enterprise/column-tool-panel": "^31.0.1",
    "@ag-grid-enterprise/menu": "^31.0.1",
    "@ag-grid-enterprise/row-grouping": "^31.0.1",
    "@fortawesome/fontawesome-svg-core": "^6.4.2",
    "@fortawesome/free-brands-svg-icons": "^6.4.2",
    "@fortawesome/free-regular-svg-icons": "^6.4.2",
    "@fortawesome/free-solid-svg-icons": "^6.4.2",
    "@fortawesome/react-fontawesome": "^0.2.0",
    "ag-charts-community": "^8.0.5",
    "ag-charts-react": "^8.0.5",
    "ag-grid-community": "^31.0.1",
    "ag-grid-enterprise": "^31.0.1",
    "ag-grid-react": "^31.0.1",
    "apexcharts": "^3.43.0",
    "bootstrap": "^5.3.2",
    "chart.js": "^4.4.0",
    "chartist": "^1.3.0",
    "clipboard": "^2.0.11",
    "concurrently": "^9.1.2",
    "cross-env": "^7.0.3",
    "date-fns": "^2.30.0",
    "exceljs": "^4.3.0",
    "highlight.js": "^11.8.0",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",
    "moment-timezone": "^0.5.43",
    "next": "12.3.4",
    "powerbi-client": "^2.22.3",
    "powerbi-client-react": "^1.4.0",
    "quill": "^1.3.7",
    "react": "17.0.2",
    "react-apexcharts": "^1.4.1",
    "react-bootstrap": "^2.9.0",
    "react-chartjs-2": "^5.2.0",
    "react-date-range": "^1.4.0",
    "react-dom": "17.0.2",
    "react-quill": "^2.0.0",
    "react-select": "^5.7.7",
    "rxjs": "^7.8.2",
    "uuid": "^9.0.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/lodash": "^4.14.198",
    "@types/node": "^20.17.47",
    "@types/react": "^18.3.21",
    "@types/react-dom": "^18.3.7",
    "eslint": "^8",
    "eslint-config-next": "14.1.0",
    "typescript": "^5.8.3"
  }
}
EOF

# Update next.config.js to be compatible
echo "Updating Next.js configuration..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    domains: [],
  },
  // Configure server to use port 3000 (while Angular uses 4200)
  serverRuntimeConfig: {
    port: 3000
  },
  // Add environment variables here
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_ANGULAR_URL: 'http://localhost:4200',
  },
};

module.exports = nextConfig;
EOF

# Fix _app.tsx for compatibility
echo "Restoring _app.tsx..."
cat > src/pages/_app.tsx << 'EOF'
import React from 'react';
import '../styles/app.css';
import '../styles/globals.css';
import { AuthProvider } from '../lib/auth';
import LogoutSynchronizer from '../components/auth/LogoutSynchronizer';
import type { AppProps } from 'next/app';

// Custom App component for global styles and layouts
function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <AuthProvider>
      {/* LogoutSynchronizer monitors for logout events across applications */}
      <LogoutSynchronizer />
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
EOF

# Install dependencies
echo "Installing dependencies..."
npm install

echo "✅ Fix complete! Try running 'npm run dev' to start the application."
