#!/usr/bin/env node
// Scaffolds a brand-new multi-agent skill repo from this template.
//
// Two ways to run it:
//   node scripts/generate-skill.js --config skill.config.json --out ../my-skill
//   node scripts/generate-skill.js --interactive --out ../my-skill
//
// The agent-driven flow (see skills/skill-builder/SKILL.md) interviews the
// user in conversation, writes the answers to a config JSON file, then runs
// this script with --config. A human can also run --interactive directly
// without an agent in the loop.

const fs = require('fs');
const path = require('path');

const { HOSTS, SHARED_COMMANDS_HOSTS, COMMANDS_PATH, ALL_HOSTS, RULE_COPY_HOSTS } = require('./lib/hosts');
const { buildAgentsMd, buildSkillMd, buildReadme } = require('./lib/render');

const TEMPLATE_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_DEFAULT_REPO_URL = readTemplateRepoUrl();

const EXCLUDE = [
  'generated',
  'node_modules',
  '.git',
  'scripts/generate-skill.js',
  'scripts/lib',
  'scripts/skill.config.example.json',
  'skills/skill-builder',
  '.openclaw/skills/skill-builder',
  '.opencode/command/skill-builder.md',
  'commands/skill-builder.toml',
];

function readTemplateRepoUrl() {
  try {
    const pkgPath = path.join(TEMPLATE_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return String(pkg.templateRepoUrl || '').trim();
  } catch {
    return '';
  }
}

function isPlaceholderTemplateUrl(url) {
  return !url || url.includes('REPLACE_ME');
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { config: null, out: null, force: false, interactive: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') args.config = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--interactive') args.interactive = true;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Interactive fallback (no agent in the loop)
// ---------------------------------------------------------------------------

async function interactiveConfig() {
  const readline = require('readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => rl.question(q + '\n> ');
  const askList = async (q) => {
    const raw = await ask(q + ' (comma-separated)');
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  };

  console.log('\n--- Building your skill.config.json ---\n');
  const slug = await ask('Slug (kebab-case, e.g. my-skill):');
  const title = await ask('Title (human readable, e.g. My Skill):');
  const description = await ask('Full description for SKILL.md frontmatter (what it does, when to use it, trigger phrases, what it is NOT for):');
  const triggerMoment = await ask('Trigger moment (e.g. "writing any code"):');
  const persona = await ask('Persona / one-sentence non-negotiable principle:');
  const persistenceRaw = await ask('Persistence model — always-on / one-shot / levels:');
  const persistence = ['always-on', 'one-shot', 'levels'].includes(persistenceRaw.trim()) ? persistenceRaw.trim() : 'always-on';
  let levels = [];
  let defaultLevel = '';
  if (persistence === 'levels') {
    levels = await askList('Level names, in order');
    defaultLevel = await ask('Default level:');
  }
  const checklist = await askList('Checklist steps, in order (stop at the first that holds)');
  const rules = await askList('Hard rules');
  const outputFormat = await ask('Expected output format:');
  const nonNegotiables = await askList('Non-negotiables (never compromise on)');
  const outOfScope = await askList('Out of scope entirely (optional)');
  const boundaries = await ask('Boundaries — how it ends / interacts with other skills:');
  const hostsRaw = await ask(`Target hosts, or "all" (${ALL_HOSTS.join(', ')})`);
  const hosts = hostsRaw.trim().toLowerCase() === 'all' ? ALL_HOSTS : hostsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const authorName = await ask('Author name:');
  const authorUrl = await ask('Author GitHub URL:');
  const license = (await ask('License (default MIT):')) || 'MIT';
  const repoOwner = await ask('GitHub owner/org for this new skill repo:');
  const repoName = (await ask(`Repo name (default ${slug}):`)) || slug;
  const defaultTemplateRepoPrompt = TEMPLATE_DEFAULT_REPO_URL || 'not set';
  const templateRepoUrlInput = await ask(`This template's public repo URL (default ${defaultTemplateRepoPrompt}):`);
  const templateRepoUrl = templateRepoUrlInput.trim() || TEMPLATE_DEFAULT_REPO_URL;

  rl.close();

  return {
    slug, title, description, argumentHint: '', triggerMoment, persona,
    persistence, levels, defaultLevel, checklist, rules, outputFormat,
    nonNegotiables, outOfScope, boundaries, hosts,
    author: { name: authorName, url: authorUrl }, license,
    repo: { owner: repoOwner, name: repoName }, templateRepoUrl,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(config) {
  const errors = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(config.slug || '')) {
    errors.push('slug must be kebab-case (lowercase letters, digits, hyphens).');
  }
  for (const field of ['title', 'description', 'persona', 'triggerMoment', 'outputFormat', 'boundaries']) {
    if (!config[field] || !String(config[field]).trim()) errors.push(`${field} is required.`);
  }
  for (const field of ['checklist', 'rules', 'nonNegotiables', 'hosts']) {
    if (!Array.isArray(config[field]) || config[field].length === 0) errors.push(`${field} must be a non-empty array.`);
  }
  for (const host of config.hosts || []) {
    if (!ALL_HOSTS.includes(host)) errors.push(`unknown host "${host}" — must be one of: ${ALL_HOSTS.join(', ')}`);
  }
  if (errors.length) {
    console.error('Config invalid:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Copy + token substitution
// ---------------------------------------------------------------------------

function isExcluded(relPath) {
  if (path.basename(relPath) === '.DS_Store') return true;
  return EXCLUDE.some((ex) => relPath === ex || relPath.startsWith(ex + path.sep));
}

function copyTemplate(destRoot) {
  fs.mkdirSync(destRoot, { recursive: true });
  const walk = (relDir) => {
    const absDir = path.join(TEMPLATE_ROOT, relDir);
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const relPath = path.join(relDir, entry.name);
      if (isExcluded(relPath)) continue;
      const srcPath = path.join(TEMPLATE_ROOT, relPath);
      const destPath = path.join(destRoot, relPath);
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        walk(relPath);
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  walk('.');
}

// Rename any path segment literally "skill-name" to the real slug, deepest
// paths first so renaming a directory doesn't invalidate pending entries.
function renameSlugPaths(destRoot, slug) {
  const all = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      all.push({ full, depth: full.split(path.sep).length, isDir: entry.isDirectory() });
      if (entry.isDirectory()) collect(full);
    }
  };
  collect(destRoot);
  all.sort((a, b) => b.depth - a.depth); // deepest first
  for (const { full } of all) {
    const base = path.basename(full);
    if (base.includes('skill-name')) {
      const renamed = path.join(path.dirname(full), base.replaceAll('skill-name', slug));
      fs.renameSync(full, renamed);
    }
  }
}

function replaceInString(str, config) {
  const repoUrl = `https://github.com/${config.repo.owner}/${config.repo.name}`;
  return str
    .replaceAll('https://github.com/your-handle/skill-name', repoUrl)
    .replaceAll('https://github.com/your-handle', config.author.url)
    .replaceAll('Your Name', config.author.name)
    .replaceAll('TODO: one-line description of what this skill does.', config.description)
    .replaceAll('TODO: one-line description of what this command does.', config.description.split(/\.\s/)[0] + '.')
    .replaceAll('TODO one-line description of what this command does.', config.description.split(/\.\s/)[0] + '.')
    .replaceAll('skill-name', config.slug)
    .replaceAll('Skill Name', config.title)
    .replaceAll('2026', String(new Date().getFullYear()));
}

function deepReplaceJson(node, config) {
  if (Array.isArray(node)) {
    if (node.length === 3 && node.join() === 'TODO,keywords,here') {
      return config.keywords && config.keywords.length ? config.keywords : [config.slug];
    }
    return node.map((v) => deepReplaceJson(v, config));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepReplaceJson(v, config);
    return out;
  }
  if (typeof node === 'string') return replaceInString(node, config);
  return node;
}

function substituteAll(destRoot, config) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (entry.name.endsWith('.json')) {
        const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
        fs.writeFileSync(full, JSON.stringify(deepReplaceJson(parsed, config), null, 2) + '\n');
      } else {
        const text = fs.readFileSync(full, 'utf8');
        fs.writeFileSync(full, replaceInString(text, config));
      }
    }
  };
  walk(destRoot);
}

// ---------------------------------------------------------------------------
// Fully-generated content (overwrites whatever substitution produced)
// ---------------------------------------------------------------------------

function ruleCopyFrontmatter(host, config) {
  if (host === 'cursor') {
    return `---\ndescription: ${config.description.split(/\.\s/)[0]}.\nglobs:\nalwaysApply: true\n---\n\n`;
  }
  if (host === 'kiro') {
    return `---\ntitle: ${config.title}\ninclusion: always\n---\n\n`;
  }
  return '';
}

function agentsMdBody(agentsMd) {
  // Strip the trailing meta paragraph (wrapped in parens) — see
  // scripts/check-rule-copies.js for the same convention.
  const paragraphs = agentsMd.trim().split(/\n\n+/);
  const last = paragraphs[paragraphs.length - 1];
  if (/^\(.*\)$/s.test(last)) paragraphs.pop();
  return paragraphs.join('\n\n').trim() + '\n';
}

function writeGeneratedContent(destRoot, config) {
  const effectiveTemplateRepoUrl = config.templateRepoUrl || TEMPLATE_DEFAULT_REPO_URL || 'https://github.com/REPLACE_ME/skill-template';
  const agentsMd = buildAgentsMd(config);
  fs.writeFileSync(path.join(destRoot, 'AGENTS.md'), agentsMd);

  const skillMdDir = path.join(destRoot, 'skills', config.slug);
  fs.mkdirSync(skillMdDir, { recursive: true });
  const skillMd = buildSkillMd(config);
  fs.writeFileSync(path.join(skillMdDir, 'SKILL.md'), skillMd);

  fs.writeFileSync(path.join(destRoot, 'README.md'), buildReadme(config));

  const licensePath = path.join(destRoot, 'LICENSE');
  if (fs.existsSync(licensePath)) {
    let license = fs.readFileSync(licensePath, 'utf8');
    license = license.replace(/Copyright \(c\) \d{4} .*/, `Copyright (c) ${new Date().getFullYear()} ${config.author.name}`);
    fs.writeFileSync(licensePath, license);
  }

  const has = (h) => config.hosts.includes(h);
  const scripts = { check: 'node scripts/check-rule-copies.js' };
  if (has('openclaw')) scripts['build:openclaw'] = 'node scripts/build-openclaw-skill.js';
  scripts.test = 'npm run check';
  const packageJson = {
    name: config.slug,
    version: '0.1.0',
    description: config.description,
    private: true,
    license: config.license,
    author: config.author,
    templateRepoUrl: effectiveTemplateRepoUrl,
    ruleCopyHosts: RULE_COPY_HOSTS.filter((h) => has(h)),
    scripts,
  };
  if (has('opencode')) {
    packageJson.main = `./.opencode/plugins/${config.slug}.mjs`;
    packageJson.exports = { './server': `./.opencode/plugins/${config.slug}.mjs` };
  }
  fs.writeFileSync(
    path.join(destRoot, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n',
  );

  const body = agentsMdBody(agentsMd);
  const ruleCopyFiles = {
    cursor: `.cursor/rules/${config.slug}.mdc`,
    windsurf: `.windsurf/rules/${config.slug}.md`,
    cline: `.clinerules/${config.slug}.md`,
    'github-copilot': '.github/copilot-instructions.md',
    kiro: `.kiro/steering/${config.slug}.md`,
  };
  for (const [host, relPath] of Object.entries(ruleCopyFiles)) {
    if (!has(host)) continue;
    const full = path.join(destRoot, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, ruleCopyFrontmatter(host, config) + body);
  }

  if (has('openclaw')) {
    const dir = path.join(destRoot, '.openclaw', 'skills', config.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd);
  }

  const shortDescription = config.description.split(/\.\s/)[0] + '.';
  if (has('opencode')) {
    const full = path.join(destRoot, '.opencode', 'command', `${config.slug}.md`);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `---\ndescription: ${shortDescription}\n---\n\n${persona1Line(config)}\n`);
  }
  if (has('claude-code') || has('gemini-cli')) {
    const full = path.join(destRoot, 'commands', `${config.slug}.toml`);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `description = ${JSON.stringify(shortDescription)}\nprompt = ${JSON.stringify(persona1Line(config))}\n`);
  }
}

function persona1Line(config) {
  return `${config.persona} Checklist: ${config.checklist.join(' -> ')}.`;
}

// ---------------------------------------------------------------------------
// Prune unselected hosts
// ---------------------------------------------------------------------------

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function pruneHosts(destRoot, config) {
  for (const [host, files] of Object.entries(HOSTS)) {
    if (config.hosts.includes(host)) continue;
    for (const f of files) rmrf(path.join(destRoot, f));
  }
  const anySharedCommandsHost = SHARED_COMMANDS_HOSTS.some((h) => config.hosts.includes(h));
  if (!anySharedCommandsHost) rmrf(path.join(destRoot, COMMANDS_PATH));
}

// ---------------------------------------------------------------------------
// Validation of the generated output
// ---------------------------------------------------------------------------

function runValidation(destRoot) {
  const { execFileSync } = require('child_process');
  const checkScript = path.join(destRoot, 'scripts', 'check-rule-copies.js');
  if (fs.existsSync(checkScript)) {
    try {
      execFileSync('node', [checkScript], { cwd: destRoot, stdio: 'inherit' });
    } catch (e) {
      console.error('\nWarning: generated rule copies failed check-rule-copies.js (see above).');
    }
  }
  const openclawScript = path.join(destRoot, 'scripts', 'build-openclaw-skill.js');
  if (fs.existsSync(openclawScript)) {
    try {
      execFileSync('node', [openclawScript], { cwd: destRoot, stdio: 'inherit' });
    } catch (e) {
      console.error('\nWarning: build-openclaw-skill.js failed (see above).');
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let config;
  if (args.interactive) {
    config = await interactiveConfig();
  } else {
    if (!args.config) {
      console.error('Usage: node scripts/generate-skill.js --config skill.config.json --out <dest>');
      console.error('   or: node scripts/generate-skill.js --interactive --out <dest>');
      process.exit(1);
    }
    config = JSON.parse(fs.readFileSync(path.resolve(args.config), 'utf8'));
  }

  if (!config.templateRepoUrl) config.templateRepoUrl = TEMPLATE_DEFAULT_REPO_URL;

  validate(config);

  const destRoot = path.resolve(args.out || path.join(TEMPLATE_ROOT, 'generated', config.slug));
  if (fs.existsSync(destRoot) && fs.readdirSync(destRoot).length > 0 && !args.force) {
    console.error(`${destRoot} already exists and is not empty. Pass --force to overwrite.`);
    process.exit(1);
  }
  if (args.force) rmrf(destRoot);

  copyTemplate(destRoot);
  renameSlugPaths(destRoot, config.slug);
  substituteAll(destRoot, config);
  writeGeneratedContent(destRoot, config);
  pruneHosts(destRoot, config);
  runValidation(destRoot);

  console.log(`\nGenerated "${config.slug}" at ${destRoot}`);
  console.log('\nNext steps:');
  console.log(`  cd ${path.relative(process.cwd(), destRoot) || '.'}`);
  console.log('  git init && git add -A && git commit -m "Initial skill scaffold"');
  console.log(`  gh repo create ${config.repo.owner}/${config.repo.name} --public --source=. --push`);
  if (isPlaceholderTemplateUrl(config.templateRepoUrl)) {
    console.log('\nNote: templateRepoUrl is still a placeholder (package.json + README.md).');
    console.log('Update it in this repo\'s package.json so future generations inherit it.');
  }
}

main();
