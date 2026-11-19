# Відтворення канонічного гейта з ZIP

Виконуйте з кореня розпакованого ZIP у Bash на Ubuntu. Потрібні Git, Python 3.12 з venv і заголовками для збірки, C-компілятор, Node 24 та доступ до GitHub HTTPS. Каталоги `exact-repo`, `audit-deps`, `private-evidence` та файл `bound.json` мають бути новими. Збережіть умови середовища для повторного запуску.

```bash
set -euo pipefail
unset_args=()
while IFS= read -r name; do
  case "${name^^}" in
    B7_*|CHROME_PATH*|CSS_UPGRADE_*|DAYLINE_*|DEPTH_LIMIT*|FP463_*|FP569*|NR*|QA_OLD_NAV*|SKY_*|SW_*|VERIFY_CLOCK_*|CACHE_PUBLISHED_BASELINE*|NODE_OPTIONS*|PYTHONPATH*|PYTHONHOME*|PYTHONUSERBASE*|PYTHONSTARTUP*|PYTHONOPTIMIZE*|PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH*)
      unset_args+=(-u "$name") ;;
  esac
done < <(compgen -e)
clean() { env "${unset_args[@]}" -u NODE_PATH "$@"; }
clean python3.12 candidate/tools/audit/restore_exact.py exact-repo --manifest reproduce/SOURCE_MANIFEST.json
deps="$PWD/audit-deps"
mkdir "$deps"
clean python3.12 -m venv --copies "$deps/python"
py="$deps/python/bin/python"
clean "$py" -m pip wheel --wheel-dir "$deps/wheels" pyswisseph==2.10.3.2
clean "$py" -m pip install --no-index --find-links "$deps/wheels" pyswisseph==2.10.3.2
clean npm install --prefix "$deps/node" --no-save --package-lock=false --no-bin-links playwright@1.62.1
export PLAYWRIGHT_BROWSERS_PATH="$deps/browsers"
clean node "$deps/node/node_modules/playwright/cli.js" install --with-deps chromium
gate() { clean env NODE_PATH="$deps/node/node_modules" "$py" exact-repo/tools/audit/run_gate.py "$@"; }
key_dir=$(mktemp -d)
gate exact-repo private-evidence exact-repo/tools/audit/commands-105.json --seal --sealed-output bound.json
gate exact-repo private-evidence bound.json --key-file "$key_dir/run.key"
report() { clean env NODE_PATH="$deps/node/node_modules" "$py" exact-repo/tools/audit/portable_report.py private-evidence "$@" --repo exact-repo --key-file "$key_dir/run.key"; }
report clean-report.json
gate exact-repo private-evidence bound.json --key-file "$key_dir/run.key" --resume
report resumed-report.json --verify-full-resume
```

Використовуйте нове віртуальне середовище без системних пакетів. Кожен видимий Python-дистрибутив має містити `RECORD` установленого wheel. Гейт перевіряє наявність зазначених файлів і звіряє їхній розмір та SHA256 там, де `RECORD` містить ці значення. Використовуйте Python без `-O` і `-OO`. Несумісні змінні треба вилучити через `env -u`, навіть якщо вони порожні. Канонічний гейт при відмові не створює `bound.json`. Після виправлення середовища повторіть запечатування.

Сирі журнали в `private-evidence` призначені для локального використання. Для нового ZIP використати цей файл як кореневий `REPRODUCE_UK.md`.

Якщо `--resume` відмовив через зміну середовища, у `env_keys` наведено назви доданих, змінених і вилучених ключів, зокрема `SHLVL` або `OLDPWD`. Значення залишаються приватними. Для старого запуску без перевіреної квитанції почніть новий прогін в окремому каталозі. Шлях до приватного каталогу ключа зберігається у `$key_dir`. Збережіть його для продовження й локального звіту. Ключ залишайте поза доказами, checkout і ZIP. Після завершення перевірки ключ можна видалити. Старі докази з вкладеним ключем відхиляються.
