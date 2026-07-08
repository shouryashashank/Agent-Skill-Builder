---
name: skill-name
description: >
  TODO: Rewrite this description. It is the single most important field in
  this file — skill-capable hosts (Claude Code, Codex, OpenCode, pi, Devin
  CLI, Hermes Agent, Swival, OpenClaw) use it, not the body, to decide
  whether to load the skill at all. State in one paragraph: (1) what the
  skill makes the agent do, (2) the concrete situations/tasks to use it for,
  (3) the exact trigger words or phrases a user might say (e.g. "use
  skill-name", "activate skill-name"), and (4) what it explicitly does NOT
  apply to. Be specific and exhaustive here — a vague description means the
  skill never fires. See the other SKILL.md files on this machine for
  examples of this pattern.
argument-hint: "[optional-arg]"
license: MIT
---

# Skill Name

TODO: One paragraph. What role/persona does this put the agent in, and what
is the one-sentence principle it must never break? (ponytail's example:
"You are a lazy senior developer. The best code is the code never written.")

## Persistence

TODO: Define how "sticky" this skill is once triggered. Options:
- **Always on**: applies to every response until the user explicitly turns it off.
- **One-shot**: applies only to the current request/response.
- **Session-scoped with levels**: e.g. `lite` / `full` / `ultra` / `off`, switched with a command.

Example (always-on style):
> ACTIVE EVERY RESPONSE once triggered. Off only on explicit request
> ("stop skill-name" / "normal mode"). Default: **on**.

## Core instructions

TODO: This is the actual behavior. The most robust pattern for a rule-based
skill is a short ordered checklist the agent runs through before acting —
stop at the first item that applies, don't skip ahead, don't skip the read.
Replace the placeholders below with your real checklist:

1. **TODO — first check.** What's the cheapest way to tell the skill doesn't
   even apply here?
2. **TODO — second check.** What already exists (in the repo, in a stdlib,
   in a prior message) that solves this without new work?
3. **TODO — third check.** What's the minimal correct action?
4. **Only then:** TODO — the full/general-case behavior.

State explicitly that the checklist runs *after* the agent understands the
task, never instead of understanding it — a fast wrong answer is worse than
a slightly slower right one.

## Rules

TODO: A flat bullet list of hard constraints this skill enforces. Keep each
one short, concrete, and checkable (not "be careful", but "never do X").

- TODO: rule one.
- TODO: rule two.
- TODO: rule three.
- Mark deliberate shortcuts with a `skill-name:` comment (`# skill-name: this
  is intentionally simplified because X, revisit if Y`) so intent reads as
  intent, not oversight. Delete this rule if the skill doesn't produce code.

## Output

TODO: Describe the expected shape of the response — format, length,
ordering, what to omit. Example pattern:
> `[result] → [what was skipped or deferred, if anything, and why].`
> No unrequested essays; if the explanation is longer than the result,
> cut the explanation.

## When NOT to apply this skill

TODO: List the non-negotiables — the things this skill must never
compromise on even under its own pressure to be fast/minimal/lazy/terse
(e.g. input validation at trust boundaries, security, accessibility,
anything the user explicitly asked for in full). Also list task types this
skill should stay out of entirely.

## Boundaries

TODO: How does this skill interact with other skills/rules active at the
same time? What ends it? What's the exact phrase that reverts to normal
behavior?

The shortest path to done is the right path — once "done" is actually
understood.
