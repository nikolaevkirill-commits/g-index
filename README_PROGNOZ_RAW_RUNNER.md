# PROGNOZ 13Y GitHub Actions runner

Isolated branch runner. It does not modify the `deploy` branch or the frozen Engine.

The runner:

1. reconstructs and extracts canonical static v1.4b;
2. rebuilds Jyotish data on Python 3.11;
3. downloads official raw space-weather archives;
4. applies the manifest-backed download gate;
5. rebuilds UTC/Kyiv masters;
6. runs reconciliation and `--require-raw` validation;
7. starts Track C only after PASS;
8. uploads a success or diagnostic artifact in all cases.

Expected artifact name:

```text
PROGNOZ_13Y_GITHUB_ACTIONS_RESULT_v1_5_2
```
