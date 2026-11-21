import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState } from 'react';
import authService from '../../lib/services/authService';
import { transformMenuItems } from '../../lib/utils/menuTransform';

interface SyncData {
  authToken?: string | null;
  userData?: string | null;
  authce9d77b308c149d5992a80073637e4d5?: string | null;
  currentUser?: string | null;
  menuPermission?: string | null;
  pageTitle?: string | null;
  pluralName?: string | null;
  selectedProject?: string | null;
  singularName?: string | null;
  systemLogo?: string | null;
  systemName?: string | null;
  userMenu?: string | null;
  userProject?: string | null;
  currentRoute?: string | null;
}

export default function Sync() {
  const router = useRouter();
  const [token, setToken] = useState<string | undefined>();
  const [page, setPage] = useState<string | undefined>();
  const [syncData, setSyncData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wait for router.isReady before reading query params
  useEffect(() => {
    if (router.isReady) {
      setToken(typeof router.query.token === 'string' ? router.query.token : undefined);
      setPage(typeof router.query.page === 'string' ? router.query.page : undefined);
    }
  }, [router.isReady, router.query.token, router.query.page]);

  useEffect(() => {
    const fetchAndSet = async () => {
      if (token && token.length > 0) {
        // Check if token already exists in localStorage's authToken
        const existingToken = localStorage.getItem('authToken');
        
        // If tokens match, redirect directly to page without resetting localStorage
        if (existingToken && existingToken === token && page) {
          console.log('Token match found in localStorage, redirecting directly');
          localStorage.setItem('redirectPage', page);
          window.location.replace(page);
          return;
        }
        
        // If tokens don't match, proceed with existing sync logic
        setLoading(true);
        setError(null);
        try {
          const data = await authService.fetchSyncData(token);
          setSyncData(data);
          // Only set allowed keys in localStorage
          const allowedKeys = [
            'authToken',
            'userData',
            'currentUser',
            'menuPermission',
            'pageTitle',
            'pluralName',
            'selectedProject',
            'singularName',
            'systemLogo',
            'systemName',
            'userMenu',
            'userProject'
          ];
          Object.entries(data).forEach(([key, value]) => {
            if (allowedKeys.includes(key)) {
              if (key === 'userMenu') {
                // Only transform if not already nav-ready
                try {
                  let parsedMenu = typeof value === 'string' ? JSON.parse(value) : value;
                  // If menu is wrapped as {header: {self: {}, items: [...]}} extract only items
                  if (parsedMenu && parsedMenu.header && Array.isArray(parsedMenu.header.items)) {
                    console.log('userMenu has header.items wrapper, extracting items array');
                    parsedMenu = parsedMenu.header.items;
                  }
                  if (Array.isArray(parsedMenu) && parsedMenu.length > 0 && parsedMenu[0].title && parsedMenu[0].menuId) {
                    console.log('userMenu is already nav-ready, storing as-is', parsedMenu);
                    localStorage.setItem('userMenu', JSON.stringify(parsedMenu));
                    sessionStorage.setItem('userMenu', JSON.stringify(parsedMenu));
                  } else {
                    console.log('userMenu needs transformation, transforming...', parsedMenu);
                    const transformedMenu = transformMenuItems(parsedMenu);
                    localStorage.setItem('userMenu', JSON.stringify(transformedMenu));
                    sessionStorage.setItem('userMenu', JSON.stringify(transformedMenu));
                  }
                } catch (e) {
                  // Fallback: store as is
                  localStorage.setItem('userMenu', typeof value === 'string' ? value : JSON.stringify(value));
                  sessionStorage.setItem('userMenu', typeof value === 'string' ? value : JSON.stringify(value));
                }
              } else if (typeof value === 'string') {
                localStorage.setItem(key, value);
                sessionStorage.setItem(key, value);
              } else {
                localStorage.setItem(key, JSON.stringify(value));
                sessionStorage.setItem(key, JSON.stringify(value));
              }
            }
          });

          // Redirect to the page specified in the 'page' variable after storing data
          setTimeout(() => {
            if (page) {
              localStorage.setItem('redirectPage', page);
              window.location.replace(page);
            }
          }, 60);
        } catch (e: any) {
          setError(e.message || 'Failed to fetch sync data');
        } finally {
          setLoading(false);
        }
      }
    };
    if (token) fetchAndSet();
  }, [token, page]);

  return (
    <>
      <Head>
        <title>Syncing data...</title>
      </Head>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-medium text-gray-700">Syncing data from Angular application...</h1>
          <div className="mt-4 bg-gray-100 p-4 rounded text-left max-w-2xl mx-auto overflow-x-auto">
            {loading && <div className="text-blue-500">Loading sync data...</div>}
            {error && <div className="text-red-500">{error}</div>}
             {/*<div className="mb-2">
              <strong>Token:</strong> {token ? token : <span className="text-gray-400">(not provided)</span>}
            </div>
            <div className="mb-2">
              <strong>Page:</strong> {page ? page : <span className="text-gray-400">(not provided)</span>}
            </div> 
            
            {syncData && (
              <div className="mt-4">
                <strong>Decoded Sync Data:</strong>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">{JSON.stringify(syncData, null, 2)}</pre>
              </div>
            )}*/}
          </div>
        </div>
      </div>
    </>
  );
}
