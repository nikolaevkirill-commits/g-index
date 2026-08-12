# Release checklist

## Web/PWA gate

- [ ] Production health і release guards PASS.
- [ ] Android physical install, standalone, splash, offline PASS.
- [ ] Push після закриття браузера та deep-link PASS.
- [ ] 320/360/390/412 px і landscape PASS на фізичному Android.
- [ ] Lighthouse/PWA audit збережений.

## Product/policy gate

- [ ] Privacy policy опублікована HTTPS.
- [ ] In-app і web account deletion працюють.
- [ ] Data Safety звірена з Worker, TWA та SDK.
- [ ] Support email активний.
- [ ] Content rating, target audience, ads і app access заповнені.
- [ ] Play build не продає цифрові функції через LiqPay без дозволеної billing схеми.

## Android gate

- [ ] Постійний application ID затверджено.
- [ ] Play App Signing увімкнено; fingerprint зафіксовано.
- [ ] TWA зібрана актуальним Bubblewrap/Android toolchain.
- [ ] `/.well-known/assetlinks.json` доступний без redirect/HTML.
- [ ] `.aab` відповідає актуальній Target API policy.
- [ ] Internal testing PASS, потім closed testing PASS.

## Forecast integrity gate

- [ ] Hero має єдиний operational verdict.
- [ ] Панчанга не голосує вдруге.
- [ ] Tanita/v19.2 мають `score_effect=0` і HOLD.
- [ ] Historical replay не підписаний як real-world accuracy.
- [ ] Немає зелених data-health/raw/shadow індикаторів, схожих на дозвіл діяти.

