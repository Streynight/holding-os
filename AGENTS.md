<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Core Rules
- Always inspect existing code before editing.
- Prefer minimal patch over rewrite.
- Preserve existing structure unless change is required.
- Do not modify unrelated files.
- Keep naming and patterns consistent with existing code.
- Do not introduce new dependencies unless required.

## Workflow
1. Read relevant files first.
2. Identify root cause before editing.
3. Apply minimal patch.
4. Run validation commands.
5. Summarize changed files and why.

## Validation
- Run lint after edits.
- Run typecheck if TypeScript is used.
- Run build after lint passes.
- For UI changes, verify in browser preview.
- Do not mark complete if validation fails.

## UI Rules
- Preserve responsive behavior.
- Do not break spacing hierarchy.
- Keep mobile-first layout intact.
- Reuse existing components where possible.
- Do not restyle unrelated sections.

## Editing Constraints
- Touch only files required for the task.
- Avoid full rewrites unless explicitly requested.
- Keep diffs small and reviewable.
- Preserve comments unless outdated or incorrect.

## Output Rules
- Summarize:
  - files changed
  - what changed
  - validation results
- Flag assumptions clearly.
