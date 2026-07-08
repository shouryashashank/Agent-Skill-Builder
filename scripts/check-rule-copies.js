#!/usr/bin/env node
// Verifies every copied rule file still matches the canonical AGENTS.md body.
//
// This template deliberately duplicates the same instruction text into
// several host-specific files (Cursor, Windsurf, Cline, GitHub Copilot,
// Kiro) because those hosts only read flat project-instruction files, not
// skills/. Duplication drifts unless something checks it — this does.
//
// Run: node scripts/check-rule-copies.js  (or `npm run check`)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const slug = pkg.name || 'skill-name';

let ruleCopyPath;
try {
  ({ ruleCopyPath } = require('./lib/hosts'));
} catch (e) {
  // scripts/lib/ is authoring-only tooling and isn't shipped into generated
  // skill repos — fall back to the same five paths inline so this script
  // still works standalone there.
  ruleCopyPath = (host, s) => ({
    cursor: `.cursor/rules/${s}.mdc`,
    windsurf: `.windsurf/rules/${s}.md`,
    cline: `.clinerules/${s}.md`,
    'github-copilot': '.github/copilot-instructions.md',
    kiro: `.kiro/steering/${s}.md`,
  }[host] || null);
}

// A repo only ships rule copies for the hosts it was generated with (see
// package.json's `ruleCopyHosts`, written by scripts/generate-skill.js).
// Defaults to all five for this template itself, which ships every adapter.
const ruleCopyHosts = pkg.ruleCopyHosts || ['cursor', 'windsurf', 'cline', 'github-copilot', 'kiro'];

const canonicalPath = path.join(root, 'AGENTS.md');
let canonical = fs.readFileSync(canonicalPath, 'utf8').trim();

// AGENTS.md carries one extra trailing paragraph aimed at agents editing
// *this* repo (e.g. "(this file also applies to agents working on this
// repo)"). That meta-note is local to AGENTS.md and isn't duplicated into
// the portable rule copies below — strip it before comparing. Convention:
// a final paragraph wrapped in parentheses is meta, not portable rule text.
const paragraphs = canonical.split(/\n\n+/);
const last = paragraphs[paragraphs.length - 1];
if (/^\(.*\)$/s.test(last)) paragraphs.pop();
canonical = paragraphs.join('\n\n').trim();

function stripFrontmatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) return text.slice(end + 4).trim();
  }
  return text.trim();
}

const copies = ruleCopyHosts
  .map((host) => ruleCopyPath(host, slug))
  .filter(Boolean);

let failed = false;

for (const relPath of copies) {
  const filePath = path.join(root, relPath);
  if (!fs.existsSync(filePath)) {
    console.error(`MISSING: ${relPath}`);
    failed = true;
    continue;
  }
  const body = stripFrontmatter(fs.readFileSync(filePath, 'utf8'));
  if (body !== canonical) {
    console.error(`OUT OF SYNC: ${relPath} does not match AGENTS.md`);
    failed = true;
  } else {
    console.log(`OK: ${relPath}`);
  }
}

if (failed) {
  console.error('\nFix: copy the body of AGENTS.md into the file(s) above (keep their own frontmatter).');
  process.exit(1);
}

console.log('\nAll rule copies match AGENTS.md.');
