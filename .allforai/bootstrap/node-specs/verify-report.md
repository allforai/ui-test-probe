---
node: verify-report
exit_artifacts:
  - .allforai/product-verify/verify-report.json
  - .allforai/product-verify/verify-report.md
---

# Task: Synthesize all verification results into a unified report

Read all compile-verify and e2e-test results and produce a unified verification report.

## Upstream Artifacts

Read all files in `.allforai/product-verify/`:
- `compile-typescript.json`
- `compile-flutter.json`
- `compile-ios.json`
- `compile-android.json`
- `e2e-web-report.json`

## Output

### verify-report.json
```json
{
  "generated_at": "ISO",
  "project": "ui-test-probe",
  "goal": "Functional verification",
  "sections": [
    {
      "name": "Compile Verification",
      "platforms": [
        {"platform": "typescript", "packages": 4, "passed": 0, "failed": 0, "status": "pass"},
        {"platform": "flutter", "packages": 2, "passed": 0, "failed": 0, "status": "pass"}
      ]
    },
    {
      "name": "E2E Verification",
      "apps": [
        {"app": "web-react", "tests": 7, "passed": 0, "failed": 0, "status": "pass"}
      ]
    }
  ],
  "overall_status": "pass",
  "issues": [],
  "recommendations": []
}
```

### verify-report.md
Human-readable summary with:
- Per-platform compile status table
- E2E test results table
- Issues found (if any) with severity
- Recommendations for fixing failures
