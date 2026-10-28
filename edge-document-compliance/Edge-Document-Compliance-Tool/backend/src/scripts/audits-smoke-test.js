/**
 * Audit Module Smoke Test
 * Tests basic audit flow: create → generate checklist → submit → close
 */

import { query } from '../database/connection.js';
import { login } from '../modules/auth/authService.js';
import { createNewAudit, generateChecklist } from '../modules/audits/services/auditCreationService.js';
import { submitAudit, closeAudit } from '../modules/audits/services/auditLifecycleService.js';
import { createSourceDocument } from '../modules/audits/services/sourceDocumentService.js';
import { extractRequirementsFromSource } from '../modules/audits/services/requirementExtractionService.js';

async function smokeTest() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  AUDIT MODULE SMOKE TEST                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Login
    console.log('1. Testing login...');
    const loginResult = await login('admin@example.com', 'admin123');
    console.log('   ✓ Login successful');
    console.log(`   User: ${loginResult.user.email}, Roles: ${loginResult.user.roles.join(', ')}`);

    const tenantId = loginResult.user.tenantId;
    const userId = loginResult.user.id;

    // Step 2: Create source document
    console.log('\n2. Creating source document...');
    const sourceDoc = await createSourceDocument({
      tenant_id: tenantId,
      source_type: 'STANDARD',
      name: 'ISO 9001:2015 (Test)',
      code: 'ISO9001',
      revision: '2015',
      authority: 'ISO',
      extracted_text: `
        7.5.3.2 The organization shall retain documented information to the extent necessary:
        a) to have confidence that the processes are being carried out as planned;
        b) to demonstrate the conformity of products and services to their requirements.
        
        8.2.1 The organization shall determine:
        a) requirements specified by the customer;
        b) requirements not stated by the customer but necessary for the specified or intended use.
      `
    });
    console.log(`   ✓ Source document created: ${sourceDoc.id}`);

    // Step 3: Extract requirements
    console.log('\n3. Extracting requirements...');
    const requirements = await extractRequirementsFromSource(sourceDoc.id, tenantId);
    console.log(`   ✓ Extracted ${requirements.length} requirements`);

    // Step 4: Create audit
    console.log('\n4. Creating audit...');
    const audit = await createNewAudit({
      tenant_id: tenantId,
      title: 'Smoke Test Audit',
      description: 'Automated smoke test audit',
      audit_type: 'STANDARD',
      created_by: userId
    });
    console.log(`   ✓ Audit created: ${audit.id}, Status: ${audit.status}`);

    // Step 5: Generate checklist
    console.log('\n5. Generating checklist...');
    const auditPack = await generateChecklist(audit.id, tenantId, {
      sourceIds: [sourceDoc.id],
      filters: {
        granularity: 'high',
        evidenceDepth: 'standard'
      }
    });
    console.log(`   ✓ Checklist generated with ${auditPack.items.length} items`);

    // Step 6: Submit audit
    console.log('\n6. Submitting audit...');
    const submitted = await submitAudit(audit.id, tenantId, userId);
    console.log(`   ✓ Audit submitted, Status: ${submitted.status}`);

    // Step 7: Close audit (would normally require Lead Auditor role)
    console.log('\n7. Closing audit...');
    const closed = await closeAudit(audit.id, tenantId, userId);
    console.log(`   ✓ Audit closed, Status: ${closed.status}`);

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SMOKE TEST PASSED                                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    return { success: true };
  } catch (error) {
    console.error('\n❌ SMOKE TEST FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  smokeTest()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { smokeTest };
