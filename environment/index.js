/**
 * Environment Configuration Manager
 * 1Channel Retaility Application
 * 
 * This module exports the appropriate environment configuration based on NODE_ENV.
 * It will load one of the following configurations:
 * 
 * - env.local.js     (for local development)
 * - env.qa.js        (for QA environment)
 * - env.preprod.js   (for Pre-production environment)
 * - env.production.js (for Production environment)
 */

// Import all environment configurations
const localEnv = require('./env.local');
const qaEnv = require('./env.qa');
const preprodEnv = require('./env.preprod');
const productionEnv = require('./env.production');

/**
 * Determine which environment configuration to use based on NODE_ENV
 */
const getEnvironmentConfig = () => {
  // Default to development if not specified
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Select the appropriate configuration based on NODE_ENV
  switch (nodeEnv) {
    case 'qa':
      console.log('Using QA environment configuration');
      return qaEnv;
    case 'preprod':
      console.log('Using Preprod environment configuration');
      return preprodEnv;
    case 'production':
      console.log('Using Production environment configuration');
      return productionEnv;
    default:
      console.log('Using Local environment configuration');
      return localEnv;
  }
};

// Get the active environment configuration
const activeEnv = getEnvironmentConfig();

// Merge the active environment configuration into process.env
for (const key in activeEnv) {
  if (Object.prototype.hasOwnProperty.call(activeEnv, key)) {
    process.env[key] = activeEnv[key];
  }
}

// Export the active environment configuration (optional, as it's now in process.env)
module.exports = activeEnv;
