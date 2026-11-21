declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'|'preprod';
    NEXT_PUBLIC_API_URL: string;
    // Add other environment variables you'll use
  }
}
