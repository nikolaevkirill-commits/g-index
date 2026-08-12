# Release checklist

## Web/PWA gate

- [x] Production health не має hard failures; release guards PASS.
- [x] Manifest version синхронізована, PWA shortcuts не ведуть на відсутні файли.
- [ ] Android physical install, standalone, splash, offline PASS.
- [ ] Push після закриття браузера та deep-link PASS.
- [ ] 320/360/390/412 px і landscape PASS на фізичному Android.
- [ ] Lighthouse/PWA audit збережений.

## Product/policy gate

- [x] Privacy policy, terms і web account-deletion request опубліковані HTTPS.
- [ ] In-app і web account deletion працюють.
- [ ] Data Safety звірена з Worker, TWA та SDK.
- [ ] Support email активний.
- [ ] Content rating, target audience, ads і app access заповнені.
- [x] Play companion channel приховує web-продажі, auth і push до окремого reviewed release.

## Android gate

- [ ] Постійний application ID затверджено.
- [ ] Play App Signing увімкнено; fingerprint зафіксовано.
- [ ] TWA зібрана актуальним Bubblewrap/Android toolchain.
- [ ] `/.well-known/assetlinks.json` доступний без redirect/HTML.
- [ ] `.aab` відповідає актуальній Target API policy.
- [ ] Internal testing PASS, потім closed testing PASS.

## Forecast integrity gate

- [x] Hero має єдиний operational verdict.
- [x] Панчанга не голосує вдруге.
- [x] Tanita/v19.2 мають `score_effect=0` і HOLD.
- [x] Historical replay не підписаний як real-world accuracy.
- [x] Немає зелених raw/reference індикаторів, схожих на дозвіл діяти.
