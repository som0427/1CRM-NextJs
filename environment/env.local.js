/**
 * Local Environment Configuration using QA Settings
 * 1Channel Retaility Application
 */

module.exports = {
  // API Configuration - Use localhost for development
  NEXT_PUBLIC_API_URL: 'https://endpoints-backend.api.qa.postgres.assistive.site/retailitynew',
  
  NEXT_PUBLIC_AUTH_API_PATH: '/login/api/auth/login',
  NEXT_PUBLIC_MENU_API_PATH: '/login/api/menu/assignedWebMenus',
  
  // Application Configuration
  NEXT_PUBLIC_APP_NAME: '1Channel',
  NEXT_PUBLIC_APP_ENV: 'local', // Set to local for development
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000/next',
  
  // Angular Integration
  NEXT_PUBLIC_ANGULAR_URL: 'https://qa.1channel.co',
  
  // Debug Configuration
  NEXT_PUBLIC_ENABLE_DEBUG: 'true',
  
  // Auth Configuration
  NEXT_PUBLIC_AUTH_STORAGE_KEY: 'authToken',
  NEXT_PUBLIC_AUTH_REDIRECT: '/dashboard',

  // Static File Base URL
  NEXT_PUBLIC_STATIC_FILE_BASE_URL: 'https://static.qa.1channel.co/'
};
