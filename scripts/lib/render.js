// Renders SKILL.md, AGENTS.md, and README.md content from a skill config
// object (see scripts/skill.config.example.json for the shape). Kept
// separate from generate-skill.js so the "what does the text look like"
// logic can be read/tested on its own.

function numbered(items) {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

function bulleted(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function persistenceSection(config) {
  const marker = `${config.slug}:`;
  if (config.persistence === 'always-on') {
    return `ACTIVE EVERY RESPONSE once triggered. Off only on explicit request ("stop ${config.slug}" / "normal mode"). Default: **on**.`;
  }
  if (config.persistence === 'levels') {
    const levels = config.levels && config.levels.length ? config.levels : ['lite', 'full', 'ultra'];
    const def = config.defaultLevel || levels[Math.floor(levels.length / 2)] || levels[0];
    return `ACTIVE EVERY RESPONSE at the current level. Levels: ${levels.join(' / ')}. Default: **${def}**. Switch with \`/${config.slug} <level>\`, or \`off\` to disable.`;
  }
  // one-shot
  return `Applies to the current request/response only — not a standing mode. Re-invoke it for the next task if needed.`;
}

function buildAgentsMd(config) {
  const checklist = numbered(config.checklist);
  const rules = bulleted(config.rules);
  const nonNegotiables = config.nonNegotiables.join('; ');
  return `# ${config.title}

${config.persona}

Before ${config.triggerMoment}, stop and check, in order:

${checklist}

This checklist runs after the agent understands the task, never instead of understanding it: read the request and whatever it touches fully, trace it end to end, then apply the checklist.

Rules:

${rules}
- Mark deliberate shortcuts with a \`${config.slug}:\` comment naming the shortcut and the upgrade path, so intent reads as intent, not oversight.

Not negotiable, even under this skill's own pressure to be fast or minimal: ${nonNegotiables}.

(This file also applies to agents working on this repository itself.)
`;
}

function buildSkillMd(config) {
  const checklist = config.checklist
    .map((item, i) => `${i + 1}. **${item}**`)
    .join('\n');
  const rules = bulleted(config.rules);
  const nonNegotiables = bulleted(config.nonNegotiables);
  const outOfScope = config.outOfScope && config.outOfScope.length
    ? bulleted(config.outOfScope)
    : '- (none specified)';

  return `---
name: ${config.slug}
description: >
  ${config.description}
argument-hint: "${config.argumentHint || ''}"
license: ${config.license}
---

# ${config.title}

${config.persona}

## Persistence

${persistenceSection(config)}

## Core instructions

Before ${config.triggerMoment}, stop at the first item that applies:

${checklist}

This runs after the agent understands the task, never instead of it: read the request and whatever it touches fully, trace it end to end, before applying the checklist above.

## Rules

${rules}
- Mark deliberate shortcuts with a \`${config.slug}:\` comment naming the shortcut and the upgrade path.

## Output

${config.outputFormat}

## When NOT to apply this skill

Never compromise on:

${nonNegotiables}

Out of scope entirely:

${outOfScope}

## Boundaries

${config.boundaries}
`;
}

function readmeInstallSection(config) {
  const lines = [];
  const has = (h) => config.hosts.includes(h);

  if (has('claude-code')) {
    lines.push(
      '### Claude Code',
      '',
      '```',
      `/plugin marketplace add ${config.repo.owner || '<owner>'}/${config.repo.name}`,
      `/plugin install ${config.slug}@${config.slug}`,
      '```',
      '',
    );
  }
  if (has('codex')) {
    lines.push(
      '### Codex',
      '',
      '```',
      `codex plugin marketplace add ${config.repo.owner || '<owner>'}/${config.repo.name}`,
      '```',
      '',
      `Invoke with \`@${config.slug}\`.`,
      '',
    );
  }
  if (has('opencode')) {
    lines.push(
      '### OpenCode',
      '',
      'Add to `opencode.json`:',
      '',
      '```json',
      `{ "plugin": ["./.opencode/plugins/${config.slug}.mjs"] }`,
      '```',
      '',
    );
  }
  if (has('gemini-cli')) {
    lines.push(
      '### Gemini CLI',
      '',
      '```',
      `gemini extensions install https://github.com/${config.repo.owner || '<owner>'}/${config.repo.name}`,
      '```',
      '',
    );
  }
  if (has('cursor')) lines.push(`### Cursor\n\nCopy \`.cursor/rules/${config.slug}.mdc\` into your project.\n`);
  if (has('windsurf')) lines.push(`### Windsurf\n\nCopy \`.windsurf/rules/${config.slug}.md\` into your project.\n`);
  if (has('cline')) lines.push(`### Cline\n\nCopy \`.clinerules/${config.slug}.md\` into your project.\n`);
  if (has('kiro')) lines.push(`### Kiro\n\nCopy \`.kiro/steering/${config.slug}.md\` into your project or \`~/.kiro/steering/\` globally.\n`);
  if (has('github-copilot')) lines.push('### GitHub Copilot (editor)\n\nAlready reads `.github/copilot-instructions.md` from the repo root — no setup.\n');
  if (has('github-copilot-cli')) {
    lines.push(
      '### GitHub Copilot CLI',
      '',
      '```',
      `copilot plugin marketplace add ${config.repo.owner || '<owner>'}/${config.repo.name}`,
      `copilot plugin install ${config.slug}@${config.slug}`,
      '```',
      '',
    );
  }
  if (has('devin-cli')) lines.push(`### Devin CLI\n\n\`\`\`\ndevin plugins install ${config.repo.owner || '<owner>'}/${config.repo.name}\n\`\`\`\n`);
  if (has('hermes')) lines.push(`### Hermes Agent\n\n\`\`\`\nhermes plugins install ${config.repo.owner || '<owner>'}/${config.repo.name} --enable\n\`\`\`\n`);
  if (has('pi')) lines.push(`### pi agent harness\n\n\`\`\`\npi install git:github.com/${config.repo.owner || '<owner>'}/${config.repo.name}\n\`\`\`\n`);
  if (has('openclaw')) lines.push(`### OpenClaw\n\n\`\`\`\nclawhub install ${config.slug}\n\`\`\`\n`);

  lines.push(
    '### Generic agents',
    '',
    'Point any agent that reads `AGENTS.md` or `skills/*/SKILL.md` at this repo — no setup.',
  );

  return lines.join('\n');
}

function buildReadme(config) {
  const templateUrl = config.templateRepoUrl || 'https://github.com/REPLACE_ME/skill-template';
  const templateNote = templateUrl.includes('REPLACE_ME')
    ? `Scaffolded from a skill-authoring template (${templateUrl} — placeholder until the template is public).`
    : `Scaffolded from [this template](${templateUrl}).`;
  const hasOpenclaw = config.hosts.includes('openclaw');
  const devCommands = hasOpenclaw
    ? `npm run check          # verify the duplicated rule files still match AGENTS.md\nnpm run build:openclaw  # regenerate .openclaw/skills/${config.slug}/SKILL.md`
    : 'npm run check          # verify the duplicated rule files still match AGENTS.md';

  return `# ${config.title}

${config.description}

## Install

${readmeInstallSection(config)}

## Development

\`\`\`
${devCommands}
\`\`\`

Edit \`skills/${config.slug}/SKILL.md\` for the full definition, or \`AGENTS.md\`
for the compact always-on rules used by hosts without skill support. Run
\`npm run check\` after touching \`AGENTS.md\` — it fails if any of the copied
rule files (Cursor/Windsurf/Cline/GitHub Copilot/Kiro) drifted out of sync.

See [\`docs/agent-portability.md\`](docs/agent-portability.md) for the full
host-by-host file map.

---

${templateNote}
`;
}

module.exports = { buildAgentsMd, buildSkillMd, buildReadme, numbered, bulleted };
