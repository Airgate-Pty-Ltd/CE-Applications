#!/usr/bin/env node
import dotenv from 'dotenv';
import { getDbIntrospectionReport } from '../src/services/dbIntrospectService.js';

dotenv.config();

async function main() {
  try {
    const report = await getDbIntrospectionReport();
    console.log('[db:introspect] JSON:', JSON.stringify(report));
    process.exit(0);
  } catch (error) {
    console.error('[db:introspect] ❌ Failed to introspect database:', error.message);
    if (error.context) {
      console.error('[db:introspect] Context:', JSON.stringify(error.context));
    }
    process.exit(1);
  }
}

main();


