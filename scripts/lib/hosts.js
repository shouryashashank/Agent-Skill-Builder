// Canonical map of adapter host -> the files/directories that belong to it,
// relative to the repo root. Shared by scripts/generate-skill.js when
// pruning adapters for hosts the user didn't select.
//
// Hosts not listed here (swival, codewhale, generic agents) have no
// dedicated files — they read skills/ and AGENTS.md directly and are
// always present, so there's nothing to prune.

const HOSTS = {
  'claude-code': ['.claude-plugin'],
  codex: ['.codex-plugin'],
  opencode: ['.opencode', 'opencode.json'],
  'gemini-cli': ['gemini-extension.json'],
  pi: ['pi-extension'],
  hermes: ['plugin.yaml', '__init__.py'],
  'devin-cli': ['.devin-plugin'],
  'github-copilot-cli': ['.github/plugin'],
  openclaw: ['.openclaw', 'scripts/build-openclaw-skill.js'],
  cursor: ['.cursor'],
  windsurf: ['.windsurf'],
  cline: ['.clinerules'],
  'github-copilot': ['.github/copilot-instructions.md'],
  kiro: ['.kiro'],
};

// commands/*.toml is shared between claude-code and gemini-cli — only prune
// it if neither is selected.
const SHARED_COMMANDS_HOSTS = ['claude-code', 'gemini-cli'];
const COMMANDS_PATH = 'commands';

const ALL_HOSTS = Object.keys(HOSTS);

// The subset of hosts whose adapter is a duplicated copy of AGENTS.md's body
// (as opposed to a pointer at skills/). Used by check-rule-copies.js to know
// which copies should exist for a given repo — a generated repo only ships
// the ones it was told to keep, via package.json's `ruleCopyHosts` field.
const RULE_COPY_HOSTS = ['cursor', 'windsurf', 'cline', 'github-copilot', 'kiro'];

function ruleCopyPath(host, slug) {
  switch (host) {
    case 'cursor': return `.cursor/rules/${slug}.mdc`;
    case 'windsurf': return `.windsurf/rules/${slug}.md`;
    case 'cline': return `.clinerules/${slug}.md`;
    case 'github-copilot': return '.github/copilot-instructions.md';
    case 'kiro': return `.kiro/steering/${slug}.md`;
    default: return null;
  }
}

module.exports = { HOSTS, SHARED_COMMANDS_HOSTS, COMMANDS_PATH, ALL_HOSTS, RULE_COPY_HOSTS, ruleCopyPath };
