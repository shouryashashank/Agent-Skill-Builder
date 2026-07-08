# Agent Skill Builder

A starting point for authoring a coding-agent skill once and running it
everywhere — Claude Code, Codex, OpenCode, Gemini CLI, pi, Hermes Agent,
Devin CLI, Swival, OpenClaw, GitHub Copilot (editor + CLI), Cursor,
Windsurf, Cline, and Kiro — without maintaining N separate descriptions of
the same behavior.

Modeled on the adapter pattern used by
[ponytail](https://github.com/DietrichGebert/ponytail): **write the
behavior once, in two canonical files; every other file is either a thin
pointer at those two files, or a synced copy of one of them.**

```
skills/skill-name/SKILL.md   ← full skill definition (source of truth #1)
AGENTS.md                    ← compact always-on rules (source of truth #2)
```

Everything else in this repo is scaffolding around those two files. See
[`docs/agent-portability.md`](docs/agent-portability.md) for the full
host-by-host map.

## Two ways to use this repo

1. **By hand** — follow the Quick start below: rename `skill-name` → your
   slug, fill in the `TODO`s yourself.
2. **Interactively** — load the `skill-builder` skill
   (`skills/skill-builder/SKILL.md`, also available as `/skill-builder`).
   It interviews you (persona, triggers, checklist, rules, target hosts,
   author, license), then runs `scripts/generate-skill.js` to scaffold a
   complete, ready-to-publish skill repo into its own directory — with no
   `TODO`s left, rule copies already in sync, and unselected host adapters
   already pruned. This is the faster path for most new skills; the manual
   steps below are what it automates.

## Quick start (manual)


1. **Pick a slug** for your skill, e.g. `my-skill` (kebab-case, used as the
   directory/file name everywhere).

2. **Rename the placeholders.** Every file in this template uses the literal
   token `skill-name`. Replace it everywhere — filenames, directory names,
   and file contents:

   ```
   # macOS/BSD sed; drop the '' after -i on GNU/Linux
   grep -rl 'skill-name' --exclude-dir=node_modules . \
     | xargs sed -i '' 's/skill-name/my-skill/g'

   # then rename the directories/files that still say skill-name
   git mv skills/skill-name skills/my-skill
   git mv .cursor/rules/skill-name.mdc .cursor/rules/my-skill.mdc
   git mv .windsurf/rules/skill-name.md .windsurf/rules/my-skill.md
   git mv .clinerules/skill-name.md .clinerules/my-skill.md
   git mv .kiro/steering/skill-name.md .kiro/steering/my-skill.md
   git mv .opencode/plugins/skill-name.mjs .opencode/plugins/my-skill.mjs
   git mv .opencode/command/skill-name.md .opencode/command/my-skill.md
   git mv commands/skill-name.toml commands/my-skill.toml
   ```

3. **Write the actual behavior.** Fill in every `TODO` in
   `skills/skill-name/SKILL.md` first — that's the full definition. Then
   write `AGENTS.md` as the compact version of the same rules (shorter,
   no persistence/level details, just the checklist + non-negotiables).

   The `description` field in `SKILL.md`'s frontmatter matters more than
   anything else in the file: skill-capable hosts use *only* that field to
   decide whether to load the skill for a given task. Be specific about
   trigger situations, trigger phrases, and what's out of scope.

4. **Copy `AGENTS.md`'s body into the five rule-only adapters** (Cursor,
   Windsurf, Cline, GitHub Copilot, Kiro already contain the placeholder
   text as an example — replace it with your real `AGENTS.md` body,
   keeping each file's own frontmatter).

5. **Verify everything stays in sync:**

   ```
   npm run check          # rule-copy drift (Cursor/Windsurf/Cline/Copilot/Kiro vs AGENTS.md)
   npm run build:openclaw  # regenerate .openclaw/skills/my-skill/SKILL.md from skills/my-skill/SKILL.md
   ```

   Run `npm run check` in CI so a future edit to `AGENTS.md` can't silently
   leave one adapter stale.

6. **Fill in the placeholder metadata**: author name/URL in every
   `plugin.json`/`package.json`/`marketplace.json`, the `description` field
   everywhere (keep it one line and consistent), and `LICENSE`.

7. **Delete what you don't need.** Not every skill needs to reach all 16
   hosts. If you don't use Hermes Agent, delete `plugin.yaml` and
   `__init__.py`. If you don't publish to OpenClaw, delete `.openclaw/` and
   `scripts/build-openclaw-skill.js`. Thinner is better — this template
   errs on the side of completeness so you can subtract, not so you're
   obligated to ship all of it.

## Why two canonical files, not one

A `SKILL.md` needs frontmatter (`name`, `description`, `license`,
`argument-hint`) that flat-instruction hosts (Cursor, Windsurf, Cline,
GitHub Copilot editor, Kiro, and the Copilot-CLI/Antigravity/CodeWhale
fallback paths) don't parse — they just read the raw file top to bottom as
context. Splitting into a full definition (`SKILL.md`) and a compact,
frontmatter-free body (`AGENTS.md`) means every host gets a file shaped the
way it expects, without an if/else per host baked into the content itself.

## Adding mode/intensity levels (optional)

This template's behavior is static — always on, or opt-in per request. If
your skill needs switchable levels (e.g. `lite`/`full`/`ultra`/`off` like
ponytail), that requires small per-host state:

- OpenCode / pi: persist the active level to a file under
  `XDG_CONFIG_HOME`, read it in the plugin's system-prompt transform.
- Claude Code / Codex: a lifecycle hook (`SessionStart`, pre-prompt) that
  reads the same state and injects the level-appropriate instructions.

Ponytail's `hooks/` directory is a complete reference implementation of
this if you need it — it's out of scope for this template because most
skills don't need runtime state.

## Repository layout

```
skills/skill-name/SKILL.md      Full skill definition — canonical source #1
AGENTS.md                       Compact always-on rules — canonical source #2

skills/skill-builder/SKILL.md   Meta-skill: interviews you and scaffolds a new
                                 skill repo via scripts/generate-skill.js
scripts/generate-skill.js       The generator skill-builder drives
scripts/lib/hosts.js            Canonical host -> adapter-files map (pruning)
scripts/lib/render.js           Builds SKILL.md/AGENTS.md/README.md from a config
scripts/skill.config.example.json  Shape of the config generate-skill.js expects

.claude-plugin/                 Claude Code plugin manifest + marketplace listing
.codex-plugin/                  Codex plugin manifest
.devin-plugin/                  Devin CLI plugin manifest
.opencode/                      OpenCode server plugin + slash command
.github/plugin/                 GitHub Copilot CLI plugin manifest + marketplace listing
.github/copilot-instructions.md GitHub Copilot (editor) instruction file — copy of AGENTS.md
.openclaw/skills/                OpenClaw skill packages — generated copies of skills/*
pi-extension/                   pi agent harness extension
plugin.yaml, __init__.py        Hermes Agent plugin
commands/                       Gemini CLI (and Claude Code) slash commands, TOML format
gemini-extension.json           Gemini CLI / Antigravity extension manifest
.cursor/rules/                  Cursor project rule — copy of AGENTS.md
.windsurf/rules/                Windsurf project rule — copy of AGENTS.md
.clinerules/                    Cline project rule — copy of AGENTS.md
.kiro/steering/                 Kiro steering rule — copy of AGENTS.md
opencode.json                   Root config wiring the OpenCode plugin in
docs/agent-portability.md       Full host-by-host adapter map
scripts/check-rule-copies.js    Fails if any rule copy drifts from AGENTS.md
scripts/build-openclaw-skill.js Regenerates all OpenClaw copies from skills/*
package.json                    npm scripts: check, build:openclaw, generate
```
