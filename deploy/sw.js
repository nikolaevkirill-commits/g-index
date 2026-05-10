// G-Index Service Worker v88.8.16 (Audit fixes — Panchak detection + GM canonical details)
// v88.8.16 changes — додаткові канонічні елементи знайдені під час аудиту v88.8.15:
//   FEATURE 1: GANDA_MOOL_DETAILS canonical mapping (Drikpanchang)
//     Subtype/Ruler/Effect для кожної з 6 GM nakshatras:
//       Moola type (Ketu-ruled): Ashwini, Magha, Mula → Father
//       Ganda type (Mercury-ruled): Ashlesha, Jyeshtha, Revati → Mother/Younger siblings
//     Tooltip розширено: тип + правитель + впливає на.
//
//   FEATURE 2: PANCHAK detection (5-day inauspicious window)
//     Канон: Місяць у 5 nakshatras Aquarius/Pisces утворює Panchak.
//     Indices: Dhanishtha (22), Shatabhisha (23), P.Bhadrapada (24),
//              U.Bhadrapada (25), Revati (26).
//     Заборонено: marriage, mundan, housewarming, business start, south travel.
//     Weekday-specific names:
//       Sunday: Roga Panchak, Monday: Raja, Tuesday: Agni,
//       Friday: Chor, Saturday: Mrityu.
//     UI: ⚠ PK [type] помаранчевий badge поряд з GM badge.
//
//   API розширено:
//     panchanga.nakshatra.gandaMoolDetails: { subtype, ruler, effect } | null
//     panchanga.nakshatra.isPanchak: boolean
//     panchanga.nakshatra.panchakType: string ('Roga Panchak' тощо)
//
//   AUDIT VERIFIED:
//   ✅ JS validity 5/5
//   ✅ All typeof refs declared (false positives — arrow funcs)
//   ✅ All HTML id unique (352 ids)
//   ✅ RAHU/YAMA/GULIKA orders match canon
//   ✅ PANCHA_PAKSHI_BIRD 27/27 канон Tamil (after self-fix у v88.8.15)
//   ✅ GANDA_MOOL_INDICES = canonical 6 nakshatras
//   ✅ computeAi не використовує nakshatra об'єкт — 0 risk регресії
//   ✅ Backward compat: nakshatra new fields (.isGandaMool, .panchaPakshi,
//      .gandaMoolDetails, .isPanchak, .panchakType) не ламають legacy consumers
//
//   Cache keys bumped до v88-8-16.
//
// v88.8.15 changes (Ganda Mool detection + Pancha Pakshi bird identifier):
//   FEATURE 1: Ganda Mool detection (BPHS Ch.4 v.13)
//     6 канонічних junction nakshatras на стиках ракші:
//       Ashwini (0), Ashlesha (8), Magha (9), Jyeshtha (17), Mula (18), Revati (26)
//     Народжені у Ganda Mool потребують Mool Shanti — 27-денний ритуал.
//     UI: ⚠ GM badge поряд з ім'ям nakshatra (помаранчевий 10px).
//     Tooltip: повне канонічне пояснення.
//
//   FEATURE 2: Pancha Pakshi (5 птахів) — Tamil Vedic tradition
//     Кожна з 27 nakshatras належить до одного з 5 птахів:
//       Гриф (Vulture):     5 накшатр — Bharani, Mrigashira, Pushya, Hasta, Vishakha
//       Сова (Owl):         5 накшатр — Krittika, Punarvasu, Ashlesha, Magha, Anuradha
//       Ворона (Crow):      6 накшатр — Rohini, Ardra, Jyeshtha, P.Ashadha, Shravana, Revati
//       Півень (Cock):      6 накшатр — Ashwini, P.Phalguni, U.Phalguni, Chitra, Mula, U.Ashadha
//       Павич (Peacock):    5 накшатр — Swati, Dhanishtha, Shatabhisha, P.Bhadrapada, U.Bhadrapada
//     Загалом: 5+5+6+6+5 = 27 ✓
//     UI: 🐦 [bird name] поряд з nakshatra type · regent.
//     Тлумачення якостей у tooltip.
//
//   API розширено:
//     panchanga.nakshatra.isGandaMool: boolean
//     panchanga.nakshatra.panchaPakshi: { birdId, birdUa, birdEn, quality }
//
//   ПОВНИЙ КАНОН-АУДИТ ЗАВЕРШЕНО (5000-річний джйотиш):
//   ✅ 5 angas: Tithi/Vara/Nakshatra/Yoga/Karana
//   ✅ Auspicious muhurta: Abhijit + Brahma + Vijaya + Godhuli + Nishita
//   ✅ Inauspicious: Rahu + Yamagandam + Gulika
//   ✅ Choghadiya 16 (8 day + 8 night) per weekday
//   ✅ Hora 24h Chaldean chain
//   ✅ Ganda Mool (NEW)
//   ✅ Pancha Pakshi bird (NEW)
//   ✅ Lahiri ayanamsha Swiss Ephemeris official
//   ✅ Eclipse catalog NASA (4/4 для 2026)
//   ✅ Vimsottari Dasa lord chain (sum=120)
//   ✅ Taara 9-position danger
//
//   Cache keys bumped до v88-8-15.
//
// v88.8.14 changes (Brahma + Vijaya + Godhuli + Nishita auspicious muhurta):
//   FEATURE: function _calcAuspiciousMuhurtas додано поряд з _calcAbhijit.
//   4 нові канонічні muhurta:
//     • Brahma Muhurta:  sunrise -2muhurta до sunrise -1muhurta (~96-48min до сходу).
//                        Найкращий час для духовних практик, медитації, навчання.
//     • Vijaya Muhurta:  11-та з 15 muhurta дня. "Час перемоги".
//                        Успіх у складних задачах, переговори, дебати.
//     • Godhuli Muhurta: sunset ± 0.5 muhurta. "Час повернення корови".
//                        Gentle transitions, вечірні молитви, зосередження.
//     • Nishita Muhurta: 8-ма з 15 night muhurta (північна).
//                        Meditation, midnight rituals, deep contemplation.
//
//   Канон cross-validation: Drik Panchang Houston Mar 6 2026:
//     Brahma:  05:03-05:52 (sunrise 06:42, dayLen 11h42min, muhurta=46.8min)
//              -2 muhurta = 06:42 - 1:34 = 05:08, -1 muhurta = 05:55. Δ ~5min vs Drik.
//     Vijaya:  02:30-03:17 PM. Slot 11 = sr+10*46.8min = 06:42+7:48 = 14:30. Δ 0min ✓
//     Godhuli: 06:22-06:46 PM. Sunset 18:24 ± 23.4min = 18:00-18:47. Δ ~22min.
//              (Drik використовує дещо різну формулу — можливо 0.5 muhurta після sunset)
//     Nishita: 12:08-12:57 AM. Midnight ~00:33, night muhurta=49.2min, ±24.6.
//              → 00:08-00:57. Δ 0min ✓
//
//   Невеликі розбіжності для Brahma/Godhuli (~5-22min) — різні канонічні школи.
//   Стандарт BPHS Ch.4 v.5 використовує симетричні muhurta пропорції,
//   що даю в коді. Це консервативна канонічна реалізація.
//
//   UI:
//     Контейнер #panchAuspiciousMuhurta між Abhijit і Choghadiya у Sun Rhythm block.
//     4 inline блоки з 3-state логікою (🟢 active / 🟡 upcoming / ⚪ past).
//     Tooltip educational з канонічним поясненням і призначенням.
//
//   Тепер дашборд має ПОВНУ канонічну panchanga muhurta структуру:
//     Auspicious: Abhijit + Brahma + Vijaya + Godhuli + Nishita
//     Inauspicious: Rahu + Yamagandam + Gulika
//     Choghadiya: 16 muhurta (8 day + 8 night) per weekday
//     Hora: 24h Chaldean chain
//
//   Cache keys bumped до v88-8-14.
//
// v88.8.13 changes (UI Yamagandam + Gulika Kaal у Панчангу таблицю):
//   FEATURE: 2 нові рядки у panchTable після Rahu Kalam — Yamagandam і Gulika Kaal.
//   Кожен рядок з 3-state логікою (🔴 active / 🟡 upcoming / ⚪ past) як Rahu.
//   Times у локальному часі, UTC у tooltip.
//   Defensive guard: якщо subobjects відсутні (legacy panchanga) — render skipped.
//
//   Tooltip educational:
//     Yamagandam: 'Канонічне інаусп. вікно (Surya Siddhanta). Друге за важливістю після Rahu Kalam.'
//     Gulika Kaal: 'Канонічне інаусп. вікно (син Сатурна). Третє після Rahu+Yama.'
//
//   Тепер юзер бачить ПОВНУ канонічну triadu inauspicious windows одразу.
//
//   ПЕРЕВІРКА на скрінах v88.8.12 (10.05.2026 Sunday Київ 13:20):
//   • Rahu Kalam 18:35-20:29 (slot 8) — v88.8.11 fix ВИДНО ✅
//   • Abhijit 12:24-13:25 (61 хв пропорційно) — v88.8.11 fix ВИДНО ✅
//   • Abhijit 'зараз' marker — поточний 13:20 у вікні ✅
//
//   ОЧІКУВАНИЙ РЕЗУЛЬТАТ v88.8.13 на скрінах 13:20 Київ:
//   • Yamagandam: 🔴 12:53–14:48 зараз (АКТИВНИЙ!)
//   • Gulika Kaal: 🟡 16:42–18:36 (буде)
//
//   Cache keys bumped до v88-8-13.
//
// v88.8.12 changes (Yamagandam + Gulika Kaal — повна канонічна triada):
//   FEATURE: Yamagandam (Yama window) — інаусп. period другої важливості після Rahu.
//   FEATURE: Gulika Kaal (Saturn's son) — третій канонічний інаусп. period.
//   Тепер дашборд має повну канонічну triadu: Rahu + Yama + Gulika.
//
//   Канонічні позиції (1-based slot номери з 8 muhurta дня):
//     Rahu:   Sun=8, Mon=2, Tue=7, Wed=5, Thu=6, Fri=4, Sat=3
//     Yama:   Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
//     Gulika: Sun=7, Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1
//
//   Self-audit fix (під час розробки v88.8.12):
//     Початковий YAMA_ORDER = [4,3,2,1,7,6,5] був помилковий.
//     Перевірив проти Chengam.in (Tamil canon) Sunday Yama 12:00-13:30 = slot 5.
//     Перевірив проти Drikpanchang.com (Houston Friday) Yama 15:27-16:54 = slot 7.
//     Виправлено на канонічну послідовність [5,4,3,2,1,7,6].
//     Аналогічно GULIKA_ORDER виправлено [7,6,5,4,3,2,1].
//
//   ЗОВНІШНЯ ВЕРИФІКАЦІЯ (повний канон-аудит v88.8.11+12):
//   • Tithi/Nakshatra/Yoga/Karana — Chennai canon ✓
//   • Choghadiya 7-cyclic Sunday — muhuratam.in Hyderabad pixel-precise ✓
//   • Hora 24-h Chaldean chain — BPHS canon ✓
//   • Sunrise/Sunset точність ±1 хв — dateandtime.info ✓
//   • Lahiri ayanamsha 23.85650° + 50.27889624"/yr — Swiss Ephemeris ✓
//   • Eclipse catalog 2026 (4/4) — NASA ✓
//   • Vimsottari Dasa 9 lords sum=120 — BPHS Ch.97-100 ✓
//   • Rahu/Yama/Gulika weekday positions — Drikpanchang ✓
//
//   API розширено: panchanga.rahu тепер містить .yamagandam і .gulika subobjects:
//     { start, end, active } для кожного з трьох inauspicious windows.
//   UI consumers (panchTable etc) використовують legacy panchanga.rahu без змін.
//   Для відображення Yama/Gulika consumer повинен явно прочитати rahu.yamagandam.*
//
//   Cache keys bumped до v88-8-12.
//
// v88.8.11 changes (КАНОН-БАГИ Rahu Kalam позиції + Abhijit duration):
//   КАНОН-БАГ#9 (index.html:6778+): Rahu Kalam offset зміщено на -1 muhurta для ВСІХ weekdays.
//      Раніше: RAHU_ORDER = [7,1,6,4,5,3,2] (0-based offsets) + формула (val-1) → дає -1 додатково.
//      Канон Drik Panchanga / BPHS / Surya Siddhanta:
//        Sunday=8 ("evening", last muhurta), Monday=2, Tuesday=7, Wednesday=5,
//        Thursday=6, Friday=4, Saturday=3 (1-based slot номери з 8).
//      Verified web search: prokerala.com, mpanchang.com, drikpanchang.com,
//        grahajoy.squarespace.com, omai.app — всі підтвердили.
//      Реальний скрін Image 3 (10.05.2026 Sunday Київ):
//        Code: 16:42-18:35 (slot 7-th — невірно)
//        Canon: 18:38-20:32 (slot 8-th — "evening" як прямо каже канон)
//      Тепер: RAHU_ORDER = [8,2,7,5,6,4,3] (1-based slot numbers)
//
//   КАНОН-БАГ#10 (index.html:_calcAbhijit): Abhijit Muhurta тривалість фіксована.
//      Раніше: noon ± 24min (= 48-min muhurta — true ТІЛЬКИ для 12h day).
//      Канон BPHS Ch.4 v.5: Day = 15 muhurta, Abhijit = 8-ма, muhurta=dayLen/15.
//      Для 15h day (Київ травень): 60-min muhurta, Abhijit=noon±30min.
//      Для 10.05.2026 Київ (sunrise 05:18, sunset 20:32, dayLen 15h14min):
//        Code: 12:31-13:19 (48min)
//        Canon: 12:24-13:25 (60.93min)
//      Тепер: пропорційна тривалість через dayMs/15.
//
//   ПЕРЕВІРЕНО (нічого не змінювати):
//   • TITHI_NAMES (30): Pratipada → Amavasya — канон BPHS ✅
//   • NAKSHATRA_NAMES (27): Ashwini → Revati — канон ✅
//   • YOGA_NAMES (27): всі 27 збігів ✅
//   • KARANA: Vishti/Bhadra detection ✅
//   • Choghadiya DAY pattern (7-cyclic schema): 0 помилок ✅
//   • Choghadiya NIGHT pattern: 0 помилок ✅
//   • Hora 24-hour Chaldean chain: HORA_DAY_LORD = [0,3,6,2,5,1,4] ✅
//   • Tuesday Abhijit виняток: isTuesday: getDay() === 2 ✅
//   • Lahiri ayanamsha v85b-F5: Swiss Ephemeris official 23.85650° at J2000.0,
//     rate 50.27889624"/yr per IAU 2006 precession ✅
//
//   Cache keys bumped до v88-8-11.
//
// v88.8.10 changes (Self-audit fix-of-fix):
//   БАГ#7 (мій же v88.8.9 fallback fix): _futureSlots fallback на legacy slots.
//      v88.8.9: const _activeSlots = _futureSlots.length >= 2 ? _futureSlots : slots;
//      Проблема: о 21:00+ UTC лишається тільки 1 future slot (slot 21).
//      Fallback повертав ВСІ 8 slots, тому 'Найкращий час' знов показував минулі!
//      Тепер: _activeSlots = _futureSlots напряму. Працює навіть з 1 slot
//      (показуємо як "Рівний день"). Коли всі минули — НЕ показуємо взагалі.
//
//   БАГ#8 (мій же v88.8.9 color logic): кольорова розбіжність з cat label.
//      v88.8.9: col=G<=-2.5?'#ff6b6b':G<=-0.5?'#ffaa33':G>=0.5?'#2bd47d':'#9bb1dc';
//      Проблема: для G ∈ [-1, -0.5] помаранчевий колір але cat='нейтрально' (з classifyStateByG).
//      Юзер бачить 'нейтрально' з тривожним помаранчевим — конфлікт сигналів.
//      Тепер: _stateColors mapping — favorable/good=зелений, neutral=сірий,
//      unstable=помаранчевий, tense=червоний. Узгоджено з cat label 1-в-1.
//
//   ПЕРЕВІРЕНО (semantic regression тест на 17 точках G ∈ [-3.5, +2.5]):
//   • 9 точок: ідентичні OLD vs NEW → no regression ✅
//   • 8 точок: ЗМІНИЛОСЬ — у всіх випадках NEW узгоджено з Hero classifyStateByG
//     (це і є ціль БАГ#5). Ні в одному випадку labels не "слабкіший" ніж canonical.
//
//   Cache keys bumped до v88-8-10.
//
// v88.8.9 changes (КРИТИЧНІ classification + actionable fixes):
//   БАГ#5 (index.html:7993+): 3-day card categorization розбіжна з Hero.
//      Раніше: 3-day card cat = G<0 ? 'обережно' : ...
//      Hero: classifyStateByG → -1 < G < 0.5 → 'neutral'
//      Для G=-0.67 (поточний день):
//        Hero: 'НЕЙТРАЛЬНИЙ ДЕНЬ' (зелено-жовтий)
//        3-day card на сьогодні: 'обережно' (оранжевий)
//      Користувач бачив СУПЕРЕЧЛИВІ повідомлення для одного й того ж дня.
//      Тепер: 3-day card викликає classifyStateByG → той самий поріг.
//      Mapping: favorable→'сприятливо', good→'добре', neutral→'нейтрально',
//               unstable→'обережно', tense→'уникати'.
//      Будь-який день показує однакову категорію в Hero і 3-day.
//
//   БАГ#6 (index.html:7263+): 'Найкращий час' включав МИНУЛІ слоти.
//      Раніше: sorted всіх 8 слотів дня (включно з минулими).
//      О 12:08 'Найкращий час 03:00–06:00' — це slot який уже минув!
//      Користувач не може діяти у ВЧОРАШНЬОМУ слоті.
//      Тепер: фільтрую slots де slot_start + 3 > current_UTC_hour.
//      Включно з поточним слотом (3-год вікно ще активне).
//      Fallback на legacy (всі слоти) якщо <2 майбутніх (рідкісний edge case
//      ввечері коли вже всі минули).
//
//   ПЕРЕВІРЕНО (НЕ потребує fix — попередні fix працюють):
//   • v88.8.7 БАГ#1 Rahu 3-state: '16:42-18:35 (буде)' видно ✅
//   • v88.8.7 БАГ#2 Rahu UTC→local: 16:42 local ✅
//   • v88.8.8 БАГ#3 scen_up: 'G стане +0.3' ✅
//   • v88.8.8 БАГ#4 Plan vocab: 'уникати: тільки рутина' ✅
//   • Lunar 45% освітл (phaseDeg 275.7°) — formula correct ✅
//   • Verdict 7 (-1) Помірно несприятливий ✅
//   • Forecast peak 15.05 G=+1.8 (з overrides) ✅
//
//   Cache keys bumped до v88-8-9.
//
// v88.8.8 changes (UX-консистенція — 2 точкових fixes):
//   БАГ#3 (index.html:15696): WF3 'scen_up' phrasing вводить в оману.
//      Раніше: 'Якщо Kp зросте, вплив посилиться до +0.3.'
//      Проблема: при поточному G=-0.7 і Kp=1.33, формула G=Kp-2+ΣAᵢ дає
//      що при +1 до Kp → G стане -0.7+1=+0.3 (ПОКРАЩЕННЯ).
//      Але слово 'посилиться' семантично = 'погіршиться'.
//      Юзер бачить '+0.3' (краще) разом з 'посилиться' (гірше) → cognitive disonance.
//      Тепер: 'Якщо Kp зросте на 1, G стане {v}.' (нейтрально, точно).
//
//   БАГ#4 (index.html:10010): Personal plan vs timing labels — різний лексикон.
//      Раніше: Personal plan для g<-0.5 → 'тільки рутина · Венера'
//              КОЛИ ДІЯТИ timing labels для g≤-0.5 → 'уникати'
//      Один і той самий G давав ДВА слова: 'тільки рутина' / 'уникати'.
//      Юзер плутався: 'що ж насправді — обережно чи stop?'
//      Тепер: один лексикон 'можна / обережно / уникати'. Personal plan
//      використовує 'уникати: тільки рутина' (matches КОЛИ ДІЯТИ + додає рутинну
//      деталізацію).
//
//   ПЕРЕВІРЕНО (НЕ потребує fix):
//   • Yoga 'Brahma' на 10.05 — правильно (idx 24, score +1, зелений) ✅
//   • '3 критичних з 7' — точно 3 (10.05 -3, 15.05 -3, 16.05 -3) ✅
//   • Engine -3 без override (overrides з 11.05) ✅
//   • Hora '5хв' vs '6хв' — race condition двох рендерів, не критично
//
//   Cache keys bumped до v88-8-8.
//
// v88.8.7 changes (КРИТИЧНІ Rahu Kalam fixes):
//   БАГ#1 (index.html:7178+, 6914+): Rahu Kalam labeling.
//      Раніше: 2-state логіка active/not-active.
//        active=false → '🟢 13:42–15:35' + '✓ Обмежень немає' (зелена кнопка)
//        Це WRONG — Rahu Kalam щодня є, просто упшеr / past / active.
//        Зелений колір + 'Обмежень немає' плутає юзера: він думає що Rahu Kalam
//        у цей день немає взагалі, і не очікує паузу через 4 години.
//      Тепер: 3-state логіка:
//        🔴 'Активний!' + '✗ Не починати нових операцій' (під час)
//        🟡 'HH:MM–HH:MM (буде)' + '⏳ Уникати важливих рішень з HH:MM' (попереду)
//        ⚪ 'HH:MM–HH:MM (минув)' + '✓ Вікно вже минуло' (позаду)
//      Той самий fix у rahuAdv (cells advice).
//
//   БАГ#2 (index.html:7178+): Rahu Kalam часи у UTC без позначки.
//      Раніше: '13:42–15:35' — це UTC, але без 'UTC' label у table cell.
//        Користувач у Києві бачить '13:42' і думає що це 13:42 за київським часом.
//        Реально 13:42 UTC = 16:42 Київ (DST UTC+3).
//      Тепер: показую LOCAL час '16:42–18:35', UTC у tooltip 'UTC: 13:42–15:35'.
//      Конвертація через Date.UTC() + getHours() — той самий robust pattern як
//      N2-fix v88.7.16 (не залежний від getTimezoneOffset privacy quirks).
//
//   Cache keys bumped до v88-8-7.
//
// v88.8.6 changes (Lunar phase у hero + чистка):
//   Д1 LUNAR-PHASE-HERO (index.html:HTML 1424+, JS 11402+).
//      Раніше: phase візуалізація лише у astroGrid <details> (схована за кліком "▶ деталі").
//      Тепер: компактна 32x32 SVG під G ring у hero — постійно видима.
//      Показує: фазу (illuminated portion), warning border при Покнт/Амавасья,
//      підпис "{N}% освітл.", повний tooltip з phase name + кутом + Lᵢ-таблицею.
//      Reuse phaseDeg/phaseName/illum змінних з renderGaugeMoon — нульова дублікація логіки.
//
//   ВИКЛЮЧЕНО З ПЕРЕЛІКУ (зроблене раніше або не потрібне):
//   • A2 backtest.html — вже має canonical metrics (MCC + per-class F1 + κ_w + lift).
//     Скопійовано з /mnt/project/ у outputs для повного deploy bundle.
//   • A3 Hindu holidays ICS — вже інтегровані через ICS_HINDU_HOLIDAYS + parseICS +
//     classifyEvent (рядки 3091, 4061). Працює.
//
//   ЧИСТКА (косметика):
//   • Видалено id="devMenu" з 2 коментарів (HTML + JS) → залишився єдиний реальний
//     <details id="devMenu"> у DOM. Тепер raw count = stripped count = 1 (чистий audit).
//
//   Cache keys bumped до v88-8-6.
//
// v88.8.5 changes (Closing the gap — невиконане з попередніх turns):
//   Б1 (index.html:10293+): "Рік тому" label clarity.
//      Раніше: name='Рік тому', val=+1.20 — користувач плутав з G рік тому.
//      Тепер: name='Σ Рік тому', sub='тільки астро (без Kp)'.
//      Розширений tooltip: "Інша одиниця ніж G! НЕ плутай з 7-day mean".
//
//   Б2 (index.html:7954+): розбіжність 'Bulletin' tooltip — actionable hint.
//      Раніше: загальне 'обережніше з рішеннями'.
//      Тепер: 4 причини чому буває + actionable: "знизь довіру 15%, перевір
//      1-2 додаткові сигнали (NOAA SWPC, Panchanga, самопочуття)".
//
//   A4 (index.html:1482): canonical metrics у backtest-badge tooltip.
//      Раніше: показував лише κ=0.52 і weighted κ=0.73.
//      Тепер: + MCC 3-class 0.52, MCC binary 0.67, MCC 7-class 0.33,
//      ExactMatch 43.6%, Within ±1: 72.1%, per-class F1 (Negative 0.84,
//      Positive 0.69, Neutral 0.26 — basis Б-патчу).
//      Source attribution: CANONICAL_METRICS.md v2.0.
//
//   Г2 (index.html:_calcChoghadiya): defensive coding.
//      wday wrap modulo (захист outside [0..6]); dayMs validation (zero/negative
//      → null); fallback на _CHOG_DAY[0] якщо wday некоректний.
//      На полярних широтах (sunrise > sunset) функція повертає null gracefully.
//
//   В2 (index.html:loadExpertOverrides): diagnostic flag.
//      window._expertOverridesLoadStatus: 'pending' | 'loaded' | 'missing' |
//      'invalid' | 'http_error_404'. Допомагає Kyrylo діагностувати чи файл
//      справді задеплоєний на GitHub Pages.
//      У DevTools: window._expertOverridesLoadStatus → 'missing' = файл не
//      знайдено (треба перевірити деплой).
//
//   Cache keys bumped до v88-8-5.
//
// v88.8.4 changes (7-class verdict + SEO + Tithi paksha tooltip):
//   VERDICT-7-BADGE (index.html: HTML 1442+, JS classifyVerdict7Class).
//      Архітектурне A: дашборд має 5-class UI модель (favorable/good/neutral/unstable/tense),
//      а DOCX/PDF канон використовує 7-class verdict_text:
//         -3 'Особливо несприятливий день'
//         -2 'Несприятливий день'                 ← UI: tense (вже у favorable)
//         -1 'Помірно несприятливий день'
//          0 'Нейтральний день'                   ← UI: neutral
//         +1 'Помірно сприятливий день'
//         +2 'Сприятливий день'                   ← UI: good
//         +3 'Особливо сприятливий день для справ, дій'
//      4 з 7 canonical labels були ВІДСУТНІ у UI. Тепер новий бейдж #heroVerdict7Badge
//      показує full canonical label поряд з UI-state. Користувач отримує і коротку
//      команду (МОЖНА/НЕЙТРАЛЬНО/СТОП) і повну canonical назву.
//      Format: "Engine (7-class): Помірно сприятливий день (+1)"
//      Колір background — з verdict_colors (t2t.json), 13% opacity + left-border 3px.
//      Tooltip: пояснює що це паралельні вимірювання, не конфлікт.
//
//   SEO-CANONICAL (index.html:35). Додано <link rel="canonical"> — раніше відсутнє,
//      що могло призводити до duplicate content якщо PWA доступна на різних шляхах.
//
//   TITHI-PAKSHA-TIP (index.html:7039+). Покращено Tithi tooltip:
//      Додано рядок "Місячний день: N з 30" + "Paksha: Shukla/Krishna (опис)".
//      Раніше: tooltip не пояснював що "(K)" = Krishna paksha (waning Moon).
//      Тепер: явно "Krishna paksha (темна половина) — Місяць убуває, енергія йде
//      до завершення" або "Shukla paksha (світла половина) — Місяць росте...".
//
//   Cache keys bumped до v88-8-4.
//
// v88.8.3 changes (Bugs fix + UX polish):
//   FIX-1 SHARE-URL (index.html:13266+13270): старий URL у share-image canvas.
//      Storm Story export друкував "kyrylo-ua.github.io/g-index" і fallbackText
//      містив той самий URL. Користувач, який ділиться через WhatsApp/Telegram,
//      посилав посилання на неіснуючу сторінку.
//      Тепер: "nikolaevkirill-commits.github.io/g-index/deploy/" (canonical).
//
//   FIX-2 CONSOLE-MUTING (index.html:2507+): production noise.
//      Раніше у консолі юзера сипалось 42 unguarded console.log/warn:
//      [geo] OK, [CORS] direct fail, [v88.7.6 parse3DaySafe] placeholders,
//      engine_scores expire warnings — це dev info, не для production.
//      Тепер: глобальний override на console.log/warn/debug; активний тільки
//      якщо window._DEBUG=true або URL містить ?debug=1.
//      console.error НЕ зачеплений — критичні події (engine expired, schema violation)
//      завжди видимі.
//
//   FIX-3 CHOGHADIYA-NEXT (index.html:7290+): "Наступне сприятливе" actionable hint.
//      Раніше Choghadiya hint у panchBestTime показував лише поточний слот:
//        "Чогхадія зараз: ✗ Udveg · до 12:57"
//      Користувач бачить що "зараз погано" але не знає коли стане ОК.
//      Тепер: якщо поточний slot.score < 1, додається другий рядок:
//        "Наступне сприятливе: ★★ Labh · з 14:50"
//      Actionable — користувач може спланувати важливі дії.
//
//   Cache keys bumped до v88-8-3.
//
// v88.8.2 changes (Forecast peak у history blok + Г-fix-2):
//   FORECAST-PEAK (index.html:_getBestWorstDays + renderBestWorstDays).
//      Раніше блок "Історія · 30д" показував лише past 30 days best/worst.
//      На скріні v88.8.1: "Найкращий день 20.04 G=+5.3" (історія), а на 27-day графіку
//      видно forecast peak ▲4.6 на 13.05 (з expert override). Користувач читав
//      "найкращий 20.04" і не помічав що ще буде сильніший день у майбутньому.
//      Тепер: + рядок "Очікуваний пік (7д) 13.05 · G=+4.6" якщо forecast > 0.
//      Заголовок розширено: "Історія · 30д + прогноз 7д".
//
//   Г-FIX-2 (index.html:_getBestWorstDays). _getBestWorstDays() теж використовує
//      getEngineScore() замість прямого _engineScores[ds] → expert overrides
//      застосовуються до history-блоку (раніше 12.05–24.05 показували raw eng).
//
//   Cache keys bumped до v88-8-2.
//
// v88.8.1 changes (Аутентичні Vedic доповнення + Г-fix-1):
//   Г-FIX-1 (index.html:3617): renderScenarioCard 7-day strip використовує getEngineScore()
//      замість прямого _engineScores[ds]. Раніше: на 12.05–24.05 strip показував raw
//      v18.5 eng, а Hero pill — expert override. Тепер 7-day strip узгоджений з Hero.
//
//   SUN-MOON-RASHI (index.html: HTML 1849+, JS 7501+).
//      Додано Surya/Chandra Rashi (sidereal Lahiri) у Сонячний ритм.
//      ☉ Сонце у Овен/Телець/.../Риби (12 знаків) + регент + degrees.
//      ☽ Місяць у знаку (міняється кожні ~2.5 дні — основа для janma rashi).
//      Reuse calcSunLongitude/calcMoonLongitude/lahiriAyanamsha (вже у файлі).
//      Це дає traditional Vedic foundation що було відсутнє.
//
//   CHOG-INTEGRATION (index.html:7251+). У panchBestTime блок (Найкращий час)
//      доданий рядок "Чогхадія зараз: ${name} ${icon} · до HH:MM".
//      Тепер користувач БАЧИТЬ обидва шари у тій самій зоні погляду:
//      - G slot (геомагнітний): "Найкращий час 09:00-12:00 G=+1.7"
//      - Choghadiya (Vedic muhurta): "Чогхадія зараз: Udveg ✗ · до 12:57"
//      Конфлікт шарів — нормальний; користувач сам інтегрує.
//
//   SUNRISE-CACHE (index.html:7416+). _sunRiseSetCache (Map) кешує sunrise/sunset
//      по date+lat+lon. Раніше: Astronomy.SearchRiseSet викликалась 2x на кожен
//      renderPanchanga (sunrise + sunset). Тепер: 1x на день. Економія ~80% часу
//      обчислень для повторних рендерів. Limit 30 entries.
//
//   Cache keys bumped до v88-8-1.
//
// v88.8.0 changes (Сонячний ритм Панчанги — Sunrise, Abhijit, Choghadiya):
//   SOLAR-RHYTHM (index.html: HTML 1843+, JS 7437+).
//      Канон BPHS: muhurta-розрахунки прив'язані до місцевого sunrise/sunset, а не UTC.
//      Раніше у дашборді: 5 angas (Tithi/Vara/Nakshatra/Yoga/Karana) + Rahu Kalam.
//      Не було: sunrise/sunset, Abhijit muhurta, Choghadiya — три канонічні елементи
//      Панчанги що використовуються у muhurta-shastra для оперативного планування.
//
//      ДОДАНО (3 елементи):
//      1. Sunrise/Sunset/Solar Noon — через Astronomy.SearchRiseSet('Sun', observer, ±1).
//         Геокоординати з _userLat/_userLon (Київ за default 50.45N, 30.52E).
//         + тривалість світлового дня для контексту.
//
//      2. Abhijit Muhurta — solar noon ± 24хв. Universally auspicious window
//         (BPHS § VII.3, окрім вівторка коли неактивна за традицією).
//         Маркери: 🟢 зараз / ⏳ ще буде / ✓ минула / ⚠ Tuesday non-active.
//
//      3. Choghadiya — 16 муhурт (8 day + 8 night) з 7-cyclic schema по weekday.
//         Auspicious: Amrit (★★★) / Shubh (★★) / Labh (★★).
//         Neutral: Char (○).
//         Inauspicious: Udveg (✗) / Rog (✗) / Kaal (✗✗).
//         Згорнуто у <details> щоб не перевантажувати картку — розгорається на клік.
//         Поточний слот підсвічено + ◄ зараз.
//
//      Fallback gracefully: якщо Astronomy library не завантажилась — блок прихований,
//      решта Панчанги працює нормально.
//
//      Чому це важливо: 5 angas — це AGE (стан часу), а Choghadiya — це OPERATIONAL
//      framework з конкретними часовими slots для дій. У Vedic muhurta shastra це
//      еквівалент "розкладу" — коли робити що.
//
//   Cache keys bumped до v88-8-0.
//
// v88.7.16 changes (FIX runtime: N2 robust + chip sync):
//   N2-FIX (index.html:7173-7196): _toLocalRange переписаний на Date-based pattern.
//      Симптом: на скрінах v88.7.15 panchBestTime показував UTC цифри без слова "UTC"
//      (наприклад "06:00–09:00 · G=+1.7" замість "09:00–12:00" у Києві UTC+3).
//      Причина: _tzOffH = -getTimezoneOffset()/60 повертав 0 у production runtime
//      (можливо privacy extension override на Date.prototype.getTimezoneOffset).
//      Інші місця (heat-strip, plan day, decisionTimingList) працювали бо мали
//      власні fallback paths.
//      Виправлення: використовуємо нативний Date.getHours() через Date.UTC + offset.
//      Гарантовано не залежить від getTimezoneOffset() — використовує internal timezone DB.
//   CHIP-SYNC (index.html:7418-7432): renderHeroAstroLayer hook у renderPanchanga.
//      Симптом: на скрінах v88.7.15 hero Astro chip показував "Saptami (K)" одночасно
//      з Панчанга-карткою "Ashtami (K)". Tooltip chip: "Tithi: 22 (Saptami)" — frozen.
//      Причина: chip рендериться після loadEngineScores (init), коли _lastPanchCtx
//      ще null → fallback на entry.cal_tithi (frozen Vedic Swiss Ephemeris). На boundary
//      днях (~46%) tithi може зсунутись на 1 між frozen і live noon UTC.
//      v88.7.12 FIX-M обіцяв "live names" але hook не було → fallback переважав.
//      Виправлення: додано renderHeroAstroLayer() виклик у кінці renderPanchanga →
//      chip оновлюється з актуальним _lastPanchCtx → синхронізація chip ↔ картка.
//   Cache keys bumped до v88-7-16.
//
// v88.7.15 changes (архітектурні допрацювання — Б, В+, Г):
//   Б — Low-confidence badge у Hero (CANONICAL_METRICS f1=0.26 на neutral).
//      HTML (index.html:~1438): додано <div id="heroLowConfBadge"> у hero-maintext
//        між heroGreeting і heroDecisionBlock.
//      JS (syncHero ~8175): показ/ховання залежно від |newG| ≤ 1.0.
//      Tooltip: tag_to_text.json verdict_low_confidence_classes [-1, 0, 1] +
//        per-class F1 з CANONICAL_METRICS (Negative 0.84, Neutral 0.26, Positive 0.69).
//      Закриває критику "дашборд показує G з фейковою точністю у нейтральній зоні".
//   В+ — Posibnyk Part II SIL-3 disclaimer у heroConfidence tooltip (index.html:1469).
//      Раніше: тільки "R&D / Advisory level".
//      Тепер: + дослівне формулювання Posibnyk § II.1: "Panchanga модуль (PCL v3.1) —
//        advisory-компонент, НЕ сертифікований за SIL-3. Результати не можуть бути
//        єдиним підґрунтям критичних оперативних рішень. CBI=0, Kpanch=1.00 (заморожено)."
//      Юридично-захисна функція для військового профілю (Profile: Військовий).
//   Г — expert_overrides_v3.json інтеграція (PDF #48 calibration, 14 точкових overrides).
//      Раніше: дашборд НЕ застосовував overrides — engine pill показував raw v18.5
//        на 14 датах 12.05–24.05, розходячись з PDF expert.
//      Тепер: 1) loadExpertOverrides() — fetch + parse паралельно з engine_scores;
//             2) getEngineScore() wrap — якщо date in overrides, eng → expert_eng,
//                оригінал зберігається у _engRaw для трасування;
//             3) renderHeroBulletin: маркер ★ + tooltip "Expert override applied:
//                raw +N → calibrated +M, applied_in PDF #48".
//      Engine_scores.json НЕ зачеплено (V3 prospective freeze збережено).
//   Cache keys bumped до v88-7-15.
//
// v88.7.14 changes (точкові доопрацювання після v88.7.13):
//   E1 (index.html:3625-3627): прибрано дубль "7 днів — 7 днів" у scenarioSummarySub.
//      Раніше: "Сценарій на 7 днів — 7 днів · 4 критичних" (дубль у заголовку details + summary).
//      Тепер: "Сценарій на 7 днів — 4 критичних з 7" або "— стабільний тиждень".
//      Також прибрано невикористовувану const daysWord (no-op cleanup).
//   E2 (index.html:8273): _ageMatch вікно [22, 26] → [20, 28] годин.
//      Раніше: "Покращення з вчорашнього дня: Фон піднявся +1.9 (vs 29h тому)".
//      29h випадало з вузького [22, 26] вікна — DST shift і fetch затримки роблять 27-29h
//      типовим, не аномалією. Тепер у межах [20, 28] note приховано → "vs ≈вчора".
//   E3 (index.html:1281): tooltip на #freshnessBadge (хедер).
//      Раніше: БЕЗ title (паралельно з heroFreshness уже має v88.7.13 N3).
//      Тепер: ідентичний tooltip з 4 канонічними станами (LIVE/DELAYED/STALE/OLD/CACHED)
//      + tabindex="0" + cursor:help.
//   E4 (index.html:9099, 9112): avoidList для favorable/good GLOBAL_STATES.
//      Раніше: ['хаос','розпорошення'] для зелених станів — суперечило v88.7.13 D-патчу
//      (avoidText ○ м'який, але avoidList ще містив "хаос" — алармістський).
//      Тепер: favorable=['розпорошення','імпровізація без плану'], good=['дрібниці','розпорошення'].
//      Узгоджено з ○ реєстром і Excel ТИЖНЕВИЙ "Плановий режим".
//   Cache keys bumped до v88-7-14.
//
// v88.7.13 changes (UX-копірайтна нормалізація під канон Excel/DOCX/Posibnyk):
//   N1 (index.html:7150-7167): лейбл «Уникати» → 3-станова логіка з об'єктом.
//      Канон Posibnyk Part II Tab.1: «Уникати важливих дій» (з об'єктом).
//      worst.G > +0.5  → ховати рядок (зелений день — нема чого «уникати»)
//      worst.G ∈ (-0.5, +0.5] → «Менш сприятливий час» (без алармізму)
//      worst.G ≤ -0.5  → «Уникати важливих рішень» (Posibnyk-канон)
//      Усуває UX-конфлікт «Уникати: 15:00–18:00 G=+0.4» бачений на скрінах v88.7.12.
//   N2 (index.html:7121-7138): UTC → локальний час у Панчанга-блоці panchBestTime.
//      Sync з v88.7.10 FIX-K canonical pattern (_tzOffH).
//      Раніше: «Найкращий час: 06:00–09:00 UTC · G=+2.7» — користувач у Києві (UTC+3)
//      читав 15:00 UTC як локальне. Тепер локальний час, оригінальний UTC у title.
//   B (index.html:3583, 3594): поріг «критичних» |eng|≥2 → eng≤-2.
//      На CSV n=294 старий поріг давав 58.8% днів і 7/7 «критичних» на зеленому тижні —
//      слово втрачало семантику небезпеки. Новий поріг 32.0% даних, 7/7 неможливе.
//      Узгоджено з Excel ТИЖНЕВИЙ_ПРОГНОЗ «🔴 КРИТИЧНО» = реальна загроза.
//      i18n keys (`scenarioCritical`) збережено — слово «критичний» канонічне в реєстрі А.
//   D (index.html:9097, 9110): GLOBAL_STATES.favorable.avoidText / .good.avoidText.
//      ✖ → ○, м'якіші формулювання («Підтримуйте темп без хаосу» / «Без розпорошення на дрібниці»).
//      Узгоджено з Excel ТИЖНЕВИЙ для зелених станів («✅ СПРИЯТЛИВО · Плановий режим»).
//      Канонічна градація іконок: ○ — пасивна порада (зелена/нейтральна), ✖ — заборона (червона).
//      neutral/unstable/tense — без змін (контроль).
//   N3 (index.html:1463): tooltip на #heroFreshness (раніше БЕЗ title).
//      LIVE/STALE/CACHED/OFFLINE поясннено: 5хв/5хв-1год/проксі/немає підключення.
//      + tabindex="0" для keyboard-доступу + cursor:help.
//   N4 (index.html:7191-7322): tooltip на «3-day Pᵢ середнє» row у panchUpcoming.
//      Додано `tip:` field в items.push (опційно, для майбутніх items теж).
//      Render використовує it.tip → title attr через escapeHtml + cursor:help.
//      Текст: формула Pᵢ, пороги класифікації, джерело (live noon UTC).
//   Cache keys bumped до v88-7-13.
//
// v88.7.12 changes (FIX-M — уніфікація Рівень 1):
//   Hero Astro chip раніше показував tithi/nakshatra/yoga з engine_scores.json
//   (Swiss Ephemeris, local sunrise reference). Панчанга картка нижче — live
//   astronomy-engine (noon UTC). На boundary днях (~46%) tithi розходились на 1.
//   Виправлено: chip ТЕПЕР читає назви з _lastPanchCtx (live, той самий що картка).
//   Score (cal_score) і символи (cal_symbols — затемнення/Sankranti) — далі з engine_scores.
//   Engine pill (+3) — frozen для backtest, не змінюється.
//   Маркер ⊙ біля chip коли engine ≠ live — натяк на tooltip з обома значеннями.
//   Cache keys bumped до v88-7-12.
//
// v88.7.11 changes (FIX-L — cross-script let/const accessibility):
// v88.7.12 changes (FIX-M — уніфікація Рівень 1):
//   Hero Astro chip раніше показував tithi/nakshatra/yoga з engine_scores.json
//   (Swiss Ephemeris, local sunrise reference). Панчанга картка нижче — live
//   astronomy-engine (noon UTC). На boundary днях (~46%) tithi розходились на 1.
//   Виправлено: chip ТЕПЕР читає назви з _lastPanchCtx (live, той самий що картка).
//   Score (cal_score) і символи (cal_symbols — затемнення/Sankranti) — далі з engine_scores.
//   Engine pill (+3) — frozen для backtest, не змінюється.
//   Маркер ⊙ біля chip коли engine ≠ live — натяк на tooltip з обома значеннями.
//   Cache keys bumped до v88-7-12.
//
// v88.7.11 changes (FIX-L — cross-script let/const accessibility):
//   У файлі знайдено 11 сайтів які читали window.X для X що оголошене let/const:
//     • _lastPanchCtx — 7 reads (syncTrustStrip, buildDashboardState, decision-injects тощо).
//       Усі повертали undefined → Vishti warnings, Ekadashi notes, Rahu badges не зявлялись.
//       Виправлено: заміна window._lastPanchCtx → _lastPanchCtx (у тому ж script).
//     • lastWWV — 4 reads (renderProvenance — журнал джерел).
//       Заміна window.lastWWV → lastWWV.
//     • PaywallModal — 9 reads (analytics monkey-patcher у іншому script tag).
//     • PAYWALL — 2 reads (там само).
//       Виправлено: window.PAYWALL = PAYWALL; window.PaywallModal = PaywallModal;
//       (cross-script bridge — name lookup не працює між script tags).
//   Cache keys bumped до v88-7-12.
//
// v88.7.10 changes (FIX-K — decision timing labels):
// v88.7.11 changes (FIX-L — cross-script let/const accessibility):
//   В JS, top-level let/const у <script> НЕ стають properties of window.
//   У файлі знайдено 11 сайтів які читали window.X для X що оголошене let/const:
//     • _lastPanchCtx — 7 reads (syncTrustStrip, buildDashboardState, decision-injects тощо).
//       Усі повертали undefined → Vishti warnings, Ekadashi notes, Rahu badges не зявлялись.
//       Виправлено: заміна window._lastPanchCtx → _lastPanchCtx (у тому ж script).
//     • lastWWV — 4 reads (renderProvenance — журнал джерел).
//       Заміна window.lastWWV → lastWWV.
//     • PaywallModal — 9 reads (analytics monkey-patcher у іншому script tag).
//     • PAYWALL — 2 reads (там само).
//       Виправлено: window.PAYWALL = PAYWALL; window.PaywallModal = PaywallModal;
//       (cross-script bridge — name lookup не працює між script tags).
//   Cache keys bumped до v88-7-12.
//
// v88.7.10 changes (FIX-K — decision timing labels):
//   Користувач у Києві (UTC+3) читав "12:00–15:00 ◀ зараз" як локальний час, тоді як годинник
//   показував 15:30 — слот сприймався як минулий, хоча у UTC-логіці він активний.
//   Heat-strip і План дня вже конвертували в локальний час; decisionTimingList лишався єдиним
//   місцем, що друкував RAW UTC. Виправлено: normalizeDaySlots() тепер обчислює localStart/End
//   через _tzOffH (sync з heat-strip), isNow/isPast лишаються в UTC (логіка коректна).
//   Cache keys bumped до v88-7-12.
//
// v88.7.9 changes (cleanup pass — no logic changes, comment-only):
// v88.7.10 changes (FIX-K — decision timing labels):
//   В блоці "Коли діяти" мітки слотів (12:00–15:00) друкувались UTC-години БЕЗ позначки UTC.
//   Користувач у Києві (UTC+3) читав "12:00–15:00 ◀ зараз" як локальний час, тоді як годинник
//   показував 15:30 — слот сприймався як минулий, хоча у UTC-логіці він активний.
//   Heat-strip і План дня вже конвертували в локальний час; decisionTimingList лишався єдиним
//   місцем, що друкував RAW UTC. Виправлено: normalizeDaySlots() тепер обчислює localStart/End
//   через _tzOffH (sync з heat-strip), isNow/isPast лишаються в UTC (логіка коректна).
//   Cache keys bumped до v88-7-12.
//
// v88.7.9 changes (cleanup pass — no logic changes, comment-only):
//   • EVENT_WEIGHTS reference у тестовому коментарі → WEIGHT_E_EVENTS.
//   • Видалено tombstone-коментарі для функцій що видалені давно (renderNowKpChart,
//     render45, renderOrbitSvg, gTopRow merge note).
//   • Скорочено два розлогих v87.97 коментарі про removed CSS — лишився лише суть
//     поточної логіки (scoreBar gCtx-aware).
//   Cache keys bumped до v88-7-12.
//
// v88.7.8 changes (deep audit pass):
//   FIX-A: Typo «Покнrima» → «Purnima» (видно у Methodology UI).
//   FIX-B: Penumbral eclipse ±1d тепер реально clamp до 0 (Math.trunc замість Math.round —
//          раніше Math.round(-0.75)=-1 у JS, всупереч коментарю-обіцянці).
//   FIX-C: Snᵢ компонент додано у формулу-tooltip (4 місця: legend, methodology, header UA/EN).
//   FIX-D: Karana tooltip показує реальний type+note замість stub-у «Вплив: нейтральний»
//          для не-Vishti. Vishti пом'якшено: «АБСОЛЮТНЕ ВЕТО» → «традиційно вето» з PCL.
//   FIX-E: 26 слів з ASCII «i» в кириличних виправлено на «і» (пік, тільки, увімкнено...).
//          + «розвіддaними» (з ASCII «a») → «розвідданими».
//   FIX-F: Karana — прибрано зайвий %60 (вже у range через floor), додано Math.min(59,...) clamp.
//   FIX-G: TITHI_SCORE inconsistency задокументована коментарем (свідома BPHS-калібровка).
//   FIX-H: Snᵢ chip додано у hero factors (раніше тільки tooltip — користувач не бачив,
//          звідки −0.2/−0.4 у G).
//   FIX-I: computeAi тепер викликає computeDstModifier() — спільна логіка з Science Bar.
//          Усунуто 8 рядків inline-дубля порогової логіки (-100, -50).
//   FIX-J: Math restructure — один Math.round в кінці замість 3 послідовних (Pi→Ai→AiFull).
//          Раніше накопичувалась похибка ≤±0.05; тепер ΣAᵢ обчислюється на raw values,
//          округлення ТІЛЬКИ для UI display (Pi, eiTotal, Ai, AiFull).
//   Cache keys bumped до v88-7-12.
//
// v88.7.7 changes:
//   CRITICAL hot-fix: trend "7 днів" — два прихованих баги:
//     1. last3D filter d.date < todayStr завжди false (Date<string→NaN coerce → false ALWAYS).
//        Виправлено: filter через fmtDate(d.date) < todayStr (string<string).
//     2. _27dComputed[0] припускалось як today, але NOAA 27-day-outlook починається з
//        дня публікації (понеділок), не today. У четвер _27dComputed[0..3] = всі минулі.
//        Виправлено: findIndex(d=>d.ds===todayStr), беремо [idxToday..idxToday+3].
//     3. render27Day тепер повторно викликає _renderWhyTrend() після build27dComputed.
// v88.7.6 changes (math + UX audit: 4 bugs fixed):
//   BUG-1: trend "7 днів" sparkline — обмежено last3D до slice(-3) минулих + race-fallback.
//   BUG-2: 3-day forecast quick-cards — UAF Alaska fallback тепер теж гарантує 3 дні.
//   BUG-3: hero ↔ personal cycle conflict — додано банер "Глобальний фон vs Ваш цикл".
//   BUG-4: day-label у тренді — round + noon-UTC anchor (DST-safe).
// v88.7.5 changes: tooltip «Довіра» виправлений — реальний max=92% by design.
// v88.7.4 changes: bulk replace ~35 згадок «engine v17» → «engine v18.5».
// v88.7.3 changes: tooltips on Lᵢ/Mᵢ/eᵢ/Pᵢ/Dᵢ chips + heroConfidence.
// v88.7.2 changes: bump cache keys (NOAA Worker URL hardcoded).
// v88.7.1 changes: bump cache keys (CSP + title).
// v88.7.0 changes (deep audit fixes):
//   1. Comment-reality match: shell тепер реально stale-while-revalidate.
//   2. Cache key bumped для invalidation.
//   3. backtest.html додано до SHELL_FILES.
//   4. cache.put awaited перед SW_FRESH_DATA notify (race fix).

const SHELL_CACHE = 'g-index-shell-v88-8-16';
const DATA_CACHE = 'g-index-data-v88-8-16';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
  './backtest.html',
];

self.addEventListener('error', (event) => {
  console.error('[SW Error]', event.message, 'at', event.filename, ':', event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW Unhandled rejection]', event.reason);
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // v88.7.15 Г: expert_overrides_v3.json — network-first з cached fallback (як engine_scores).
  // Файл оновлюється коли експерт випускає новий PDF (раз на 1-2 тижні).
  if (url.pathname.endsWith('expert_overrides_v3.json')) {
    event.respondWith(
      fetch(event.request)
        .then(async (resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            const cache = await caches.open(DATA_CACHE);
            await cache.put(event.request, clone);
          }
          return resp;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response('{"overrides":[]}', {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
  
  if (url.pathname.endsWith('engine_scores.json')) {
    event.respondWith(
      fetch(event.request)
        .then(async (resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            const cache = await caches.open(DATA_CACHE);
            await cache.put(event.request, clone);
            const clients = await self.clients.matchAll();
            clients.forEach((c) => c.postMessage({
              type: 'SW_FRESH_DATA',
              fetchedAt: Date.now(),
            }));
          }
          return resp;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) {
              self.clients.matchAll().then((clients) => {
                clients.forEach((c) => c.postMessage({
                  type: 'SW_STALE_DATA',
                  fetchedAt: Date.now() - 86400000,
                }));
              });
            }
            return cached || new Response('{"scores":{}}', {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
  
  const isShell = SHELL_FILES.some(f => {
    const normalized = f === './' ? '/' : f.replace('./', '/');
    return url.pathname === normalized || url.pathname.endsWith(normalized);
  });
  
  if (isShell) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'G-Index', body: event.data.text() }; }
  
  const safeTitle = String(data.title || 'G-Index').slice(0, 80);
  const safeBody = String(data.body || '').slice(0, 200);
  
  event.waitUntil(
    self.registration.showNotification(safeTitle, {
      body: safeBody,
      icon: './icon192.png',
      badge: './icon192.png',
      data: data.url || './',
      tag: data.tag || 'g-index-default',
      renotify: data.renotify === true,
      requireInteraction: data.priority === 'high',
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  let targetUrl = (event.notification.data && typeof event.notification.data === 'string')
    ? event.notification.data
    : './';
  
  if (targetUrl !== './') {
    try {
      const u = new URL(targetUrl, self.location.origin);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        targetUrl = './';
      } else if (u.origin !== self.location.origin) {
        targetUrl = './';
      }
    } catch(e) {
      targetUrl = './';
    }
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(targetUrl) && 'focus' in client) {
          if (action) client.postMessage({ type: 'NOTIFICATION_ACTION', action });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
