#!/usr/bin/env python3
"""Generate a concise check-in from TASK_TRACKER.md.

Output format:
- Done
- In progress
- Blockers
- Next step
"""
from __future__ import annotations

import re
from pathlib import Path

TASK_FILE = Path(__file__).resolve().parents[1] / "TASK_TRACKER.md"


def parse_checkbox_items(lines: list[str], header: str) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    in_section = False
    for line in lines:
        if re.match(r"^##\s+", line):
            in_section = line.strip().lower() == f"## {header}".lower()
            continue
        if not in_section:
            continue
        m = re.match(r"^-\s+\[( |x|X)\]\s+(.*)$", line.strip())
        if m:
            mark, text = m.groups()
            items.append(("done" if mark.lower() == "x" else "todo", text.strip()))
    return items


def parse_bullets(lines: list[str], header: str) -> list[str]:
    items: list[str] = []
    in_section = False
    for line in lines:
        if re.match(r"^##\s+", line):
            in_section = line.strip().lower() == f"## {header}".lower()
            continue
        if not in_section:
            continue
        m = re.match(r"^-\s+(.*)$", line.strip())
        if m and not m.group(1).startswith("["):
            items.append(m.group(1).strip())
    return items


def main() -> int:
    if not TASK_FILE.exists():
        print("TASK_TRACKER.md not found.")
        return 1

    lines = TASK_FILE.read_text(encoding="utf-8").splitlines()
    today = parse_checkbox_items(lines, "Today")
    explicit_blockers = parse_bullets(lines, "Blockers")

    done = [t for status, t in today if status == "done"]
    todo = [t for status, t in today if status == "todo"]

    in_progress = todo[:2]
    if explicit_blockers:
        blockers = explicit_blockers
    elif not today:
        blockers = ["No 'Today' checklist found in TASK_TRACKER.md."]
    else:
        blockers = ["None explicitly logged in TASK_TRACKER.md."]

    if todo:
        next_step = todo[0]
    elif done:
        next_step = "Close out validation and deploy checks."
    else:
        next_step = "Review weekly items and pick next actionable task."

    print("Done:")
    if done:
        for d in done:
            print(f"- {d}")
    else:
        print("- No today items marked complete yet.")

    print("\nIn progress:")
    if in_progress:
        for item in in_progress:
            print(f"- {item}")
    else:
        print("- No active in-progress items logged.")

    print("\nBlockers:")
    for blocker in blockers:
        print(f"- {blocker}")

    print("\nNext step:")
    print(f"- {next_step}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
