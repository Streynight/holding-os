# Prompt Templates

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
