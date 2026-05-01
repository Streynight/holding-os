# Prompt Templates

## Claude→Codex Flow
Use Claude→Codex flow for this task.
Claude should implement first, stop at stable state, and hand off.
Codex should validate, tighten, and finalize.
Do not overlap edits.
Complete only after final validation passes.

## Minimal Fix
Fix only the requested issue.
Read relevant files first.
Apply minimal patch only.
Do not touch unrelated files.
Run lint, typecheck, and build after changes.

## UI Pass
Improve only the requested UI section.
Preserve existing structure.
Keep responsive behavior intact.
Do not restyle unrelated sections.
Verify in browser preview.
Run lint + typecheck + build.

## Bug Trace
Trace root cause first.
Do not patch symptoms.
Fix only the source issue.
Keep diff minimal.
Run full validation after fix.

## Refactor
Refactor only within requested scope.
Preserve behavior.
Avoid broad rewrites.
Keep diff reviewable.
Run full validation.

## Full Flow Feature
Use Claude→Codex flow.
Claude should build the requested feature first.
After implementation, Claude must run lint and typecheck, then stop and hand off.
Codex must run validation, review regressions, tighten diffs, and finalize.

## Full Flow UI
Use Claude→Codex flow.
Claude should implement requested UI changes first.
After implementation, Claude must stop at stable state and hand off.
Codex must run responsive pass, validation, and regression check.

## Full Flow Bug
Use Claude→Codex flow.
Claude should trace root cause and implement the fix first.
After fix, Claude must run lint and typecheck, then hand off.
Codex must validate, review regressions, and clean up minimal issues.
