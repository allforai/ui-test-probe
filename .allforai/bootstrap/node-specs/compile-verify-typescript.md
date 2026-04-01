---
node: compile-verify-typescript
exit_artifacts:
  - .allforai/product-verify/compile-typescript.json
---

# Task: TypeScript typecheck for all Node.js-based packages

Run `tsc --noEmit` (or equivalent) on every TypeScript package in the monorepo. Install dependencies first if needed.

## Packages to verify

1. **sdk/web/** — `npm install && npm run typecheck` (or `npx tsc --noEmit`)
2. **integrations/playwright/** — `npm install && npx tsc --noEmit`
3. **sdk/react-native/** — `npm install && npx tsc --noEmit`
4. **tools/cli/** — `npm install && npx tsc --noEmit`

## Protocol

For each package:
1. `cd` into the directory
2. Run `npm install` (if node_modules doesn't exist)
3. Run the typecheck command
4. Record: exit code, error count, error details (if any)

If a package fails, categorize each error:
- Type mismatch (wrong types)
- Missing import (module not found)
- Config issue (tsconfig misconfiguration)

## Exit Artifact

Write `.allforai/product-verify/compile-typescript.json`:
```json
{
  "generated_at": "ISO",
  "tool": "tsc",
  "packages": [
    {
      "path": "sdk/web",
      "command": "npm run typecheck",
      "exit_code": 0,
      "errors": [],
      "status": "pass"
    }
  ],
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0
  }
}
```

Use `mkdir -p .allforai/product-verify/` before writing.

## Downstream Contract

→ **e2e-test-web** reads: packages[path="sdk/web"].status must be "pass" before E2E can run
