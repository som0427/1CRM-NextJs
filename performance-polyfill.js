// Add performance polyfill for Node.js v14
if (typeof performance === 'undefined') {
  const { performance: nodePerformance } = require('perf_hooks');
  global.performance = nodePerformance;
  console.log('Applied performance polyfill for Node.js compatibility');
}
