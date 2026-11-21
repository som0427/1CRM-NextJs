// Comprehensive polyfill for Node.js 14 to run Next.js 14
console.log('Applying Node.js compatibility polyfills');

// Add performance polyfill if needed
if (typeof performance === 'undefined') {
  const { performance: nodePerformance } = require('perf_hooks');
  global.performance = nodePerformance;
  console.log('- Applied performance polyfill');
}

// Patch Object.hasOwn for Node.js 14
if (!Object.hasOwn) {
  Object.defineProperty(Object, 'hasOwn', {
    value: function(object, property) {
      if (object === null || object === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      return Object.prototype.hasOwnProperty.call(Object(object), property);
    },
    configurable: true,
    writable: true
  });
  console.log('- Applied Object.hasOwn polyfill');
}

// Add String.prototype.replaceAll polyfill if needed
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(pattern, replacement) {
    return this.split(pattern).join(replacement);
  };
  console.log('- Applied String.prototype.replaceAll polyfill');
}

// Monkey-patch require to transform code that uses new syntax
const Module = require('module');
const originalRequire = Module.prototype.require;
const fs = require('fs');
const path = require('path');

// Function to transform code containing nullish coalescing assignment
function transformCode(code) {
  // Handle nullish coalescing assignment (??=)
  return code.replace(/([^\s]+)\s*\?\?=\s*([^;]+);/g, function(match, left, right) {
    return `if (${left} === undefined || ${left} === null) { ${left} = ${right}; }`;
  });
}

// Monkey-patch the require function to transform code on the fly
Module.prototype.require = function(id) {
  try {
    return originalRequire.call(this, id);
  } catch (error) {
    // Only handle SyntaxError related to nullish coalescing assignment
    if (error instanceof SyntaxError && 
        (error.message.includes('Unexpected token') || 
         error.message.includes('??='))) {
      
      console.warn(`Warning: Syntax error in module '${id}', attempting to transform...`);
      
      try {
        // Try to locate the actual file
        const resolvedPath = Module._resolveFilename(id, this);
        const content = fs.readFileSync(resolvedPath, 'utf8');
        
        // Transform the code
        const transformedContent = transformCode(content);
        
        // Create a temporary file with transformed content
        const tempDir = path.join(__dirname, '.temp-transforms');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFile = path.join(tempDir, path.basename(resolvedPath));
        fs.writeFileSync(tempFile, transformedContent);
        
        console.log(`Transformed module '${id}' to be compatible with Node.js 14`);
        
        // Load the transformed module
        return originalRequire.call(this, tempFile);
      } catch (transformError) {
        console.error(`Error transforming module '${id}':`, transformError);
        throw error; // Throw the original error if transformation fails
      }
    } else {
      throw error; // Re-throw any other errors
    }
  }
};

console.log('Node.js compatibility polyfills applied successfully');
