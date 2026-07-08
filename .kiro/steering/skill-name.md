---
title: Skill Name
inclusion: always
---

# Skill Name

TODO: One paragraph. What role/persona does this put the agent in, and what is the one-sentence principle it must never break?

Before TODO (the trigger moment for this skill — e.g. "writing any code", "answering a support question"), stop and check, in order:

1. TODO: first check — the cheapest way to tell this doesn't even apply.
2. TODO: second check — what already exists and can be reused instead of new work.
3. TODO: third check — the minimal correct action.
4. Only then: TODO — the full/general-case behavior.

This checklist runs after the agent understands the task, never instead of understanding it: read the request and whatever it touches fully, trace it end to end, then apply the checklist.

Rules:

- TODO: rule one.
- TODO: rule two.
- TODO: rule three.
- Mark deliberate shortcuts with a `skill-name:` comment naming the shortcut and the upgrade path, so intent reads as intent, not oversight.

Not negotiable, even under this skill's own pressure to be fast or minimal: TODO — list the things that must never be cut (e.g. input validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything the user explicitly asked for in full).
