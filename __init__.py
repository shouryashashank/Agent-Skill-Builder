"""skill-name — Hermes Agent plugin.

Injects this repo's AGENTS.md as always-on context before every LLM call, and
registers the bundled skills/ under the `skill-name:<skill>` namespace so
Hermes's gateway can invoke them directly.

Minimal by design: this has no mode-switching state. If your skill needs
levels (e.g. lite/full/ultra), add a small state file next to this one and
read it here — see ponytail's hooks/ponytail-mode-tracker.js for a reference
implementation in the Node adapters.
"""

import pathlib

_ROOT = pathlib.Path(__file__).parent
_AGENTS_MD = _ROOT / "AGENTS.md"


def _read_agents_md() -> str:
    try:
        return _AGENTS_MD.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return ""


def pre_llm_call(context, **kwargs):
    """Prepend the skill's ruleset to the system context for every turn."""
    text = _read_agents_md()
    if not text:
        return context
    context.setdefault("system", [])
    context["system"].append(text)
    return context


def register_skills(registry, **kwargs):
    """Expose skills/ under the `skill-name:<skill>` namespace."""
    skills_dir = _ROOT / "skills"
    if not skills_dir.is_dir():
        return
    for skill_path in skills_dir.iterdir():
        skill_md = skill_path / "SKILL.md"
        if skill_md.is_file():
            registry.add(f"skill-name:{skill_path.name}", str(skill_md))
