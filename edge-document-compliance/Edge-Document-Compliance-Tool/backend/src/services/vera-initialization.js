/**
 * VERA Initialization Service
 * Checks Mistral/Ollama health on application startup and monitors continuously
 */

import { getVeraMistralService, setMistralAvailable, isMistralAvailable } from './vera-mistral-service.js';
import { createLogger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const logger = createLogger('VERA-INIT');

// Get the path to the start-ollama.ps1 script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const startOllamaScript = join(__dirname, '../../scripts/start-ollama.ps1');

let healthCheckInterval = null;
const HEALTH_CHECK_INTERVAL_MS = parseInt(process.env.MISTRAL_HEALTH_CHECK_INTERVAL_MS || '120000', 10); // Default 2 minutes

/**
 * Attempt to start Ollama service using PowerShell script
 * @returns {Promise<boolean>} True if Ollama was started or already running, false otherwise
 */
async function attemptStartOllama() {
  // Skip auto-start in production/cloud environments (Railway, etc.)
  // These environments should have Ollama as a separate service
  if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
    logger.debug('Skipping Ollama auto-start (production/cloud environment)');
    logger.info('💡 In production, Ollama should be deployed as a separate service');
    return false;
  }

  // Only attempt on Windows (where PowerShell is available)
  if (process.platform !== 'win32') {
    logger.debug('Skipping Ollama auto-start (not Windows)');
    return false;
  }

  // Check if script exists
  if (!existsSync(startOllamaScript)) {
    logger.warn('Ollama start script not found', { path: startOllamaScript });
    return false;
  }

  try {
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    
    logger.info('Attempting to start Ollama service...', { endpoint: ollamaEndpoint });
    
    // Execute PowerShell script
    // Use -ExecutionPolicy Bypass to avoid policy issues
    // Use -NoProfile for faster startup
    const command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -File "${startOllamaScript}" -OllamaEndpoint "${ollamaEndpoint}"`;
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 35000, // 35 seconds (script has 30s timeout + buffer)
      maxBuffer: 1024 * 1024 // 1MB buffer for output
    });
    
    if (stdout) {
      logger.info('Ollama start script output:', { output: stdout.trim() });
    }
    
    if (stderr && !stderr.includes('Warning')) {
      logger.warn('Ollama start script warnings:', { warnings: stderr.trim() });
    }
    
    // Check exit code by looking for success indicators in output
    if (stdout.includes('OLLAMA STARTED SUCCESSFULLY') || stdout.includes('already running')) {
      logger.info('✅ Ollama service started or already running');
      return true;
    }
    
    return false;
  } catch (error) {
    // Don't fail initialization if Ollama can't be started
    // It might already be running, or user might start it manually
    logger.warn('Could not start Ollama automatically (non-fatal)', {
      error: error.message,
      code: error.code,
      signal: error.signal
    });
    logger.info('💡 You can start Ollama manually or it may already be running');
    return false;
  }
}

/**
 * Perform deep health check and update availability state
 * @returns {Promise<boolean>} True if Mistral is online and ready, false otherwise
 */
async function performDeepHealthCheck() {
  try {
    const mistralService = getVeraMistralService();
    
    logger.debug('Performing deep health check...');
    const health = await mistralService.deepHealthCheck();
    
    if (health.status === 'ok' && health.modelAvailable && health.modelResponsive) {
      setMistralAvailable(true, 'Deep health check passed - connectivity and model responsiveness verified');
      logger.info('✅ Mistral is online and ready', {
        endpoint: health.endpoint,
        model: health.model,
        connectivity: health.connectivity,
        modelResponsive: health.modelResponsive,
        timestamp: health.timestamp
      });
      return true;
    } else {
      const reason = health.error || `Status: ${health.status}, Model available: ${health.modelAvailable}, Responsive: ${health.modelResponsive || false}`;
      setMistralAvailable(false, reason);
      logger.warn('⚠️ Mistral is offline or not ready', {
        status: health.status,
        endpoint: health.endpoint,
        model: health.model,
        error: health.error,
        errorType: health.errorType,
        modelAvailable: health.modelAvailable,
        modelResponsive: health.modelResponsive
      });
      
      if (health.errorType === 'model_not_found') {
        logger.warn('💡 Model not found. Run: ollama pull mistral');
      } else if (health.errorType === 'network' || health.errorType === 'timeout') {
        logger.warn('💡 To start Ollama: C:\\Users\\oleab\\AppData\\Local\\Programs\\Ollama\\ollama.exe serve');
      }
      
      return false;
    }
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    setMistralAvailable(false, `Health check exception: ${errorMessage}`);
    logger.error('Deep health check exception', {
      error: errorMessage,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Start periodic health check monitoring
 */
function startPeriodicHealthCheck() {
  // Clear any existing interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  logger.info('Starting periodic Mistral health check', {
    intervalMs: HEALTH_CHECK_INTERVAL_MS,
    intervalSeconds: HEALTH_CHECK_INTERVAL_MS / 1000
  });
  
  healthCheckInterval = setInterval(async () => {
    try {
      await performDeepHealthCheck();
    } catch (error) {
      // Never let the health check crash the process
      logger.error('Periodic health check error (non-fatal)', {
        error: error.message
      });
    }
  }, HEALTH_CHECK_INTERVAL_MS);
  
  // Store interval ID for cleanup if needed
  if (typeof global !== 'undefined') {
    global.veraHealthCheckInterval = healthCheckInterval;
  }
}

/**
 * Stop periodic health check monitoring
 */
export function stopPeriodicHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('Stopped periodic Mistral health check');
  }
}

/**
 * Initialize VERA and check Mistral service health
 * @returns {Promise<boolean>} True if Mistral is online, false otherwise
 */
export async function initializeVERA() {
  try {
    logger.info('Initializing VERA...');
    
    // Check if Mistral is enabled
    const mistralEnabled = process.env.MISTRAL_ENABLED_IN_CHAT === 'true' || 
                          process.env.ENABLE_MISTRAL === 'true';
    
    if (!mistralEnabled) {
      logger.info('Mistral integration is disabled - skipping health check');
      setMistralAvailable(false, 'Mistral integration disabled via environment variables');
      return true; // Not an error, just disabled
    }
    
    // Attempt to start Ollama if it's not running (Windows only)
    // This ensures Ollama is available when VERA needs it
    const autoStartEnabled = process.env.AUTO_START_OLLAMA !== 'false'; // Default to true
    if (autoStartEnabled) {
      logger.info('Checking Ollama service status...');
      await attemptStartOllama();
      // Give Ollama a moment to fully start if it was just launched
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      logger.info('Ollama auto-start is disabled (AUTO_START_OLLAMA=false)');
    }
    
    // Perform initial deep health check
    logger.info('Performing initial deep health check...');
    const isHealthy = await performDeepHealthCheck();
    
    // Start periodic health check monitoring
    startPeriodicHealthCheck();
    
    return isHealthy;
    
  } catch (error) {
    logger.error('Failed to initialize VERA', {
      error: error.message,
      stack: error.stack
    });
    setMistralAvailable(false, `Initialization error: ${error.message}`);
    // Don't throw - allow app to start even if Mistral is unavailable
    return false;
  }
}

export default {
  initializeVERA,
  stopPeriodicHealthCheck,
  performDeepHealthCheck
};
