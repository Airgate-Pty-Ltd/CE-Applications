/**
 * Vera Chat Engine Wrapper (JavaScript)
 * Wraps the TypeScript VeraChatEngine for use in JavaScript codebase
 * CRITICAL: This module must not throw during import - all errors must be deferred
 */

let VeraChatEngine = null;
let engineInstance = null;
let loadError = null;
let tsxRegistered = false;

/**
 * Register tsx loader for TypeScript files (ESM)
 * This enables Node.js to import .ts files directly
 */
async function registerTsxLoader() {
  if (tsxRegistered) return;
  
  try {
    // For tsx v4+, try the ESM API
    try {
      const tsxApi = await import('tsx/esm/api');
      if (tsxApi && typeof tsxApi.register === 'function') {
        tsxApi.register();
        tsxRegistered = true;
        console.log('[VeraChatEngineWrapper] ✅ tsx loader registered via tsx/esm/api');
        return;
      }
    } catch (esmErr) {
      // Try alternative import path
    }
    
    // Alternative: try tsx/cjs/api for CommonJS-style
    try {
      const tsxCjs = await import('tsx/cjs/api');
      if (tsxCjs && typeof tsxCjs.register === 'function') {
        tsxCjs.register();
        tsxRegistered = true;
        console.log('[VeraChatEngineWrapper] ✅ tsx loader registered via tsx/cjs/api');
        return;
      }
    } catch (cjsErr) {
      // Try direct tsx import
    }
    
    // Last resort: try importing tsx directly
    const tsx = await import('tsx');
    if (tsx && typeof tsx.register === 'function') {
      tsx.register();
      tsxRegistered = true;
      console.log('[VeraChatEngineWrapper] ✅ tsx loader registered via direct import');
    }
  } catch (err) {
    // tsx might not be available - that's okay, we'll try other methods
    console.warn('[VeraChatEngineWrapper] Could not register tsx loader:', err.message);
  }
}

/**
 * Load and initialize the TypeScript engine
 * Tries multiple strategies to load the compiled JavaScript
 * CRITICAL: Never throws - returns null if engine cannot be loaded
 */
async function loadEngine() {
  if (engineInstance) {
    return engineInstance;
  }

  // If we've already tried and failed, return null immediately
  if (loadError) {
    console.warn('[VeraChatEngineWrapper] Engine previously failed to load, skipping retry');
    return null;
  }

  try {
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const fs = await import('fs/promises');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Try multiple import strategies
    let module;
    let getVeraChatEngine;
    
    // Strategy 1: Try compiled JavaScript in dist directory (production)
    // dist is at backend/dist/src/vera/veraChatEngine.js
    // From backend/src/vera/veraChatEngineWrapper.js, go up 2 levels to backend, then to dist
    try {
      const distPath = path.resolve(__dirname, '../../dist/src/vera/veraChatEngine.js');
      const normalizedPath = path.normalize(distPath);
      
      // Check if file exists first
      try {
        await fs.access(normalizedPath);
        // File exists, try to import it
        // Use pathToFileURL for proper file:// URL construction
        const { pathToFileURL } = await import('url');
        const distUrl = pathToFileURL(normalizedPath).href;
        
        console.log('[VeraChatEngineWrapper] ✅ Found compiled file at:', normalizedPath);
        console.log('[VeraChatEngineWrapper] Attempting to load from:', distUrl);
        module = await import(distUrl);
        getVeraChatEngine = module.getVeraChatEngine || module.default?.getVeraChatEngine;
        if (getVeraChatEngine && typeof getVeraChatEngine === 'function') {
          engineInstance = getVeraChatEngine();
          console.log('[VeraChatEngineWrapper] ✅ TypeScript engine loaded successfully from dist');
          return engineInstance;
        } else {
          console.warn('[VeraChatEngineWrapper] Module loaded but getVeraChatEngine not found or not a function');
        }
      } catch (accessError) {
        // File doesn't exist, continue to next strategy
        console.warn('[VeraChatEngineWrapper] Dist file not found:', normalizedPath, accessError.message);
      } catch (importError) {
        // Import failed
        console.error('[VeraChatEngineWrapper] Failed to import from dist:', importError.message);
        if (importError.stack) {
          console.error('[VeraChatEngineWrapper] Import error stack:', importError.stack.split('\n').slice(0, 5).join('\n'));
        }
      }
    } catch (distError) {
      console.warn('[VeraChatEngineWrapper] Dist import failed:', distError.message);
    }
    
    // Strategy 2: Try compiled JavaScript in same directory (development)
    try {
      const localPath = path.resolve(__dirname, './veraChatEngine.js');
      try {
        await fs.access(localPath);
        module = await import('./veraChatEngine.js');
        getVeraChatEngine = module.getVeraChatEngine || module.default?.getVeraChatEngine;
        if (getVeraChatEngine) {
          engineInstance = getVeraChatEngine();
          console.log('[VeraChatEngineWrapper] ✅ TypeScript engine loaded from local .js');
          return engineInstance;
        }
      } catch (accessError) {
        // File doesn't exist
      }
    } catch (jsError) {
      console.warn('[VeraChatEngineWrapper] Local .js import failed:', jsError.message);
    }
    
    // Strategy 3: Try importing .ts file directly (development with tsx)
    // ONLY if tsx is properly registered - NEVER try to import .ts directly without tsx
    // This prevents "Unexpected identifier" errors when Node.js tries to parse TypeScript as JavaScript
    try {
      await registerTsxLoader();
      if (tsxRegistered) {
        // Only try importing .ts if tsx was successfully registered
        module = await import('./veraChatEngine.ts');
        getVeraChatEngine = module.getVeraChatEngine || module.default?.getVeraChatEngine;
        if (getVeraChatEngine) {
          engineInstance = getVeraChatEngine();
          console.log('[VeraChatEngineWrapper] ✅ TypeScript engine loaded via .ts import');
          return engineInstance;
        }
      } else {
        // tsx not registered - skip .ts import to avoid syntax errors
        console.warn('[VeraChatEngineWrapper] Skipping .ts import - tsx not registered (this is normal in production)');
      }
    } catch (tsError) {
      // tsx not available or failed - that's okay, skip .ts import
      console.warn('[VeraChatEngineWrapper] .ts import skipped - tsx not available:', tsError.message);
    }
    
    // All strategies failed
    throw new Error('All import strategies failed. Compiled JavaScript not found. Run "npm run build:vera" to compile TypeScript.');
    
  } catch (error) {
    console.error('[VeraChatEngineWrapper] ⚠️  Could not load TypeScript engine:', error.message);
    if (error.stack) {
      console.error('[VeraChatEngineWrapper] Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    loadError = error;
    // CRITICAL: Don't throw - return null so app can continue
    return null;
  }
}

/**
 * Main chat function - wraps TypeScript engine
 * CRITICAL: Returns error response if engine cannot be loaded (does not throw)
 */
export async function chat(options) {
  const engine = await loadEngine();
  
  if (!engine) {
    // Return a graceful error response instead of throwing
    return {
      response: 'I apologize, but my advanced chat engine is currently unavailable. Please try again in a moment, or use the standard chat interface.',
      intent: 'error',
      metadata: {
        error: 'VeraChatEngine not available',
        fallback: true
      }
    };
  }
  
  try {
    return await engine.chat(options);
  } catch (error) {
    console.error('[VeraChatEngineWrapper] Error in chat function:', error);
    return {
      response: 'I encountered an error processing your request. Please try rephrasing your question or try again later.',
      intent: 'error',
      metadata: {
        error: error.message,
        fallback: true
      }
    };
  }
}

/**
 * Get engine instance
 */
export async function getEngine() {
  return await loadEngine();
}

export default { chat, getEngine };

