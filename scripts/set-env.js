/**
 * Environment Switcher Script
 * 
 * This script helps set environment configurations for the Retaility Next.js app.
 * It creates a cross-platform compatible way to run the app with different environments.
 * 
 * Usage: node scripts/set-env.js [environment] [command]
 * 
 * Environments:
 * - local (default): Local development environment
 * - qa: Quality Assurance environment
 * - preprod: Pre-production environment
 * - prod: Production environment
 * 
 * Commands:
 * - dev (default): Run development server
 * - build: Build the application
 * - start: Start production server
 */

const { spawn } = require('child_process');
const path = require('path');

// Get arguments
const args = process.argv.slice(2);
const env = args[0] || 'local';
const command = args[1] || 'dev';

// Map environment names to NODE_ENV values
const envMap = {
  'local': 'development',
  'qa': 'qa',
  'preprod': 'preprod',
  'prod': 'production'
};

// Ensure valid environment
if (!envMap[env]) {
  console.error(`Error: '${env}' is not a valid environment. Use local, qa, preprod, or prod.`);
  process.exit(1);
}

// Ensure valid command
if (!['dev', 'build', 'start'].includes(command)) {
  console.error(`Error: '${command}' is not a valid command. Use dev, build, or start.`);
  process.exit(1);
}

// Get the appropriate .env file
const envFile = env === 'local' ? '.env.local' : `.env.${envMap[env]}`;
console.log(`\n✨ Using environment: ${env.toUpperCase()} (${envFile})\n`);

// Set environment variable and run Next.js command
const nodeEnv = envMap[env];
const nextCommand = command;

// Create cross-platform process with environment variables
const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(cmd, ['run', nextCommand], {
  env: { ...process.env, NODE_ENV: nodeEnv },
  stdio: 'inherit',
  shell: true
});

// Handle process events
child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
});

child.on('error', (err) => {
  console.error('Failed to start process:', err);
  process.exit(1);
});
