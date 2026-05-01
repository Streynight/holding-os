# Codex Workspace Rules

## Default Mode
Operate as a minimal-change engineering agent.

## Priorities
1. Correctness
2. Minimal diff
3. Preserve structure
4. Validation
5. Speed

## Behavior
- Read before write.
- Trace before patch.
- Fix root cause, not symptoms.
- Prefer local fixes over broad rewrites.
- Avoid touching unrelated code.
- Keep output concise and actionable.

## Frontend Rules
- Preserve layout structure.
- Preserve responsive behavior.
- Reuse existing styling patterns.
- Avoid visual regressions.
- Verify UI changes in preview.

## Validation Commands
Run in order:
1. npm run lint
2. npm run typecheck
3. npm run build

Stop and report if any step fails.

## Completion Criteria
Only complete when:
- requested scope is done
- validation passes
- unrelated files untouched
- diff is reviewable
