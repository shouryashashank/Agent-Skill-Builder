#!/usr/bin/env node
// Regenerates .openclaw/skills/<slug>/SKILL.md for every skill under skills/.
//
// OpenClaw installs skills from ClawHub as standalone packages, so this repo
// keeps synced copies under .openclaw/skills/ rather than pointing OpenClaw
// at skills/ directly. A repo can ship more than one skill (this template
// ships `skill-name` and the `skill-builder` meta-skill), so this syncs all
// of them, not just the one matching package.json's name.
//
// Run after editing any skills/<slug>/SKILL.md, before publishing:
//   node scripts/build-openclaw-skill.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const skillsDir = path.join(root, 'skills');

if (!fs.existsSync(skillsDir)) {
  console.error('Missing skills/ directory.');
  process.exit(1);
}

const slugs = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => fs.existsSync(path.join(skillsDir, slug, 'SKILL.md')));

if (slugs.length === 0) {
  console.error('No skills/<slug>/SKILL.md found.');
  process.exit(1);
}

for (const slug of slugs) {
  const src = path.join(skillsDir, slug, 'SKILL.md');
  const destDir = path.join(root, '.openclaw', 'skills', slug);
  const dest = path.join(destDir, 'SKILL.md');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Synced skills/${slug}/SKILL.md -> .openclaw/skills/${slug}/SKILL.md`);
}
