/**
 * check-bundle.mjs
 *
 * Service-role-key bundle-leak detector.
 * Scans every text-readable file under dist/ for patterns that should NEVER
 * appear in a client bundle. If any hit is found the script exits non-zero so
 * a misconfigured build (e.g. a VITE_SUPABASE_SERVICE_ROLE_KEY accidentally
 * set) fails the Vercel deploy before the secret reaches the public CDN.
 *
 * Decision D-18: DO NOT match the bare `eyJ` prefix — the legitimate anon key
 * is also a JWT and starts with `eyJ`; matching it would false-positive on
 * every build. Only service-role-specific patterns are checked.
 *
 * Patterns that trigger a leak (any hit in dist/ => exit 1):
 *   sb_secret_              new-format Supabase secret key prefix
 *   "role":"service_role"   decoded service-role JWT claim (literal string)
 *   service_role            service-role identifier string
 *   SERVICE_ROLE_KEY        env var name that must never be client-side
 *
 * Optional additional check: if the env var SERVICE_ROLE_KEY_PREFIX is set,
 * its value is also grepped for — the most robust, zero-false-positive variant
 * (exact key-value prefix, never hardcoded in this file).
 *
 * Usage:
 *   node scripts/check-bundle.mjs          # run against dist/ in cwd
 *   npm run verify:no-secrets              # via package.json script
 *   npm run build:check                   # build then gate (Vercel build cmd)
 */

import fs from 'fs';
import path from 'path';

// Text-readable extensions to scan. Binary assets (images, fonts) are skipped
// to avoid false positives from binary content that happens to match patterns.
const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs',
  '.css',
  '.html',
  '.json',
  '.txt',
  '.map',
  '.svg',
  '',   // extensionless files
]);

// Binary extensions to explicitly skip (belt-and-suspenders alongside the
// allowlist above — avoids issues if a new extension is added later).
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.mp3', '.ogg', '.wav',
  '.pdf', '.zip', '.gz', '.br',
]);

/**
 * Patterns that should NEVER appear in a client-side bundle.
 * Note: bare `eyJ` is intentionally excluded — it is the JWT prefix shared
 * by both the anon key and the service-role key, and the anon key legitimately
 * belongs in the bundle (D-18).
 */
const LEAK_PATTERNS = [
  'sb_secret_',
  '"role":"service_role"',
  'service_role',
  'SERVICE_ROLE_KEY',
];

// Optional: exact key-value prefix check (most robust — zero false positives).
// Set the SERVICE_ROLE_KEY_PREFIX env var to the first ~24 chars of the real
// service-role key. Never hardcode the value in this file.
const KEY_PREFIX = process.env.SERVICE_ROLE_KEY_PREFIX;
if (KEY_PREFIX && KEY_PREFIX.length > 0) {
  LEAK_PATTERNS.push(KEY_PREFIX);
}

/**
 * Recursively collect all files under `dir`.
 * @param {string} dir
 * @returns {string[]}
 */
function collectFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Returns true if the file's extension is in the text-readable allowlist and
 * not in the binary blocklist.
 * @param {string} filePath
 * @returns {boolean}
 */
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return false;
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Search `content` for all LEAK_PATTERNS. Returns an array of matching
 * pattern strings.
 * @param {string} content
 * @returns {string[]}
 */
function findLeaks(content) {
  return LEAK_PATTERNS.filter(pattern => content.includes(pattern));
}

// ── Main ─────────────────────────────────────────────────────────────────────

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  console.error(
    'ERROR: dist/ directory not found. Run `npm run build` (or `vite build`) first.\n' +
    '       The leak gate must run against a freshly built dist/ — it cannot\n' +
    '       pass when there is nothing to scan.'
  );
  process.exit(1);
}

const files = collectFiles(distDir);
let leakFound = false;

for (const file of files) {
  if (!isTextFile(file)) continue;

  let content;
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch {
    // Skip files that cannot be read as UTF-8 (unexpected binary).
    continue;
  }

  const hits = findLeaks(content);
  for (const pattern of hits) {
    console.error(`LEAK: "${pattern}" found in ${file}`);
    leakFound = true;
  }
}

if (leakFound) {
  console.error('\nFAIL: Service-role secret pattern(s) detected in dist/ — aborting deploy.');
  process.exit(1);
}

console.log('OK: no service-role secret in dist/');
process.exit(0);
