#!/usr/bin/env node
/**
 * Inlines every script into self-contained HTML files:
 *   prototype/toolkit.html -> prototype/dist/audit-toolkit-prototype.html        (primary: planning / program / library / SCAR / NCR / competency)
 *   prototype/index.html   -> prototype/dist/audit-record-reference.html         (reference component: audit-record / field-execution reference)
 */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pages = [['toolkit.html', 'audit-toolkit-prototype.html'], ['index.html', 'audit-record-reference.html']];
fs.mkdirSync(path.join(root, 'prototype', 'dist'), { recursive: true });
pages.forEach(([src, out]) => {
  let html = fs.readFileSync(path.join(root, 'prototype', src), 'utf8');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => '<script>\n/* ' + p + ' */\n' + fs.readFileSync(path.join(root, 'prototype', p), 'utf8') + '\n</script>');
  fs.writeFileSync(path.join(root, 'prototype', 'dist', out), html);
  console.log('wrote prototype/dist/' + out + ' (' + html.length + ' bytes)');
});
