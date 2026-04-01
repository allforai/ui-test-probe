---
node: compile-verify-android
exit_artifacts:
  - .allforai/product-verify/compile-android.json
---

# Task: Gradle build for Android packages

Run Gradle build on Android/Kotlin packages.

## Packages to verify

1. **sdk/android/** — `./gradlew build` or `gradle build`
2. **integrations/compose-test/** — check build.gradle.kts and build

## Protocol

For each package:
1. `cd` into the directory
2. Check if build.gradle.kts or build.gradle exists
3. Run `./gradlew build` (or `gradle build` if no wrapper)
4. Record: exit code, error count, error details

Note: Android SDK is available (v36.1.0). If gradlew doesn't exist, try generating it or use `gradle` directly.

## Exit Artifact

Write `.allforai/product-verify/compile-android.json`:
```json
{
  "generated_at": "ISO",
  "tool": "gradle",
  "packages": [
    {
      "path": "sdk/android",
      "command": "gradle build",
      "exit_code": 0,
      "errors": [],
      "status": "pass"
    }
  ],
  "summary": { "total": 2, "passed": 0, "failed": 0 }
}
```
