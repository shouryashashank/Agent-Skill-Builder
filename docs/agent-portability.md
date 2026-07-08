# Agent Portability

This is a skill-authoring template, not a finished skill. It follows the
same pattern used by production multi-agent skills (e.g.
[ponytail](https://github.com/DietrichGebert/ponytail)): **one canonical
source of behavior, plus thin adapters per host.**

There are exactly two files that hold real content. Everything else either
points at them or is a synced copy of one of them:

- `skills/skill-name/SKILL.md` — the full skill definition (frontmatter +
  body). Read directly by any host that understands the Agent Skills
  format.
- `AGENTS.md` — a compact, always-on version of the same rules, for hosts
  that only read a flat project-instructions file (no skill/frontmatter
  support).

## Supported adapters

| Host | Files | Notes |
|------|-------|-------|
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `commands/`, `skills/` | Plugin install (`/plugin marketplace add` + `/plugin install`). Points at `skills/`. |
| Codex | `.codex-plugin/plugin.json`, `skills/` | Plugin install; invoke the skill with `@skill-name`. |
| OpenCode | `.opencode/plugins/skill-name.mjs`, `.opencode/command/`, `opencode.json`, `skills/` | Server plugin injects `AGENTS.md` every turn via `experimental.chat.system.transform` and registers `skills/`. |
| pi agent harness | `pi-extension/`, `skills/` | Package extension; same injection pattern as OpenCode. |
| Hermes Agent | `plugin.yaml`, `__init__.py`, `skills/` | Injects `AGENTS.md` via `pre_llm_call`; exposes skills as `skill-name:<skill>`. |
| Devin CLI | `.devin-plugin/plugin.json`, `skills/` | Skills available as `/skill-name:skill-name`. |
| GitHub Copilot CLI | `.github/plugin/plugin.json`, `.github/plugin/marketplace.json`, `commands/`, `skills/` | Plugin install (`copilot plugin marketplace add` + `copilot plugin install`). Fallback: `AGENTS.md` / `.github/copilot-instructions.md`, instruction-tier only. |
| Gemini CLI / Antigravity | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | `contextFileName` in the manifest points at `AGENTS.md`; `skills/` and `commands/*.toml` are auto-discovered. |
| Swival | `AGENTS.md`, `skills/` | `swival skills add` installs `skills/` directly; also reads `AGENTS.md` as an instruction-tier fallback. |
| OpenClaw | `.openclaw/skills/skill-name/SKILL.md` | Generated from `skills/skill-name/SKILL.md` by `scripts/build-openclaw-skill.js` — rerun after every edit. |
| Cursor | `.cursor/rules/skill-name.mdc` | Always-on project rule. Body copied from `AGENTS.md`. |
| Windsurf | `.windsurf/rules/skill-name.md` | Project rule. Body copied from `AGENTS.md`. |
| Cline | `.clinerules/skill-name.md` | Project rule. Body copied from `AGENTS.md`. |
| GitHub Copilot (editor) | `.github/copilot-instructions.md` | Repository instruction file. Body copied from `AGENTS.md`. |
| Kiro | `.kiro/steering/skill-name.md` | Steering rule. Body copied from `AGENTS.md`. |
| CodeWhale, generic agents | `AGENTS.md` or `skills/skill-name/SKILL.md` | Reads either directly, zero setup. |

## Adapter rule

Keep adapters thin:

- If a host supports skills, point it at `skills/skill-name/SKILL.md`. Don't
  re-describe the behavior in the adapter file itself.
- If a host only supports a flat project-instructions file, its file is a
  **copy of `AGENTS.md`'s body** (with that host's own frontmatter, if any).
  Never hand-edit the copy — edit `AGENTS.md` and re-copy.

## Keeping copies honest

`AGENTS.md`'s body is duplicated into five files (`.cursor/rules/`,
`.windsurf/rules/`, `.clinerules/`, `.github/copilot-instructions.md`,
`.kiro/steering/`) because those hosts can't be pointed at a shared file.
Duplication drifts silently unless something checks it:

```
npm run check   # node scripts/check-rule-copies.js
```

This fails loudly (and CI should run it) the moment any copy stops matching
`AGENTS.md`. The only intentional difference is `AGENTS.md`'s final
parenthetical paragraph, which is a meta-note for agents editing *this* repo
and isn't portable rule text — the script already excludes it.

`skills/skill-name/SKILL.md` is similarly duplicated into
`.openclaw/skills/skill-name/SKILL.md` for OpenClaw/ClawHub, which installs
skills as standalone packages rather than reading a shared `skills/`
directory. Re-sync with:

```
npm run build:openclaw   # node scripts/build-openclaw-skill.js
```

## The `skill-builder` meta-skill

This repo also ships a second skill, `skills/skill-builder/SKILL.md`: an
interview-driven tool that scaffolds a brand-new skill repo from this
template (see the root `README.md`). It's deliberately **skill-only** — it
is not duplicated into `AGENTS.md`/Cursor/Windsurf/Cline/Copilot/Kiro,
because those adapters are for ambient, always-on rules, and "interview the
user to build a skill" should not fire on every request. It's reachable
wherever a host loads `skills/` on demand (Claude Code, Codex, OpenCode, pi,
Devin CLI, Hermes Agent, Swival, OpenClaw), and via the `/skill-builder`
slash command on OpenCode and Gemini CLI. `scripts/build-openclaw-skill.js`
syncs both skills' OpenClaw copies, not just one.
