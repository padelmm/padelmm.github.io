#!/usr/bin/env node
/**
 * Decode a PADELMM share code into pretty-printed session JSON.
 *
 * Usage:
 *   npm run decode-share -- "PADELMM/v2/..."
 *   npm run decode-share -- path/to/code.txt
 *   cat code.txt | npm run decode-share
 *
 * Requires Node.js 18+ (CompressionStream + crypto.subtle for v2 codes).
 * Exit 0 on success (JSON to stdout), 1 on decode/validation failure.
 */
import { readFileSync } from 'node:fs';
import { importSession } from '../src/lib/share';

function readInput(): string {
  const arg = process.argv[2];
  if (arg) {
    // If the arg looks like a share-code prefix, use it directly.
    // Otherwise treat it as a file path.
    if (arg.startsWith('PADELMM/')) return arg;
    return readFileSync(arg, 'utf8');
  }
  // Stdin (pipe or heredoc)
  try {
    return readFileSync(0, 'utf8');
  } catch {
    console.error('Usage: decode-share <code-or-file>');
    console.error('       cat code.txt | decode-share');
    process.exit(1);
  }
}

const raw = readInput().trim();
if (!raw) {
  console.error('Empty input.');
  process.exit(1);
}

const result = await importSession(raw);
if (!result.ok) {
  console.error(result.error ?? 'Import failed.');
  if (result.partial) {
    console.error(
      `Partial paste: have ${result.partial.have}/${result.partial.total}, missing chunks: ${result.partial.missing.join(', ')}`,
    );
  }
  process.exit(1);
}

process.stdout.write(`${JSON.stringify(result.state, null, 2)}\n`);
