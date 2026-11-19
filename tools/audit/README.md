# FP575 bound portable gate

`run_gate.py` replaces the archived index-only resume runner. The archived 96/105 remains historical evidence; these files do not claim a new 105/105 run.

## Full-tree run (no deployment)

Use a dedicated clean, committed Git checkout of the exact reviewed candidate. Install the workflow's Python/Node dependencies and Chromium first. Keep evidence and sealed manifests outside that checkout. Never place a synthetic feed or regression registry in place of the three protected tracked inputs.

```
python tools/audit/run_gate.py REPO EVIDENCE tools/audit/commands-105.json --seal --sealed-output BOUND.json
python tools/audit/run_gate.py REPO EVIDENCE BOUND.json --key-file PRIVATE_DIR/run.key
python tools/audit/run_gate.py REPO EVIDENCE BOUND.json --key-file PRIVATE_DIR/run.key --resume
```

Seal only after reviewing the exact commit and command contract. `commands-105.json` preserves all 103 original gated workflow test commands, adds the two guards, and excludes installation/deployment and the optional intentional CI failure probe. Build is now #105. The contract declares only known generated output paths; tracked files are never excluded. The runner executes argv without a shell. It does not fetch, push, deploy, rewrite inputs, or repair a dirty tree.

Canonical `--seal` runs the same environment preflight as canonical execution before writing the bound manifest. It rejects test overrides even when exported empty, optimized Python, untracked dependency resolution inside the checkout, missing tools or Chromium, and missing or inconsistent Python wheel RECORD entries. Use a clean wheel-based virtual environment with `pyswisseph==2.10.3.2` and external Node dependencies. The error identifies the refused setting or dependency and exits nonzero before creating the sealed manifest or evidence directory. Diagnostic contracts do not use the full canonical preflight. See [ZIP reproduction instructions](REPRODUCE_UK.md) for exact environment cleanup and installation commands.

Resume requires the same HEAD/tree/index, SHA256 of every tracked file and each protected input, exact manifest/commands/runner, Python and installed package versions, Git/Node/Playwright/browser versions, actual headless executable SHA256 and selected execution environment. Every completed command has a unique immutable attempt JSON and log. A failed/timeout attempt is retried on resume; previous evidence is retained. A PASS is reused only with identical binding and intact log. Missing checks, timeout, source mutation or failed commands return nonzero. A source mutation stops subsequent commands. An exclusive lock prevents concurrent writers; after interruption inspect process ownership before manually removing a stale lock. Interrupted logs remain evidence and do not count as PASS.

На відмові resume runner показує назви компонентів прив’язки й точні назви змінених, доданих і видалених змінних ефективного середовища. Діагностика не містить їхніх значень. Для цього приватний binding-env.json зберігає HMAC для кожної змінної та засвідчення всієї прив’язки за зовнішнім ключем цього запуску. Значення не записуються. Якщо змінні відрізняються, залежні перевірки середовища під новими значеннями не виконуються. Для старих або пошкоджених доказів без автентичного відбитка назви визначити неможливо й resume відхиляється. Виконайте свіжий прогін в окремий каталог. Створіть окремий захищений каталог PRIVATE_DIR поза checkout і доказами. Гейт створює новий файл ключа виключно для цього запуску. Зберігайте його поза ZIP. Для продовження й локальної перевірки вкажіть той самий файл. Після завершення перевірок його можна видалити. Втрата ключа потребує нового прогону. Ця діагностика залежить від довіри до власника локального ключа.

Output evidence includes raw test logs and may contain private values. Do not distribute the evidence directory without separate review. No protected input data or logs are included here.

## Historical inspection boundary

`historical-contract.json` names the positive/negative scenarios and clock/date requirements of original #18/#43/#47/#63/#90/#93. It explicitly identifies unsupported historical-only coverage. In particular, unchanged #43/#47 require dates through 22 November; a fixture ending before 19 November cannot honestly pass those commands. Do not weaken assertions or increase timeouts to hide missing states. Full canonical Git inputs are required for the full gate, including tree-sensitive original #13 and build #103 (now #105).

`export_historical.py` creates an external immutable inspection subset only after verifying exact Git blob hashes from `historical-source-sha256.json`. This manifest pins reconstruction commit `9ee2f0c6aebe1288b4e7c9fe6d60a708bcb4d6e7`, not the later repaired candidate. It exports November records strictly before 19 November, removes delivery metadata, and never prints values. It is deliberately **not** a replacement feed for the original commands.

```
python export_historical.py REPO NEW_EXTERNAL_DIRECTORY --source-commit 9ee2f0c6aebe1288b4e7c9fe6d60a708bcb4d6e7 --source-manifest historical-source-sha256.json
python probe_gate.py
```

The probe suite uses disposable synthetic Git repositories with no production inputs. It verifies matching resume, changed input/index/tree/commands, deliberate FAIL and retry, timeout, mid-command source mutation, incomplete command count and corrupt prior logs. This verifies runner behavior, not the 105 application checks or scientific forecast accuracy.
