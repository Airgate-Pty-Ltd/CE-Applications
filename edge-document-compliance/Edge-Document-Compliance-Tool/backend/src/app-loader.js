/**
 * Progressive App Loader
 * Loads app.js and its dependencies one at a time to identify failing imports
 */

process.stdout.write('[app-loader] Starting progressive load...\n');

async function loadAppProgressive() {
  try {
    // Step 1: Load core dependencies
    process.stdout.write('[app-loader] Step 1: Loading core modules...\n');
    await import('./polyfills/web.js');
    process.stdout.write('[app-loader] ✅ Polyfills loaded\n');
    
    await import('express');
    await import('cors');
    await import('dotenv');
    await import('path');
    await import('url');
    process.stdout.write('[app-loader] ✅ Core modules loaded\n');
    
    // Step 2: Load database
    process.stdout.write('[app-loader] Step 2: Loading database...\n');
    await import('./database/connection.js');
    process.stdout.write('[app-loader] ✅ Database loaded\n');
    
    // Step 3: Load routes one by one
    process.stdout.write('[app-loader] Step 3: Loading routes...\n');
    
    const routes = [
      './routes/upload.js',
      './routes/requirements.js',
      './routes/persona.js',
      './routes/regulatory.js',
      './routes/gap.js',
      './routes/parse.js',
      './routes/chat.js',
      './routes/customers.js',
      './routes/users.js',
      './routes/admin.js',
      './routes/feedback.js',
      './routes/learning.js',
      './routes/dbIntrospect.js',
      './routes/regIntel.js',
      './routes/reports.js',
      './routes/mappings.js',
      './routes/documents.js',
      './routes/capa.js',
      './routes/training.js',
      './routes/kpi.js',
      './routes/qms.js',
      './routes/industry.js',
      './routes/i18n.js',
      './routes/anomalies.js',
      './routes/integrations.js',
      './routes/audit.js',
      './routes/predictions.js',
      './routes/diagnostics.js',
      './routes/vera.js',
      './routes/veraChatRoute.js',
      './routes/veraAdmin.routes.js',
      './routes/veraDiagnostics.routes.js',
    ];
    
    for (const routePath of routes) {
      try {
        process.stdout.write(`[app-loader] Loading ${routePath}...\n`);
        await import(routePath);
        process.stdout.write(`[app-loader] ✅ ${routePath} loaded\n`);
      } catch (err) {
        process.stderr.write(`[app-loader] ❌ FAILED to load ${routePath}\n`);
        process.stderr.write(`[app-loader] Error: ${err.message}\n`);
        if (err.stack) {
          process.stderr.write(`[app-loader] Stack: ${err.stack}\n`);
        }
        throw err; // Re-throw to stop loading
      }
    }
    
    process.stdout.write('[app-loader] ✅ All routes loaded\n');
    
    // Step 4: Load services
    process.stdout.write('[app-loader] Step 4: Loading services...\n');
    await import('./services/regulatoryIntelligenceHub.js');
    process.stdout.write('[app-loader] ✅ Services loaded\n');
    
    // Step 5: Load middleware
    process.stdout.write('[app-loader] Step 5: Loading middleware...\n');
    await import('./middleware/enterpriseMiddleware.js');
    process.stdout.write('[app-loader] ✅ Middleware loaded\n');
    
    // Step 6: Finally load the full app
    process.stdout.write('[app-loader] Step 6: Loading full app.js...\n');
    const appModule = await import('./app.js');
    process.stdout.write('[app-loader] ✅ App.js loaded successfully!\n');
    
    return appModule;
    
  } catch (err) {
    process.stderr.write(`[app-loader] ❌ Progressive load failed\n`);
    process.stderr.write(`[app-loader] Error: ${err.message}\n`);
    if (err.stack) {
      process.stderr.write(`[app-loader] Stack:\n${err.stack}\n`);
    }
    throw err;
  }
}

export default loadAppProgressive;

