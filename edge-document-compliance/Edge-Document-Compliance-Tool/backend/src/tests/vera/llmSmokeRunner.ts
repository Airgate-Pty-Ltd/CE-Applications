/**
 * LLM Smoke Test Runner
 * 
 * Tests Vera's LLM integration with golden questions.
 * Logs results to files for manual inspection.
 */

import { goldenQuestions } from './goldenQuestions.js';
import { generateVeraResponse } from '../../services/vera/VeraCoreEngine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const TEST_SESSION_ID = 'test-llm-smoke-' + Date.now();
const TEST_USER_ID = 'test-user';

/**
 * Run smoke tests
 */
async function runSmokeTests() {
  console.log('🧪 Starting Vera LLM Smoke Tests...\n');
  
  const results: Array<{
    questionId: string;
    question: string;
    passed: boolean;
    answerLength: number;
    answer: string;
    errors?: string[];
  }> = [];

  for (const golden of goldenQuestions) {
    console.log(`Testing: ${golden.id}...`);
    
    try {
      const response = await generateVeraResponse({
        message: golden.question,
        sessionId: TEST_SESSION_ID,
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        debugMode: false,
      });

      const answer = response.answer || '';
      const answerLength = answer.length;
      
      // Basic checks
      const errors: string[] = [];
      
      if (!answer || answer.trim().length === 0) {
        errors.push('Answer is empty');
      }
      
      if (answer.includes('[LLM_DISABLED]')) {
        errors.push('LLM is disabled (expected if not configured)');
      }
      
      if (answer.includes('[LLM_ERROR]')) {
        errors.push('LLM returned error');
      }
      
      if (golden.minAnswerLength && answerLength < golden.minAnswerLength) {
        errors.push(`Answer too short: ${answerLength} < ${golden.minAnswerLength}`);
      }
      
      // Check for expected topics (basic keyword matching)
      if (golden.expectedTopics) {
        const lowerAnswer = answer.toLowerCase();
        const missingTopics = golden.expectedTopics.filter(
          topic => !lowerAnswer.includes(topic.toLowerCase())
        );
        if (missingTopics.length > 0) {
          errors.push(`Missing expected topics: ${missingTopics.join(', ')}`);
        }
      }
      
      const passed = errors.length === 0;
      
      results.push({
        questionId: golden.id,
        question: golden.question,
        passed,
        answerLength,
        answer,
        errors: errors.length > 0 ? errors : undefined,
      });
      
      console.log(`  ${passed ? '✅' : '❌'} ${golden.id} (${answerLength} chars)`);
      if (errors.length > 0) {
        console.log(`     Errors: ${errors.join(', ')}`);
      }
      
    } catch (error: any) {
      console.error(`  ❌ ${golden.id} - Exception:`, error.message);
      results.push({
        questionId: golden.id,
        question: golden.question,
        passed: false,
        answerLength: 0,
        answer: '',
        errors: [error.message],
      });
    }
  }

  // Write results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = path.join(__dirname, '../../../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `vera_llm_smoke_${timestamp}.txt`);
  const summaryFile = path.join(logDir, `vera_llm_smoke_summary_${timestamp}.json`);
  
  // Write detailed log
  let logContent = `Vera LLM Smoke Test Results\n`;
  logContent += `Generated: ${new Date().toISOString()}\n`;
  logContent += `Total Questions: ${goldenQuestions.length}\n`;
  logContent += `Passed: ${results.filter(r => r.passed).length}\n`;
  logContent += `Failed: ${results.filter(r => !r.passed).length}\n\n`;
  logContent += `='='.repeat(80)}\n\n`;
  
  for (const result of results) {
    logContent += `Question ID: ${result.questionId}\n`;
    logContent += `Question: ${result.question}\n`;
    logContent += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    logContent += `Answer Length: ${result.answerLength} characters\n`;
    if (result.errors && result.errors.length > 0) {
      logContent += `Errors: ${result.errors.join(', ')}\n`;
    }
    logContent += `\nAnswer:\n${result.answer}\n\n`;
    logContent += `='='.repeat(80)}\n\n`;
  }
  
  fs.writeFileSync(logFile, logContent, 'utf8');
  
  // Write summary JSON
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results: results.map(r => ({
      questionId: r.questionId,
      passed: r.passed,
      answerLength: r.answerLength,
      errors: r.errors,
    })),
  };
  
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  
  console.log(`\n✅ Smoke tests complete!`);
  console.log(`   Passed: ${summary.passed}/${summary.total}`);
  console.log(`   Failed: ${summary.failed}/${summary.total}`);
  console.log(`   Log file: ${logFile}`);
  console.log(`   Summary: ${summaryFile}\n`);
  
  // Exit with error code if any tests failed
  if (summary.failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runSmokeTests };

