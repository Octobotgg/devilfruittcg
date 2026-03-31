# LLM Development Workflow

This is the default GitHub and branch workflow for DevilFruitTCG when an LLM is doing most of the implementation work.

The goal is simple:

- keep `main` clean
- keep branches understandable
- let the LLM move fast without letting scope spill everywhere
- make the repo easier for a human to review later

## Core Principles

- One branch should tell one story.
- The branch goal should be obvious from its name.
- `main` should show product progress, not every debugging step.
- Scratch files stay local.
- Real specs, plans, runbooks, and tests stay in Git.
- Parallel work is fine when ownership is clear.
- The final integrator is responsible for verification, commit quality, and push quality.

## Default Working Model

Use one main branch for one ticket, bug, or clearly defined outcome.

Examples:

- `codex/fix-op09-pricing`
- `codex/data-op05-prb01-recovery`
- `codex/feature-market-label-cleanup`

Every branch should be explainable in two lines:

- `Goal:` what this branch is supposed to accomplish
- `Out of scope:` what this branch is explicitly not supposed to touch

If the branch starts doing more than one job, split it.

## Worktrees

Worktrees are encouraged when they help isolate tasks, but they should stay understandable.

- One worktree should map to one branch.
- Worktree names should match the branch purpose.
- Keep the number of active worktrees small enough that each one is easy to explain.
- If you cannot quickly say what each worktree is for, close or archive the extras.

Good:

- one worktree for pricing verification
- one worktree for market label cleanup

Bad:

- multiple worktrees that all touch the same pricing pipeline for slightly different reasons

## Subagents

Subagents are helpers, not owners of the whole feature.

Good use of subagents:

- auditing one specific set
- writing tests for a bounded slice
- exploring one importer path
- cleaning one UI surface while the main agent handles backend logic

Bad use of subagents:

- multiple agents making architecture decisions at the same time
- multiple agents editing the same core files without strict ownership
- parallel work before the shape of the fix is understood

The main integrator should always own:

- final design decisions
- conflict resolution
- verification
- staging and commits
- pushing the branch
- PR preparation

Use parallelism for execution, not for unclear thinking.

## When To Split Work

Split the branch when one task starts turning into multiple outcomes.

Common signals that a branch should split:

- it now changes both pricing data flow and unrelated market UI
- it includes both schema changes and unrelated cleanup work
- the PR description starts sounding like "and also"
- the diff tells more than one story

Also consider splitting when work crosses too many layers at once:

- schema or migrations
- import or data pipeline
- runtime backend reads
- UI or presentation

Sometimes one outcome truly spans multiple layers. That is okay. The problem is not layer count by itself. The problem is when the branch starts solving more than one outcome at the same time.

## Commit Strategy

Inside a feature branch, incremental commits are fine. LLM work often needs several corrective commits to get to the right answer.

What matters is:

- the branch still represents one outcome
- commit messages roughly describe real steps
- final verification happens before push

The cleanup happens at merge time:

- default to squash merge into `main`
- keep the branch history available in the PR for debugging and review
- keep `main` easy to scan later

## PR Standard

A good DevilFruit PR should answer:

- what changed
- why it changed
- what was verified
- what is still risky or intentionally deferred

The PR should feel like one clear engineering story.

If the PR feels bloated, that usually means one of three things:

- the branch was too broad
- the work should have been split earlier
- scratch or side fixes leaked into the branch

## Repo Hygiene

Keep in Git:

- product code
- scripts that are meant to be rerun
- tests
- specs
- plans
- runbooks
- long-lived architectural notes

Keep out of Git:

- browser automation state
- generated local tooling folders
- temp exports
- scratch JSON reports
- one-off debugging files
- cache folders

If a file does not help a future human or future LLM understand, run, verify, or maintain the system, it probably should not be committed.

## Docs Policy

Not every note deserves to live forever, but real working docs are valuable.

Keep:

- specs for meaningful system changes
- implementation plans for major work
- runbooks for operational flows
- README updates when setup or architecture changes

Do not keep:

- ad hoc scratch notes
- temporary audit dumps
- throwaway comparison files

When a planning doc stops being active but still has value, archive it rather than deleting it.

## Verification Policy

Before push:

- run the relevant tests for the changed area
- run `npx tsc --noEmit` when TypeScript behavior could be affected
- summarize what passed

Never claim work is done based on code edits alone.

## Default LLM Instructions

Use this as the baseline instruction set for future LLM sessions:

```txt
You are working in DevilFruitTCG.

Rules:
1. One branch should produce one outcome only.
2. State the branch goal and what is out of scope before substantial implementation.
3. Use subagents only when work is clearly separable by responsibility or file ownership.
4. One integrator owns final design decisions, verification, commits, and push.
5. Split work when the branch starts telling more than one story.
6. Keep scratch files, temp exports, caches, and local browser/tool state out of git.
7. Keep real specs, plans, runbooks, and tests in git when they provide long-term value.
8. Run fresh verification before claiming success.
9. Prefer squash merge into main so main stays readable.
10. If scope expands, split the work instead of letting the branch drift.
```

## The Short Version

If you only remember a few rules, remember these:

- one branch, one story
- parallel helpers are fine, but one integrator owns the result
- keep scratch out of Git
- verify before push
- squash merge to keep `main` clean
