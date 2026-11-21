/**
 * Preprod Environment Configuration
 * 1Channel Retaility Application
 */

module.exports = {
  // API Configuration
  NEXT_PUBLIC_API_URL: 'https://endpoints-backend.api.preprod.assistive.site/retailitynew',
  NEXT_PUBLIC_AUTH_API_PATH: '/login/api/auth/login',
  NEXT_PUBLIC_MENU_API_PATH: '/login/api/menu/assignedWebMenus',
  
  // Application Configuration
  NEXT_PUBLIC_APP_NAME: '1Channel',
  NEXT_PUBLIC_APP_ENV: 'preprod',

  NEXT_PUBLIC_BASE_URL: 'https://preprod.next.1channel.co',
  
  // Angular Integration
  NEXT_PUBLIC_ANGULAR_URL: 'https://preprod.1channel.co',
  
  // Debug Configuration
  NEXT_PUBLIC_ENABLE_DEBUG: 'false',
  
  // Auth Configuration
  NEXT_PUBLIC_AUTH_STORAGE_KEY: 'authToken',
  NEXT_PUBLIC_AUTH_REDIRECT: '/dashboard',

  // Static File Base URL
  NEXT_PUBLIC_STATIC_FILE_BASE_URL: 'https://static.preprod.1channel.co/'
  
  
};
