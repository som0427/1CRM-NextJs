/**
 * React 18 root initialization helper
 * This file provides a utility function to create a React 18 root
 * which is required for proper rendering in Next.js 14
 */

// For compatibility with both React 17 and React 18 code patterns
let hydrateRoot: any;
let createRoot: any;

// Using dynamic imports to avoid build errors on Node 14
if (typeof window !== 'undefined') {
  // Only load on client side
  const reactDomClient = require('react-dom/client');
  createRoot = reactDomClient.createRoot;
  hydrateRoot = reactDomClient.hydrateRoot;
}

/**
 * Creates a React 18 root for rendering
 */
export function createReactRoot(container: Element, initialChildren: React.ReactNode) {
  if (typeof window === 'undefined') return null;
  
  if (process.env.NODE_ENV === 'development') {
    const root = createRoot(container);
    root.render(initialChildren);
    return root;
  }
  
  // For production SSR
  return hydrateRoot(container, initialChildren);
}
