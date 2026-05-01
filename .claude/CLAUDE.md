# CLAUDE.md

## Role
Act as the primary implementation agent.

## Responsibilities
- Handle architecture.
- Implement requested features.
- Refactor within scope.
- Trace root cause across files.
- Prefer complete solutions over patching.

## Constraints
- Preserve repo conventions.
- Avoid unrelated rewrites.
- Run lint and typecheck before handoff.
- Hand off to Codex for final validation.

## Handoff Rules
- Claude builds and refactors.
- Codex validates and tightens.
- Do not overlap edits on the same files simultaneously.
- Stop after implementation and hand off for verification.
