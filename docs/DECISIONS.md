# Decisions log

Decisions made while working unattended. Each entry: what was unclear, what was decided, why.

## Phase 0 — ECC

- **ECC source:** cloned `https://github.com/affaan-m/ECC` (commit `b38be6a7f6350964d59328b52f0624e1d1d552d1`) into a temp folder outside the repo.
- **Copied:** agents `planner`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `typescript-reviewer`, `react-reviewer`, `e2e-runner`; skills `tdd-workflow`, `verification-loop`, `e2e-testing`; all of `rules/common/`.
- **Excluded `rules/common/hooks.md`.** It is a guidance document about hooks, not a hook, but the brief says "do not copy any hooks"; leaving it out is the safest reading. No `hooks/` content or `settings.json` hook config was copied.
- **Licence:** ECC is MIT-licensed; its licence is kept at `.claude/ECC-LICENSE`.
- **Subagent registration:** in this cloud session the ECC agents are already available as `ecc:*` subagent types (from an installed plugin), so they are used directly rather than via a general-purpose agent.
