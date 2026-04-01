---
node: compile-verify-flutter
exit_artifacts:
  - .allforai/product-verify/compile-flutter.json
---

# Task: Flutter analyze for Dart packages

Run `flutter analyze` on Flutter/Dart packages.

## Packages to verify

1. **sdk/flutter/** — `flutter pub get && flutter analyze`
2. **integrations/flutter-test/** — `flutter pub get && flutter analyze`

## Protocol

For each package:
1. `cd` into the directory
2. Run `flutter pub get`
3. Run `flutter analyze`
4. Record: exit code, issue count, issue details

## Exit Artifact

Write `.allforai/product-verify/compile-flutter.json`:
```json
{
  "generated_at": "ISO",
  "tool": "flutter analyze",
  "packages": [
    {
      "path": "sdk/flutter",
      "command": "flutter analyze",
      "exit_code": 0,
      "issues": [],
      "status": "pass"
    }
  ],
  "summary": { "total": 2, "passed": 0, "failed": 0 }
}
```
