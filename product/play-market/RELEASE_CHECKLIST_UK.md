# Release checklist

## Web/PWA gate

- [x] Production health без hard failures; release guards PASS.
- [x] Manifest version синхронізована; shortcuts не ведуть на відсутні файли.
- [ ] Android physical install, standalone, splash та offline PASS.
- [ ] Push і deep-link PASS у окремому reviewed release.
- [x] 320/360/390/412 px і landscape PASS у Chromium browser emulation.
- [ ] Ті самі viewports PASS на фізичному Android (external device gate).
- [ ] Lighthouse/PWA audit збережений.

## Brand і store assets

- [x] Назва-кандидат `Неборитм`, brand system і factor explainer підготовлені.
- [x] Feature graphic 1024×500 та icon 512×512 з provenance/SHA-256 готові.
- [x] Панчанга присутня в описі, графічній концепції та screenshot plan.
- [ ] Формальний trademark і store-name clearance завершено.
- [ ] Остаточні phone screenshots зроблені після mobile QA.

## Product/policy gate

- [x] Hero, provenance, sky-event, alert і реальні UTC→Europe/Kyiv DST-вектори проходять preflight.
- [x] UA/EN/ES listings проходять автоматичний length/claim lint.
- [x] Privacy policy, terms і web account-deletion request опубліковані HTTPS.
- [ ] In-app та web account deletion фізично перевірені.
- [x] Data Safety fail-closed inventory та Play Console worksheet підготовлені.
- [x] Native permissions і SDK звірені з фактичною versionCode 3 `.aab`; hash зафіксовано.
- [ ] Web runtime traffic звірено фізичним Android network capture перед Data Safety submission.
- [ ] Support email активний.
- [x] Content rating, target audience, ads і app access підготовлені як однозначний worksheet.
- [ ] Content rating, target audience, ads і app access фактично подані в Play Console.
- [x] Play companion приховує web-продажі, auth і push до окремого reviewed release.
- [x] TWA `enableNotifications=false`; preflight блокує передчасне повернення push.

## Android gate

- [x] Постійний application ID `com.neborythm.app` затверджено й автоматично звіряється.
- [x] Play App Signing увімкнено; SHA-256 fingerprint зафіксовано без приватного ключа.
- [x] TWA зібрана Android toolchain; підписана `.aab` прийнята Play Console як `1.0.0 (2)`.
- [x] `/.well-known/assetlinks.json` повертає HTTP 200 `application/json` для Play App Signing certificate.
- [x] Play Console прийняла `.aab` з target SDK 36.
- [x] Internal release опублікований у track.
- [x] Privacy candidate `versionCode 3` з `allowBackup=false` зібраний, підписаний і локально перевірений.
- [ ] Play Console прийняла `versionCode 3` та ним оновлено internal release.
- [ ] До internal track додані тестувальники й виконаний фізичний smoke test.
- [ ] Closed testing: щонайменше 12 тестувальників протягом 14 безперервних днів, потім production access.

## Forecast integrity gate

- [x] Hero має єдиний operational verdict.
- [x] Панчанга не голосує вдруге.
- [x] Tanita/v19.2 мають `score_effect=0` і HOLD.
- [x] Historical replay не підписаний як real-world accuracy.
- [x] Колір джерела не маскується під дозвіл діяти.
