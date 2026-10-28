/**
 * Git Helper Script
 * Runs git commands programmatically to bypass PowerShell issues
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

function runGitCommand(command, options = {}) {
  const fullCommand = `git ${command}`;
  console.log(`\n🔧 Running: ${fullCommand}`);
  
  try {
    const result = execSync(fullCommand, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    console.error(`\n❌ Error running: ${fullCommand}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  console.log('🚀 Git Helper Script');
  console.log('='.repeat(60));

  switch (command) {
    case 'status':
      runGitCommand('status');
      break;

    case 'add':
      const files = args.slice(1);
      if (files.length === 0 || (files.length === 1 && files[0] === '.')) {
        runGitCommand('add .');
      } else {
        const filesToAdd = files.join(' ');
        runGitCommand(`add ${filesToAdd}`);
      }
      break;

    case 'commit':
      const message = args.slice(1).join(' ') || 'Update: Automated commit';
      // Escape quotes and handle multi-line messages
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      runGitCommand(`commit -m "${escapedMessage}"`);
      break;

    case 'push': {
      const branch = args[1] || 'main';
      // First, stage any changes
      console.log('\n📦 Checking for changes to stage...');
      const statusResult = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (statusResult.trim()) {
        console.log('Found uncommitted changes, staging...');
        const addResult = runGitCommand('add .');
        if (!addResult.success) {
          console.error('❌ Failed to stage changes');
          process.exit(1);
        }
        
        // If there's a commit message in args, commit first
        const commitMsg = args.slice(2).join(' ') || 'Auto-commit: Changes before push';
        console.log('\n💾 Committing staged changes...');
        const escapedMsg = commitMsg.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const commitResult = runGitCommand(`commit -m "${escapedMsg}"`);
        // Don't fail if nothing to commit (already committed)
      }
      
      // Now push
      console.log(`\n🚀 Pushing to origin/${branch}...`);
      const pushResultPush = runGitCommand(`push origin ${branch}`);
      
      if (pushResultPush.success) {
        // Verify push succeeded by checking if remote was updated
        console.log('\n✅ Verifying push...');
        try {
          execSync('git fetch origin ' + branch, {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: 'pipe'
          });
          
          const localHash = execSync('git rev-parse HEAD', {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: 'pipe'
          }).trim();
          
          const remoteHash = execSync(`git rev-parse origin/${branch}`, {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: 'pipe'
          }).trim();
          
          if (localHash === remoteHash) {
            console.log('✅ SUCCESS: Push verified - local and remote are in sync');
            console.log(`   Commit: ${localHash.substring(0, 7)}`);
          } else {
            console.log('⚠️  Push completed but hashes differ (may need time to propagate)');
            console.log(`   Local:  ${localHash.substring(0, 7)}`);
            console.log(`   Remote: ${remoteHash.substring(0, 7)}`);
          }
        } catch (verifyError) {
          console.log('⚠️  Could not verify push, but push command succeeded');
        }
      } else {
        console.error('❌ Push failed');
        process.exit(1);
      }
      break;
    }

    case 'pull':
      const pullBranch = args[1] || 'main';
      runGitCommand(`pull origin ${pullBranch}`);
      break;

    case 'all':
      // Do everything: add, commit, push
      const commitMsg = args.slice(1).join(' ') || 'Update: Automated commit';
      console.log('\n📦 Staging all changes...');
      const addResult = runGitCommand('add .');
      if (!addResult.success) {
        console.error('❌ Failed to stage changes');
        process.exit(1);
      }
      
      console.log('\n💾 Committing changes...');
      // Escape quotes and newlines for commit message
      const escapedMsg = commitMsg.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      const commitResult = runGitCommand(`commit -m "${escapedMsg}"`);
      if (!commitResult.success) {
        console.error('❌ Failed to commit changes');
        process.exit(1);
      }
      
      console.log('\n🚀 Pushing to remote...');
      const pushResult = runGitCommand('push origin main');
      if (!pushResult.success) {
        console.error('❌ Failed to push changes');
        process.exit(1);
      }
      
      console.log('\n✅ Done! All changes committed and pushed successfully.');
      break;

    default:
      // Run the command as-is
      runGitCommand(args.join(' '));
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

