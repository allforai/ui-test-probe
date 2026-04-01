---
node: compile-verify-ios
exit_artifacts:
  - .allforai/product-verify/compile-ios.json
---

# Task: Swift build for iOS packages

Run `swift build` on Swift packages.

## Packages to verify

1. **sdk/ios/** — `swift build`
2. **integrations/xctest/** — check if it has Package.swift and build

## Protocol

For each package:
1. `cd` into the directory
2. Check if Package.swift exists
3. Run `swift build`
4. Record: exit code, error count, error details

## Exit Artifact

Write `.allforai/product-verify/compile-ios.json`:
```json
{
  "generated_at": "ISO",
  "tool": "swift build",
  "packages": [
    {
      "path": "sdk/ios",
      "command": "swift build",
      "exit_code": 0,
      "errors": [],
      "status": "pass"
    }
  ],
  "summary": { "total": 2, "passed": 0, "failed": 0 }
}
```
