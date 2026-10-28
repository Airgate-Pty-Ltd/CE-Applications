#!/usr/bin/env node
/**
 * Repository-wide syntax check.
 * Runs `node --check` on every JS/CJS/MJS file.
 * Falls back to manual file traversal when git is unavailable (e.g. Railway runtime).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const JS_REGEX = /\.(mjs|cjs|js)$/i;
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.railway',
  '.cursor',
  '.vscode',
  'dist',
  'build'
]);

function listFilesWithGit() {
  try {
    const result = execSync('git ls-files "*.js" "*.mjs" "*.cjs"', {
      encoding: 'utf8'
    });
    return result
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn('[check:syntax] git not available, falling back to filesystem scan.');
    return null;
  }
}

function listFilesByWalk(startDir = process.cwd()) {
  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (JS_REGEX.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(startDir);
  return files;
}

function runSyntaxCheck(files) {
  if (files.length === 0) {
    console.log('[check:syntax] No JavaScript files found. Skipping.');
    return;
  }

  for (const file of files) {
    try {
      execSync(`node --check "${file}"`, { stdio: 'ignore' });
    } catch (error) {
      console.error(`❌ Syntax error in ${file}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log(`[check:syntax] ✅ All ${files.length} files passed syntax check.`);
}

const files = listFilesWithGit() ?? listFilesByWalk();
runSyntaxCheck(files);

