#!/usr/bin/env node
// Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
//
// Verifies the immutable M-AI Kernel vendor copy before builds and releases.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const vendorRoot = path.join(repoRoot, 'vendor', 'm-ai-kernel', 'ba2a1cf-f81fbf10');
const kernelRoot = path.join(vendorRoot, 'kernel');
const runtimeRoot = path.join(vendorRoot, 'runtime');
const provenancePath = path.join(vendorRoot, 'PROVENANCE.json');

function walkFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(absolutePath, files);
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
function describeTree(treeRoot) {
  const entries = walkFiles(treeRoot)
  .map((absolutePath) => ({
    relativePath: path.relative(treeRoot, absolutePath).split(path.sep).join('/'),
    length: fs.statSync(absolutePath).size,
    sha256: sha256File(absolutePath),
  }))
  .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const canonical = `${entries
    .map((entry) => `${entry.sha256} ${entry.length} ${entry.relativePath}`)
    .join('\n')}\n`;
  const treeHash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').toUpperCase();
  return { entries, treeHash };
}

function verifyTree(label, treeRoot, expectedCount, expectedHash) {
  const actual = describeTree(treeRoot);
  const normalizedExpectedHash = String(expectedHash).toUpperCase();

  if (actual.entries.length !== expectedCount || actual.treeHash !== normalizedExpectedHash) {
    console.error(`M-AI Kernel ${label} verification failed.`);
    console.error(`Expected: ${expectedCount} files, ${normalizedExpectedHash}`);
    console.error(`Actual:   ${actual.entries.length} files, ${actual.treeHash}`);
    process.exit(1);
  }

  return actual;
}

const source = verifyTree(
  'source copy',
  kernelRoot,
  provenance.packageFileCount,
  provenance.packageTreeSha256,
);
const runtime = verifyTree(
  'derived runtime',
  runtimeRoot,
  provenance.runtimeFileCount,
  provenance.runtimeTreeSha256,
);

console.log(
  `M-AI Kernel verified: ${provenance.packageName}@${provenance.packageVersion}, ` +
    `source ${source.entries.length}/${source.treeHash}, runtime ${runtime.entries.length}/${runtime.treeHash}`,
);
