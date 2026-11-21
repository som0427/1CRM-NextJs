// Script to run both Angular and Next.js applications in parallel
const path = require('path');
const concurrently = require('concurrently');

// Paths to projects
const NEXTJS_PATH = path.resolve(__dirname, '..');  // parent directory of scripts folder
const ANGULAR_PATH = '/Users/pawan/Desktop/Angular-Metronic/retality-angular';

console.log('\n🔄 Starting both Next.js and Angular development servers...\n');

// Run both applications in parallel using concurrently
concurrently([
  { 
    command: 'npm run dev', 
    name: 'NEXT.JS', 
    prefixColor: 'blue',
    cwd: NEXTJS_PATH
  },
  { 
    command: 'npm run start', 
    name: 'ANGULAR', 
    prefixColor: 'red',
    cwd: ANGULAR_PATH 
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
}).then(
  () => console.log('\n✅ All processes completed successfully'),
  (err) => console.error('\n❌ Error occurred:', err)
);

console.log('\n🚀 Applications will be available at:');
console.log('- Angular: http://localhost:4200');
console.log('- Next.js: http://localhost:3000');
console.log('\nPress Ctrl+C to stop both servers.\n');
