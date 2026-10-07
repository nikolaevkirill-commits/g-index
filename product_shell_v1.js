
(function(){
  'use strict';
  const userText=value=>'<span translate="no">'+escapeHtml(String(value??''))+'</span>';
  const ROUTES=['today','calendar','forecast','concept','panch','profile','more','categories','match','reports','plan','expert'];
  const ROUTE_NAV={today:'Today',plan:'More',forecast:'Forecast',calendar:'Calendar',concept:'More',panch:'Panch',profile:'More',more:'More',categories:'More',match:'More',reports:'More',expert:'More'};
  const CATS=[['sport','Спорт','Техніка, навантаження та відновлення'],['health','Здоров’я та енергія','Орієнтир для самоспостереження, не медична порада'],['business','Бізнес і кар’єра','Рішення, переговори та робочі вікна'],['love','Любов і відносини','Спілкування та спільні плани'],['money','Гроші та ресурси','Планування й перегляд, не фінансова порада']];
  function el(tag,cls,id){const n=document.createElement(tag);if(cls)n.className=cls;if(id)n.id=id;return n}
  function head(kicker,title,copy){return `<div class="nr-route-head"><div><div class="nr-eyebrow">${kicker}</div><h1>${title}</h1></div><p>${copy}</p></div>`}
  function route(shell,id,html){const n=el('section','nr-route','nrRoute-'+id);n.dataset.route=id;n.innerHTML=html;const heading=n.querySelector('h1,h2');if(heading){heading.id=heading.id||'nrRouteHeading-'+id;heading.setAttribute('tabindex','-1');n.setAttribute('aria-labelledby',heading.id)}n.setAttribute('aria-hidden','true');shell.appendChild(n);return n}
  function move(id,target){const n=document.getElementById(id);if(n&&target)n.parentNode!==target&&target.appendChild(n)}
  function buildShell(){
    if(document.getElementById('fp434Shell'))return;
    document.body.classList.add('fp434-app');
    const main=document.getElementById('mainContent');if(!main)return;
    const shell=el('div','', 'fp434Shell');main.insertBefore(shell,main.firstChild);
    const top=el('nav','nr-topnav','nrTopNav');top.setAttribute('aria-label','Основні розділи застосунку');top.innerHTML=`<button data-route="today" onclick="fp434Go('today',true)">Небо сьогодні</button><button data-route="concept" onclick="fp434Go('concept',true)">☉ Концепція</button><button data-route="panch" onclick="fp434Go('panch',true)">Панчанга</button><button data-route="forecast" onclick="fp434Go('forecast',true)">Прогноз</button><button data-route="calendar" onclick="fp434Go('calendar',true)">Календар</button><button data-route="more" onclick="fp434Go('more',true)">Ще</button>`;shell.appendChild(top);const announcer=el('div','nr-sr-only','fp434RouteAnnouncer');announcer.setAttribute('role','status');announcer.setAttribute('aria-live','polite');announcer.setAttribute('aria-atomic','true');shell.appendChild(announcer);
    const calendar=route(shell,'calendar',head('КАЛЕНДАР','Ритм найближчих днів','Спочатку сім днів одним рядом; нижче — доступний 27-денний контекст. Відсутні точки позначаються прямо, без домислів.')+`<div class="nr-seven-head"><strong>Найближчі 7 днів</strong><span>натисніть день для пояснення</span></div><div class="nr-calendar-week" id="nrCalendarWeek"><div class="nr-chart-empty">Завантаження…</div></div><div class="nr-calendar-detail nr-card" id="nrCalendarDetail"><span class="nr-chip">ОБЕРІТЬ ДЕНЬ</span><h3>Деталі з’являться тут</h3><p>Календар використовує той самий канонічний ряд G, що й прогноз.</p></div><button class="nr-btn secondary" style="margin:0 0 12px" onclick="fp434Go('forecast',true)">Відкрити три графіки: 3 · 7 · 27</button><div class="nr-calendar-month" id="nrCalendarMonth"></div>`);
    const today=route(shell,'today',`<section class="nr-cover" id="nrCover" data-advisory="none"><div class="nr-cover-meta"><span id="nrCoverDate">СЬОГОДНІ</span><span class="nr-cover-live" id="nrCoverFresh">ДАНІ ЗАВАНТАЖУЮТЬСЯ</span></div><div class="nr-cover-main"><div class="nr-cover-copy"><div class="nr-cover-kicker" id="nrCoverKicker">ADVISORY СЬОГОДНІ</div><h2 class="nr-cover-title" id="nrCoverTitle">Плануй дію, перевірку або паузу</h2><p class="nr-cover-summary" id="nrCoverSummary">Завантажую canonical resolver…</p><div class="nr-cover-chips"><span class="nr-cover-chip">ADVISORY РІШЕННЯ <strong id="nrCoverDecisionScore">—</strong></span><span class="nr-cover-chip">LIVE-ФОН G <strong id="nrCoverLiveG">—</strong> · Kp <strong id="nrCoverKp">—</strong> · зміна <strong id="nrCoverShift">—</strong></span></div></div><div class="nr-score-orbit" id="nrScoreOrbit"><div class="nr-score-inner"><div class="nr-score-number" id="nrCoverScore">—</div><div class="nr-score-label">ADVISORY СТАН</div><div class="nr-score-helper" id="nrScoreHelper">Canonical resolver ще обчислюється</div></div></div></div><div class="nr-cover-actions"><div class="nr-cover-action"><b>Пояснення</b><span id="nrCoverDo">Завантаження…</span></div><div class="nr-cover-action avoid"><b>Межі оцінки</b><span id="nrCoverAvoid">Завантаження…</span></div></div><div class="nr-day-context" id="nrEclipseContext"><div class="nr-day-context-icon">◐</div><div><b id="nrEclipseTitle">ПЕРІОД ВПЛИВУ ЗАТЕМНЕННЯ</b><span id="nrEclipseCopy">Контекст дня завантажується…</span></div></div><details class="nr-authority-details"><summary>Чому такий advisory-стан?</summary><div class="nr-authority-balance" id="nrAuthorityBalance"><span>Перевіряю canonical resolver та довідкові шари…</span></div></details><div class="nr-cover-horizons" aria-label="Горизонти прогнозу"><button class="nr-cover-horizon" onclick="fp434Go('forecast',true)"><b>3 дні</b><span id="nrCover3">Обчислюється</span></button><button class="nr-cover-horizon" onclick="fp434Go('forecast',true)"><b>7 днів</b><span id="nrCover7">Обчислюється</span></button><button class="nr-cover-horizon" onclick="fp434Go('forecast',true)"><b>27 днів</b><span id="nrCover27">Обчислюється</span></button></div><div class="nr-today-primary"><button class="nr-btn" onclick="fp434Go('plan',true)">Скласти план</button><button class="nr-btn secondary" onclick="fp434Go('forecast',true)">План 3 / 7 / 27</button></div></section><details class="nr-today-details"><summary>Технічні деталі · джерела та часові вікна</summary><div id="nrTodayLive"></div></details>`);
    const forecast=route(shell,'forecast',head('ПРОГНОЗ','План на 3, 7 і 27 днів','Одна шкала для трьох горизонтів: спочатку порада, нижче — графік і пояснення джерел.')+`<div class="nr-forecast-intro"><div class="nr-balance-card"><span class="nr-chip">НАЙБЛИЖЧІ 7 ДНІВ</span><div class="nr-balance-score" id="nrBalanceScore">Рішення обчислюються</div><div class="nr-summary-counts" aria-label="Розподіл порад на 7 днів"><div class="nr-summary-count act"><b id="nrCountAct">—</b><span>діяти</span></div><div class="nr-summary-count check"><b id="nrCountCheck">—</b><span>перевірити</span></div><div class="nr-summary-count hold"><b id="nrCountHold">—</b><span>відкласти</span></div><div class="nr-summary-count none"><b id="nrCountNone">—</b><span>без рішення</span></div></div><div class="nr-next-change" id="nrNextChange">Найближча зміна: перевіряється</div><div class="nr-balance-copy" id="nrBalanceCopy">Підсумок формується лише з канонічних рішень дня.</div></div><div class="nr-card"><span class="nr-chip">ЯК ЧИТАТИ</span><h3>Порада зверху, джерела окремо</h3><p>Великі зелені, жовті й червоні точки — канонічна порада дня. Золотий ромб — звірене рішення з PDF. Бірюзовий пунктир — поточний фон G. Сірий контур — резервний сценарій.</p></div></div><div class="nr-forecast-tabs" role="tablist" aria-label="Оберіть горизонт"><button id="nrTab3" type="button" role="tab" tabindex="0" aria-selected="true" aria-controls="nrHorizon3" onclick="fp453SetHorizon(3,this)">3 дні</button><button id="nrTab7" type="button" role="tab" tabindex="-1" aria-selected="false" aria-controls="nrHorizon7" onclick="fp453SetHorizon(7,this)">7 днів</button><button id="nrTab27" type="button" role="tab" tabindex="-1" aria-selected="false" aria-controls="nrHorizon27" onclick="fp453SetHorizon(27,this)">27 днів</button></div><div class="nr-forecast-legend"><span class="action"><i></i>порада дня: діяти / перевірити / відкласти</span><span class="pdf"><i></i>звірене рішення з PDF</span><span class="context"><i></i>поточний фон G</span><span class="scenario"><i></i>резервний сценарій · не команда</span></div><div class="nr-horizon-stack"><article class="nr-horizon" id="nrHorizon3" data-horizon="3" data-active="true" role="tabpanel" aria-labelledby="nrTab3"><div class="nr-horizon-head"><div><h3>3 дні</h3><p>Короткий план із порадою на кожен день і видимими довідковими шарами</p></div><span class="nr-horizon-status" id="nrStatus3">перевірка</span></div><div id="nrChart3" class="nr-chart-empty">Завантаження…</div></article><article class="nr-horizon" id="nrHorizon7" data-horizon="7" data-active="false" role="tabpanel" aria-labelledby="nrTab7"><div class="nr-horizon-head"><div><h3>7 днів</h3><p>Тижневий ритм: дія, перевірка або відкладення без підміни рішення з PDF</p></div><span class="nr-horizon-status" id="nrStatus7">перевірка</span></div><div id="nrChart7" class="nr-chart-empty">Завантаження…</div></article><article class="nr-horizon" id="nrHorizon27" data-horizon="27" data-active="false" role="tabpanel" aria-labelledby="nrTab27"><div class="nr-horizon-head"><div><h3>27 днів</h3><p>Довгий огляд із чіткою межею даних; він не має більшої прогнозної точності</p></div><span class="nr-horizon-status" id="nrStatus27">контекст</span></div><div id="nrChart27" class="nr-chart-empty">Завантаження…</div></article></div><div class="nr-forecast-proof" aria-label="Межі довіри"><span id="nrPdfCoverage">Довідкове джерело звірено: —</span><span id="nrPredictiveBoundary"><strong>Прогнозну точність:</strong> ще не підтверджено</span><span id="nrContextBoundary">Фонові та сценарні дані: контекст, не команда</span></div><div class="nr-today-primary" style="margin-top:14px"><button class="nr-btn" onclick="fp434Go('plan',true)">Скласти план</button></div><details class="nr-card" style="margin-top:14px"><summary>Чому така порада? Дані та походження</summary><div id="nrDataTruthGate" style="margin-top:14px"><div id="nrDataTruthBody"><p>Перевіряю походження, свіжість і статус системи…</p></div></div><div id="nrForecastLive" style="margin-top:14px"></div></details>`);
    route(shell,'concept',head('НЕБОРИТМ','Як читати оцінку дня','Одна оцінка за формулою джерела, її складові та календарні теми.')+`<div class="nr-card"><h2>Що обчислюється</h2><p>Сума = (2 − прогноз добового максимуму Kp) + місячна складова Moon + складова затемнення Eclipse + сума ваг календарних позначок. Після округлення результат обмежується шкалою −3…+3.</p><p>Це авторська формула. Її точність щодо реальних подій ще не підтверджена. Однаковий бал може відповідати різним наборам складових; дивіться причини та застереження джерела.</p><h2>Джерела й горизонт</h2><p>Короткий прогноз використовує повні тригодинні слоти NOAA для доби Europe/Kyiv. Далекий орієнтир — 27-денний прогноз за добу UTC; це інший тип входу, позначений окремо.</p><h2>Календар і дослідження</h2><p>Панчанга й планетарний контекст показані окремо. Pᵢ і Dᵢ зі старої формули Hero G не входять у показану оцінку. Експертний PDF — джерело для порівняння; Engine — модель відтворення експерта; Tanita — дослідницький канал. Їхній збіг не доводить точності щодо подій.</p><h2>Як перевіряється прогноз</h2><p>Прогноз формули фіксується до початку наступної доби за окремим протоколом v2. Після дня потрібні незалежні оцінки A–D: стан або настрій, продуктивність, фізичний стан і зовнішні події. Особистий план і локальний щоденник не замінюють цю перевірку.</p></div>`);
    const panch=route(shell,'panch',head('SIDEREAL · LAHIRI','Панчанга на сьогодні','Календар дня від півночі до півночі за місцевим часом: що діє зараз, коли й на що змінюється.')+`<div class="nr-panch-dashboard" id="nrPanchGuide"><div id="nrPanchNow"><div class="nr-panch-summary"><span class="nr-chip">ПАНЧАНГА ДНЯ</span><h3>Завантаження календаря…</h3></div></div><section class="nr-panch-section"><span class="nr-chip">ЯК ЧИТАТИ</span><h3>П’ять частин одного календарного шару</h3><div class="nr-panch-practice"><div><b>Tithi · місячний ритм</b><span>Фаза календарного циклу та його загальний темп.</span></div><div><b>Vara · день тижня</b><span>Традиційний управитель сонячної доби.</span></div><div><b>Nakshatra · характер дії</b><span>Ділянка сидеричного шляху Місяця.</span></div><div><b>Yoga · фон взаємодії</b><span>Комбінація довгот Сонця й Місяця.</span></div><div><b>Karana · короткий ритм</b><span>Половина Tithi, тому протягом дня змінюється частіше.</span></div></div></section><p class="nr-panch-boundary">Це традиційний календарний контекст для осмисленого планування, а не гарантія події чи причинно доведений прогноз. Ця панель показує календарний контекст. Композит Pᵢ зі старої Hero G не входить у показану оцінку source_formula; додаткового бала з цієї панелі немає.</p><div class="nr-panch-actions"><button class="nr-btn" type="button" onclick="fp434Go('today',true)">Повернутися до рішення дня</button><button class="nr-btn secondary" type="button" onclick="document.querySelector('#nrPanchLive details')?.setAttribute('open','')">Відкрити астрономічні деталі</button></div></div><div id="nrPanchLive"></div>`);
    const profile=route(shell,'profile',head('ЛОКАЛЬНИЙ ПРОФІЛЬ','Дані на цьому пристрої','Поля нижче не змінюють канонічне рішення дня. Біля кожного поля прямо вказано його поточне використання.')+`<form class="nr-card" id="nrProfileForm" onsubmit="return fp440SaveProfile(event)"><h3>Мої локальні дані</h3><p>Зберігаються лише у браузері. Персональна модель ще не валідована. Дані народження більше не збираються; раніше збережені значення залишаються у вашій локальній копії до очищення даних.</p><div class="nr-form-grid"><label class="nr-field">Ім’я<small>Показується у локальному профілі та спільному плануванні.</small><input name="name" maxlength="40" autocomplete="name"></label><label class="nr-field">Місто<small>Збережене для майбутнього локального контексту; зараз не змінює рішення дня.</small><input name="city" maxlength="60" autocomplete="address-level2" value="Київ"></label><label class="nr-field">Режим пояснення<small>Локальна перевага відображення; не змінює рішення.</small><select name="mode"><option value="simple">Простий</option><option value="advanced">Докладний</option></select></label></div><button class="nr-btn secondary" style="margin-top:14px" type="submit">Зберегти локально</button><div id="nrProfileStatus" role="status" style="margin-top:10px;color:var(--nr-gold2);font-size:11px"></div></form><div id="nrProfileLive" style="margin-top:14px"></div>`);
    route(shell,'more',head('MORE','Усі інструменти','Глибокі категорії, спільний timing, форми планування, звіти та окремий старий dashboard.')+`<div class="nr-grid" id="fp434MoreGrid">
      <button class="nr-card" onclick="fp434Go('concept',true)"><span class="nr-chip">☉ КОНЦЕПЦІЯ</span><h3>Сонце, зорі та духовний ритм</h3><p>Сенс системи й чесна межа між прогнозами та пояснювальними впливами.</p></button>
      <button class="nr-card" aria-label="Локальний профіль" onclick="fp434Go('profile',true)"><span class="nr-chip">ЛОКАЛЬНІ ДАНІ</span><h3>Локальний профіль</h3><p>Приватні поля й пояснення їх фактичного використання; рішення дня не змінюється.</p></button>
      <button class="nr-card" onclick="fp434Go('panch',true)"><span class="nr-chip">КАЛЕНДАРНИЙ ШАР</span><h3>Панчанга</h3><p>П’ять компонентів часу простими словами; технічні деталі окремо.</p></button>
      <button class="nr-card" onclick="fp434Go('categories',true)"><span class="nr-chip">КЛЮЧ ДНЯ</span><h3>Категорії дня</h3><p>Календарні позначки за сферою та власні нотатки; окремих балів немає.</p></button>
      <button class="nr-card" onclick="fp434Go('match',true)"><span class="nr-chip">ПЛАНУВАННЯ</span><h3>Спільне планування</h3><p>Базовий контур дня для двох; персональний перетин ще не обчислюється.</p></button>
      <button class="nr-card" onclick="fp434Go('reports',true)"><span class="nr-chip">REPORTS</span><h3>Звіти й планування</h3><p>Денний звіт, календар і довші горизонти.</p></button>
      <button class="nr-card" onclick="fp434Go('plan',true)"><span class="nr-chip">PLAN</span><h3>Мій план дня</h3><p>Запишіть пріоритет, за бажанням — контакт і час.</p></button>
      <button class="nr-card" onclick="fp434Go('expert',true)"><span class="nr-chip">LEGACY</span><h3>Старий dashboard</h3><p>Усі Kp/Dst/Bz, формула, джерела, provenance та model QA без скорочень.</p></button></div>`);
    route(shell,'categories',head('КЛЮЧ ДНЯ','Обери одну сферу сьогодні','Категорія показує відповідні календарні позначки та місце для власного плану. Окремих прогнозів успіху для цих сфер немає.')+'<div class="nr-grid" id="nrCategoryGrid"></div><div class="nr-card" id="nrCategoryDetail" hidden></div>');
    route(shell,'match',head('СПІЛЬНЕ ПЛАНУВАННЯ','Базовий контур дня для двох','Показує спільний канонічний контур дня. Персональний перетин за датою, часом чи містом ще не обчислюється.')+`<form class="nr-card" id="nrMatchForm" onsubmit="return fp435SaveMatch(event)"><h3>З ким плануєте</h3><p>Потрібне лише ім’я для локального підпису. Дані народження не збираються, бо валідованої моделі персонального перетину немає.</p><div class="nr-form-grid"><label class="nr-field">Ім’я другої людини<small>Використовується лише у назві локального плану.</small><input name="name" maxlength="40" autocomplete="off" required></label></div><button class="nr-btn" style="margin-top:14px" type="submit">Показати базовий контур дня</button><div id="nrMatchStatus" role="status" style="margin-top:10px;color:var(--nr-gold2);font-size:11px"></div></form>`);
    route(shell,'reports',head('ЗВІТИ','Перетвори висновок на план','Звіти використовують ті самі канонічні дані й не створюють паралельний прогноз.')+`<div class="nr-grid"><div class="nr-card"><span class="nr-chip">ДОСТУПНО</span><h3>Денний звіт</h3><p>Висновок, причина, дія, обмеження та Kp-контекст.</p><button class="nr-btn secondary" style="margin-top:14px" onclick="window.print()">Друкувати / PDF</button></div><div class="nr-card nr-locked"><span class="nr-chip">ДОСЛІДЖЕННЯ</span><h3>30/90-денний план</h3><p>Гіпотеза календаря довшого горизонту; це не доступний продукт і не розширення 7-денних порад на дію.</p><button class="nr-btn" style="margin-top:14px" onclick="PaywallModal.show('30/90-денний план','research')">Що досліджується</button></div></div>`);
    route(shell,'plan',head('ПЛАН І ЩОДЕННИК','Мій план і підсумок','Збережіть конкретний крок, за бажанням увімкніть локальне нагадування, а ввечері позначте фактичний результат.')+`<div class="nr-quick-links"><button class="nr-btn secondary" type="button" onclick="NRConsumerOverview.openOutcome()">Записати підсумок дня</button></div><form class="nr-card" id="nrPlanForm" onsubmit="return fp435SavePlan(event)"><div class="nr-form-grid"><label class="nr-field">Головний пріоритет<input name="priority" maxlength="100" required></label></div><details id="nrPlanExtras"><summary>Додаткові поля плану</summary><div class="nr-form-grid"><label class="nr-field">Важливий контакт<input name="contact" maxlength="80"></label><label class="nr-field">Час за Києвом (Europe/Kyiv)<input name="time" type="time"></label><label class="nr-field">Сфера<select name="category"><option value="general">Загальне</option><option value="business">Бізнес</option><option value="health">Здоров’я та енергія</option><option value="sport">Спорт</option><option value="money">Гроші</option></select></label><label class="nr-field" style="grid-column:1/-1">Нотатка<textarea name="note" maxlength="300"></textarea></label></div></details><button class="nr-btn" type="submit">Зберегти план</button><button class="nr-btn secondary" type="button" onclick="fp466EnableReminder()">Таймер відкритої сторінки</button><button class="nr-btn secondary" type="button" onclick="NRPlanCalendar.download()">Додати в календар (.ics)</button><p class="nr-result-meta">Таймер працює лише поки сторінка відкрита й активна. Для нагадування після закриття імпортуйте файл .ics у свій календар і перевірте його дозвіл на сповіщення.</p><div id="nrPlanStatus" role="status" style="margin-top:10px;color:var(--nr-gold2);font-size:11px"></div><div id="nrReminderStatus" role="status" class="nr-result-meta"></div></form><form class="nr-card" id="nrOutcomeForm" style="margin-top:14px" onsubmit="return fp466SaveOutcome(event)"><span class="nr-chip">ФАКТ ПІСЛЯ ДІЇ</span><h3>Чим завершився план?</h3><p>Це ваш локальний щоденник. Відповідь не змінює модель і не вважається незалежною валідацією.</p><div class="nr-form-grid"><label class="nr-field">Результат<select name="result" required><option value="">Оберіть</option><option value="done">Виконано</option><option value="partial">Частково</option><option value="not_done">Не виконано</option></select></label><label class="nr-field">Короткий коментар<input name="note" maxlength="160"></label></div><button class="nr-btn" type="submit">Зберегти результат</button><div id="nrOutcomeStatus" role="status" class="nr-result-meta"></div></form><section class="nr-card" id="nrOutcomeHistory" style="margin-top:14px"><span class="nr-chip">ІСТОРІЯ</span><h3>Останні результати</h3><p>Записів ще немає.</p></section>`);
    const expert=route(shell,'expert',head('ТЕХНІЧНИЙ АРХІВ','Старий dashboard — окремо','Повний технічний дашборд з усіма джерелами, формулою, графіками та аудитами збережений без скорочень.')+'<div id="nrExpertLive"></div>');
    if(window.GINDEX_PLAY_CHANNEL){expert.hidden=true;expert.inert=true;document.querySelectorAll('[onclick]').forEach(n=>{if(n.getAttribute('onclick').includes("fp434Go('expert'"))n.remove();});}
    const scoreHelper=today.querySelector('#nrScoreHelper'),coverCopy=today.querySelector('.nr-cover-copy');if(scoreHelper&&coverCopy)coverCopy.appendChild(scoreHelper);
    const independent=el('section','nr-independent-panel','nrIndependentForecasts');independent.setAttribute('aria-label','Незалежні прогнозні канали');independent.innerHTML=`<span class="nr-chip">НЕЗАЛЕЖНІ КАНАЛИ · НЕ ГОЛОСУВАННЯ · PROSPECTIVE</span><h3>Кожен прогноз окремо</h3><p>Наш розрахунок використовує перевірені календарні фактори та прогноз добового максимуму Kp NOAA. PDF показаний окремо для звірки; старий Engine — архівна модель. Пропуски не замінюються Kp=2. Точність нового розрахунку щодо подій ще не підтверджена.</p><div class="nr-independent-grid" id="nrIndependentGrid"><div class="nr-chart-empty">Завантаження каналів…</div></div><div class="nr-independent-boundary" id="nrProspectiveBoundary">Gate 0/100 · BLOCKED. Порівняння, router та ансамбль не активні.</div>`;const technical=forecast.querySelector('details.nr-card');forecast.insertBefore(independent,technical||null);if(technical){const proof=forecast.querySelector('.nr-forecast-proof');if(proof)technical.appendChild(proof)}
    const sourceToday=el('section','nr-card','nrOwnForecastToday');sourceToday.setAttribute('aria-live','polite');sourceToday.textContent='Наш розрахунок: завантаження даних…';today.insertBefore(sourceToday,today.firstChild);
    const cosmic=el('section','nr-cosmic-concept','nrCosmicConcept');cosmic.setAttribute('aria-label','Небо, Панчанга і духовний сенс сьогодні');cosmic.innerHTML=`<div class="nr-cosmic-head"><div><span class="nr-chip">НЕБО СЬОГОДНІ</span><h3>Космічний і духовний ритм дня</h3><p>Сонце, Місяць, зоряний шлях і Панчанга — видимий сенсовий шар. Технічні показники не підміняють його.</p></div><div class="nr-sky-mark" aria-hidden="true">☉ ☽ ✦</div></div><div class="nr-cosmic-grid"><div class="nr-cosmic-tile"><b>☉ Сонце й день</b><span class="nr-cosmic-value" id="nrSkySun">Завантаження…</span><span class="nr-cosmic-note" id="nrSkySunNote">Vara та сонячно-місячний резонанс</span></div><div class="nr-cosmic-tile"><b>☽ Місяць і зорі</b><span class="nr-cosmic-value" id="nrSkyMoon">Завантаження…</span><span class="nr-cosmic-note" id="nrSkyMoonNote">Фаза, Tithi та Nakshatra</span></div><div class="nr-cosmic-tile"><b>✦ Активні впливи</b><span class="nr-cosmic-value" id="nrSkyInfluence">Завантаження…</span><span class="nr-cosmic-note" id="nrSkyInfluenceNote">Затемнення і космічна погода показані окремо</span></div></div><div class="nr-spirit-meaning"><b>Духовний сенс дня</b><p id="nrSkyMeaning">Завантажую традиційний календарний контекст…</p></div><div class="nr-cosmic-actions"><button class="nr-btn" type="button" onclick="fp434Go('panch',true)">Відкрити повну Панчангу</button><button class="nr-btn secondary" type="button" onclick="fp434Go('plan',true)">Перетворити сенс на план</button></div>`;today.querySelector('.nr-cover-actions')?.insertAdjacentElement('afterend',cosmic);
    const t=document.getElementById('nrTodayLive'),c=document.getElementById('nrForecastLive'),p=document.getElementById('nrPanchLive'),pr=document.getElementById('nrProfileLive'),ex=document.getElementById('nrExpertLive');
    function containAdvanced(node,label){if(!node||!node.parentNode)return;const wrap=document.createElement('details');wrap.className='nr-advanced';wrap.innerHTML=`<summary>${label}</summary><div></div>`;node.parentNode.insertBefore(wrap,node);wrap.querySelector('div').appendChild(node)}
    containAdvanced(p,'Докладна Панчанга · таблиці, переходи та астрономічні деталі');
    if(pr){pr.hidden=true;pr.inert=true;} // Retain historical DOM/data without collecting unused birth fields.
    ['heroCard','intraDayAlert','singleFinalDecision','kpHourlyPanel','daySentenceCard','decisionStrip','decisionTiming','impactBlock','wf3SignalSummary'].forEach(id=>move(id,t));
    ['scenarioCard','threeCard','twentysevenCard'].forEach(id=>move(id,c));
    const seven=document.getElementById('scenarioCard');if(seven)seven.open=false;
    ['panchCard','astroGrid','antiActionCard'].forEach(id=>move(id,p));
    ['personalCard','profileBar','profileRec','ppProfileBlock'].forEach(id=>move(id,pr));
    [...main.children].filter(n=>n!==shell).forEach(n=>ex.appendChild(n));
    renderCategories();
    localizeNewShellCopy();
    loadFp440Profile();
    renderPanchGuide();
    renderCosmicConcept();
    requestProductRender('independent');
    renderDataTruthGate();
    if(typeof loadExpertDecisionRegistry==='function')Promise.resolve(loadExpertDecisionRegistry()).then(()=>requestProductRender('cover','forecast','calendar')).catch(error=>{globalThis.NRDiagnostics?.record('promise.catch.11','recoverable');return (console.warn('[fp449 early registry]',error));});
    setTimeout(()=>requestProductRender('cover'),420);
    setTimeout(renderCosmicConcept,520);
    setTimeout(()=>requestProductRender('independent'),560);
    setTimeout(()=>requestProductRender('cover'),1800);
    setTimeout(renderCosmicConcept,1900);
    setTimeout(()=>requestProductRender('cover'),5200);
    setTimeout(()=>requestProductRender('forecast'),500);
    setTimeout(()=>requestProductRender('calendar'),650);
    setTimeout(enhanceFunctionalRoutes,900);
  }
  function todayKey(){try{return typeof todayKyivStr==='function'?todayKyivStr():new Date().toISOString().slice(0,10)}catch(_e){ globalThis.NRDiagnostics?.record('catch.283','recoverable'); return new Date().toISOString().slice(0,10)}}
  function cleanRegistryHeadline(value){return String(value||'').replace(/Нейтральни\s+й/giu,'Нейтральний').replace(/несприятл\s+ивий/giu,'несприятливий').replace(/несприятливи\s+й/giu,'несприятливий').replace(/прибиран\s+ня/giu,'прибирання').replace(/\s+Дані можуть(?:\s+бути)?\s*$/iu,'').replace(/\s+/g,' ').trim()}
  function localizeNewShellCopy(){
    const f=document.querySelector('#nrRoute-forecast .nr-route-head');if(f){const e=f.querySelector('.nr-eyebrow'),p=f.querySelector('p');if(e)e.textContent='ПРОГНОЗ';if(p)p.textContent='Одна шкала для трьох горизонтів: спочатку порада, нижче — графік і пояснення джерел.'}
    const map={'DAILY KEY':'КЛЮЧ ДНЯ','LOCKED':'ЗАКРИТО','MORE':'ЩЕ','REPORTS':'ЗВІТИ','PLAN':'ПЛАН','REFLECTION':'РЕФЛЕКСІЯ','LEGACY':'АРХІВ','UNVERIFIED':'НЕПЕРЕВІРЕНО'};document.querySelectorAll('#fp434Shell .nr-chip,#fp434Shell .nr-eyebrow').forEach(n=>{const k=n.textContent.trim();if(map[k])n.textContent=map[k]});
    const copyMap={'Спільний timing':'Спільний ритм','Одна сфера глибоко у Free; повний день — Premium.':'Одна сфера відкривається на день; ризики в інших сферах не приховуються.','Перетин сприятливих вікон двох людей, не доказ сумісності.':'Перетин зручних часових вікон двох людей, а не доказ сумісності.','Глибокі категорії, спільний timing, форми планування, звіти та окремий старий dashboard.':'Категорії, спільний ритм, форми планування, звіти та окремий технічний dashboard.','Усі Kp/Dst/Bz, формула, джерела, provenance та model QA без скорочень.':'Усі Kp/Dst/Bz, формула, джерела, походження даних і перевірки моделі без скорочень.'};document.querySelectorAll('#fp434Shell h3,#fp434Shell p').forEach(n=>{const k=n.textContent.trim();if(copyMap[k])n.textContent=copyMap[k]});
    const planIntro=document.querySelector('#nrRoute-plan .nr-route-head p');if(planIntro)planIntro.textContent='Один пріоритет, один контакт і часовий намір. Запис зберігається лише на цьому пристрої та не створює нового прогнозу.';
    const panchCopy=document.querySelector('#nrPanchGuide > .nr-panch-boundary');if(panchCopy)panchCopy.textContent='Це традиційний календарний контекст для осмисленого планування, а не гарантія події чи причинно доведений прогноз. Ця панель показує календарний контекст. Композит Pᵢ зі старої Hero G не входить у показану оцінку source_formula; додаткового бала з цієї панелі немає.';
    const matchForm=document.getElementById('nrMatchForm');if(matchForm&&!document.getElementById('nrMatchProfileLink')){const link=document.createElement('button');link.id='nrMatchProfileLink';link.type='button';link.className='nr-btn secondary';link.style.margin='10px 0 0';link.textContent='Перейти до локального профілю';link.addEventListener('click',()=>fp434Go('profile',true));matchForm.appendChild(link)}
    const footer=document.querySelector('footer');if(footer&&!document.getElementById('nrFooterDetails')){const details=document.createElement('details');details.id='nrFooterDetails';details.className='nr-authority-details';const summary=document.createElement('summary');summary.textContent='Джерела та методика';const body=document.createElement('div');body.className='nr-authority-balance';while(footer.firstChild)body.appendChild(footer.firstChild);details.append(summary,body);footer.appendChild(details)}
  }
  function ensureResult(formId,resultId){const form=document.getElementById(formId);if(!form)return null;let box=document.getElementById(resultId);if(!box){box=document.createElement('section');box.id=resultId;box.className='nr-functional-result';form.insertAdjacentElement('afterend',box)}return box}
  function renderProfileResult(){const box=ensureResult('nrProfileForm','nrProfileResult');if(!box)return;let data=null;try{data=JSON.parse(localStorage.getItem('gindex_profile_v2')||'null')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.246','recoverable'); }const saved=data?['name','city','mode'].filter(k=>String(data[k]||'').trim()).length:0;box.innerHTML=`<span class="nr-chip">ЛОКАЛЬНИЙ СТАН</span><h3>${saved?`${saved} полів збережено`:'Профіль ще не збережено'}</h3><p class="nr-result-primary">Ім’я використовується для локального підпису. Місто не змінює оцінку; старі дані народження збережені лише у локальній копії. Ці поля не змінюють рішення у «Сьогодні», «Прогнозі» або «Календарі».</p><div class="nr-result-meta">Зберігання: лише цей пристрій · серверне надсилання: ні · валідована персональна модель: ні.</div>`}
  function renderPlanResult(){const box=ensureResult('nrPlanForm','nrPlanResult');if(!box)return;const form=document.getElementById('nrPlanForm');let guard=document.getElementById('nrPlanGuard');if(form&&!guard){guard=document.createElement('details');guard.id='nrPlanGuard';guard.className='nr-functional-result';form.insertAdjacentElement('beforebegin',guard)}if(guard){const title=document.getElementById('nrCoverTitle')?.textContent?.trim()||'Рішення дня завантажується',avoid=document.getElementById('nrCoverAvoid')?.textContent?.trim()||'Не форсуйте неперевірені рішення.';guard.innerHTML=`<summary>Оцінка календарної моделі</summary><span class="nr-chip">КАЛЕНДАРНИЙ КОНТЕКСТ</span><h3>${escapeHtml(title)}</h3><p class="nr-result-primary">${escapeHtml(avoid)}</p><div class="nr-result-meta">План допомагає діяти в межах канонічного висновку дня і не створює нового прогнозу.</div>`}let d=null;try{d=JSON.parse(localStorage.getItem('gindex_day_plan_v1')||'null')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.247','recoverable'); }if(!d||d.date!==todayKey()){box.innerHTML='<span class="nr-chip">ПЛАН НА СЬОГОДНІ</span><h3>План ще не збережено</h3><p class="nr-result-primary">Достатньо одного пріоритету. Час та інші поля — за бажанням.</p>';return}box.innerHTML=`<span class="nr-chip">ЗБЕРЕЖЕНО ЛОКАЛЬНО</span><h3>${(d.priority?userText(d.priority):'Без назви')}</h3><p class="nr-result-primary">${d.time?'Час за Києвом: <strong>'+escapeHtml(d.time)+'</strong>. ':''}${d.contact?'Контакт: '+userText(d.contact)+'. ':''}${d.note?userText(d.note):''}</p><div class="nr-result-meta">Дата плану: ${escapeHtml(d.date)} · це запис користувача, не прогноз.</div>`}
  function renderMatchResult(){const box=ensureResult('nrMatchForm','nrMatchResult');if(!box)return;let a=null,b=null;try{a=JSON.parse(localStorage.getItem('gindex_profile_v2')||'null');b=JSON.parse(localStorage.getItem('gindex_match_person_v1')||'null')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.248','recoverable'); }if(!b?.name){box.innerHTML='<span class="nr-chip">БАЗОВИЙ КОНТУР</span><h3>Вкажіть ім’я другої людини</h3><p class="nr-result-primary">Дата, час і місто не потрібні: персональний перетин ще не обчислюється.</p>';return}const title=document.getElementById('nrCoverTitle')?.textContent?.trim()||'Рішення дня завантажується',summary=document.getElementById('nrCoverSummary')?.textContent?.trim()||'Базовий контур дня ще завантажується.',doTxt=document.getElementById('nrCoverDo')?.textContent?.trim()||'',avoid=document.getElementById('nrCoverAvoid')?.textContent?.trim()||'';box.dataset.authoritySource='today-cover';box.innerHTML=`<span class="nr-chip">СПІЛЬНЕ ПЛАНУВАННЯ</span><h3>${(a?.name?userText(a.name):'Ви')} + ${userText(b.name)}</h3><p class="nr-result-primary"><strong>${escapeHtml(title)}</strong><br>${escapeHtml(summary)}</p><div class="nr-list"><div class="nr-row"><span>Пояснення</span><span>${escapeHtml(doTxt)}</span></div><div class="nr-row"><span>Межі оцінки</span><span>${escapeHtml(avoid)}</span></div></div><div class="nr-result-meta">Джерело: канонічне рішення «Сьогодні». Це не персональний перетин і не оцінка сумісності; дата, час та місто не використовуються.</div>`}
  function renderDailyReport(){const route=document.getElementById('nrRoute-reports');if(!route)return;let box=document.getElementById('nrDailyReportPreview');if(!box){box=document.createElement('section');box.id='nrDailyReportPreview';box.className='nr-functional-result';route.appendChild(box)}const title=document.getElementById('nrCoverTitle')?.textContent?.trim()||'Висновок завантажується',summary=document.getElementById('nrCoverSummary')?.textContent?.trim()||'',doTxt=document.getElementById('nrCoverDo')?.textContent?.trim()||'',avoid=document.getElementById('nrCoverAvoid')?.textContent?.trim()||'';box.innerHTML=`<span class="nr-chip">ПОПЕРЕДНІЙ ПЕРЕГЛЯД</span><h3>${escapeHtml(title)}</h3><p class="nr-result-primary">${escapeHtml(summary)}</p><div class="nr-list"><div class="nr-row"><span>Пояснення</span><span>${escapeHtml(doTxt)}</span></div><div class="nr-row"><span>Межі оцінки</span><span>${escapeHtml(avoid)}</span></div></div><div class="nr-result-meta">Звіт повторює канонічний Today і не створює іншого прогнозу.</div>`}
  function renderOutcomeHistory(){const box=document.getElementById('nrOutcomeHistory');if(!box)return;let rows=[];try{rows=JSON.parse(localStorage.getItem('gindex_plan_outcomes_v1')||'[]')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.249','recoverable'); }if(!Array.isArray(rows)||!rows.length){box.innerHTML='<span class="nr-chip">ІСТОРІЯ</span><h3>Останні результати</h3><p>Записів ще немає.</p>';return}const labels={done:'Виконано',partial:'Частково',not_done:'Не виконано'};box.innerHTML='<span class="nr-chip">ІСТОРІЯ · ЛИШЕ ЦЕЙ ПРИСТРІЙ</span><h3>Останні результати</h3><div class="nr-list">'+rows.slice(-7).reverse().map(x=>`<div class="nr-row"><span>${escapeHtml(x.date||'—')}</span><span><strong>${escapeHtml(labels[x.result]||x.result||'—')}</strong>${x.priority?' · '+userText(x.priority):''}${x.note?'<br><small>'+userText(x.note)+'</small>':''}</span></div>`).join('')+'</div><p class="nr-result-meta">Самозвіт користувача; не ground truth і не доказ точності прогнозу.</p>'}
  function restorePlanDraft(){const form=document.getElementById('nrPlanForm');if(!form||form.dataset.restored)return;form.dataset.restored='true';try{const saved=JSON.parse(localStorage.getItem('gindex_day_plan_v1')||'null');if(saved?.date!==todayKey())return;for(const key of ['priority','contact','time','category','note']){const field=form.elements[key];if(!field||typeof saved[key]!=='string')continue;if(key==='category'&&![...field.options].some(o=>o.value===saved[key])){const item=CATS.find(c=>c[0]===saved[key]);if(item)field.add(new Option(item[1],item[0]));}field.value=saved[key];}}catch(e){window.NRDiagnostics?.record('ui.plan_restore','recoverable');}}
  function enhanceFunctionalRoutes(){restorePlanDraft();renderProfileResult();renderPlanResult();renderOutcomeHistory();renderMatchResult();renderDailyReport();const planMeta=document.querySelector('#nrPlanGuard .nr-result-meta');if(planMeta)planMeta.textContent='План допомагає діяти в межах канонічного висновку дня і не створює нового прогнозу.';const reportMeta=document.querySelector('#nrDailyReportPreview .nr-result-meta');if(reportMeta)reportMeta.textContent='Звіт повторює рішення «Сьогодні» і не створює іншого прогнозу.'}
  function calendarStateLabel(g){return g>=1?'сприятливий фон':g<=-1?'обережний режим':'нейтральний фон'}
  function expertDecisionForDate(ds){const row=Array.isArray(window._expertDecisionRegistry?.rows)?window._expertDecisionRegistry.rows.find(x=>x.date===ds):null;const score=_strictDayScore(row?.decision_score),displayText=window._expertDisplayText?.[ds],displayRow=displayText?{...row,headline_text:displayText}:row;return row?.decision_source==='verified_expert_pdf'&&Number.isFinite(score)?{row:displayRow,score}:null}
  function resolveDateLayers(d){const expert=expertDecisionForDate(d?.ds),rawValue=_finiteFormulaNumber(d?.G),raw=Number.isFinite(rawValue)?Math.max(-3,Math.min(3,rawValue)):NaN;return{ds:d?.ds||'',expert,raw,rawValue,primary:Number.isFinite(expert?.score)?expert.score:NaN}}
  function advisoryPresentation(signal){
    const available=!!signal?.decisionAvailable&&Number.isFinite(Number(signal?.decisionScore));
    if(!available)return{available:false,opKey:null,bucket:'none',className:'state-none',coverState:'none',symbol:'—',label:'Без рішення',title:'Рішення дня недоступне',summary:'Надійного рішення зараз немає. Фонові дані не перетворюються на дозвіл для дії.',do:'Оновити дані й дочекатися підтвердженого рішення.',avoid:'Не трактувати окреме джерело як самостійну команду.'};
    const key=signal.opKey;
    if(key==='favorable'||key==='good')return{available:true,opKey:key,bucket:'act',className:'state-act',coverState:'act',symbol:'✓',label:'Діяти',title:'Планові дії доречні',summary:'Стан дня підтримує планові дії в межах поточної рекомендації.',do:signal.recommendation?.text||'Планові дії у перевірених межах.',avoid:'Не ігнорувати зміни обставин і власні обмеження.'};
    if(key==='neutral')return{available:true,opKey:key,bucket:'check',className:'state-check',coverState:'check',symbol:'!',label:'Перевірити',title:'Стандартний режим із перевіркою',summary:'Сильного сигналу на активну дію або зупинку немає.',do:signal.recommendation?.text||'Стандартні задачі та перевірка деталей.',avoid:'Не форсувати неперевірені або незворотні рішення.'};
    if(key==='unstable')return{available:true,opKey:key,bucket:'check',className:'state-caution',coverState:'caution',symbol:'!',label:'Обережно',title:'Обережний режим',summary:'Є нестабільність або обмеження, тому важливі кроки потребують повторної перевірки.',do:signal.recommendation?.text||'Рутина, перевірка деталей і зниження ризику.',avoid:'Нові ризикові кроки та рішення без повторної перевірки.'};
    if(key==='tense')return{available:true,opKey:key,bucket:'hold',className:'state-hold',coverState:'hold',symbol:'×',label:'Відкласти',title:'Пауза для нових кроків',summary:'Важливі нові дії краще відкласти; залиште тільки необхідну рутину.',do:signal.recommendation?.text||'Тільки необхідна рутина.',avoid:'Нові запуски, конфлікти й незворотні рішення.'};
    return{available:false,opKey:null,unknownOpKey:String(key??''),bucket:'none',className:'state-none',coverState:'none',symbol:'—',label:'Без рішення',title:'Невідомий стан рішення',summary:'Система повернула непідтримуваний стан. Він не перетворюється на дозвіл або заборону дії.',do:'Оновити дані й перевірити джерела.',avoid:'Не показувати зелений, жовтий чи червоний стан до усунення помилки.'};
  }
  window.fp455AdvisoryPresentation=advisoryPresentation;
  window.fp456AdvisoryPresentation=advisoryPresentation;
  window.fp457AdvisoryPresentation=advisoryPresentation;
  window.fp463AdvisoryPresentation=advisoryPresentation;
  const FP463_ACTION_HORIZON_DAYS=7;
  function calendarOffsetForDs(ds,start=todayKey()){
    const value=Date.parse(String(ds||'')+'T12:00:00Z'),anchor=Date.parse(String(start||'')+'T12:00:00Z');
    return Number.isFinite(value)&&Number.isFinite(anchor)?Math.round((value-anchor)/86400000):NaN;
  }
  function buildCalendarFrame(source,start=todayKey(),count=27){
    const byDate=new Map((Array.isArray(source)?source:[]).filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.ds||''))).map(x=>[x.ds,x]));
    return Array.from({length:count},(_,offset)=>{const dt=new Date(start+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()+offset);const ds=dt.toISOString().slice(0,10),row=byDate.get(ds);return{...(row||{}),ds,_calendarOffset:offset,_missing:!row||!Number.isFinite(_finiteFormulaNumber(row.G)),_hasRaw:!!row&&Number.isFinite(_finiteFormulaNumber(row.G))}});
  }
  window.fp455BuildCalendarFrame=buildCalendarFrame;
  window.fp456BuildCalendarFrame=buildCalendarFrame;
  window.fp457BuildCalendarFrame=buildCalendarFrame;
  window.fp463BuildCalendarFrame=buildCalendarFrame;
  function offlineAuthorityMode(){return typeof navigator!=='undefined'&&navigator.onLine===false}
  function unavailableForDate(layers,feed,official,scenario,kp,offset,missing){return{...layers,feed,official,scenario,kp,signal:null,presentation:advisoryPresentation(null),decisionScore:NaN,actionEligible:true,calendarOffset:offset,missing:!!missing,snapshot:null}}
  function legacyCanonicalForDate(d){
    const layers=resolveDateLayers(d),offset=Number.isInteger(d?._calendarOffset)?d._calendarOffset:calendarOffsetForDs(layers.ds);
    if(!Number.isFinite(offset)||offset<0||offset>=FP463_ACTION_HORIZON_DAYS)return legacyContextForDate({...d,_calendarOffset:offset});
    const feed=window.__nrFutureKp?.kp?.[layers.ds]||{};
    const official=feed.kp_synthetic===false&&/^NOAA_/.test(String(feed.source||''))&&Number.isFinite(kpDayTerm(feed.kp));
    const scenario=feed.kp_synthetic===true||feed.source==='synthetic_fallback';
    const isToday=layers.ds===todayKey(),ui=window.__uiState||{};
    const liveRaw=isToday&&Number.isFinite(_finiteFormulaNumber(ui.gNow))?_finiteFormulaNumber(ui.gNow):layers.rawValue;
    const liveKp=isToday?currentKpAuthority().kp:(official?Number(feed.kp):NaN);
    if(offlineAuthorityMode()){
      const snapshot=loadCanonicalSnapshot(layers.ds);
      if(!snapshot)return unavailableForDate(layers,feed,official,scenario,NaN,offset,!Number.isFinite(layers.rawValue));
      const signal={decisionAvailable:true,opKey:snapshot.opKey,decisionScore:Number(snapshot.decisionScore),guard:snapshot.guard,dynamicGuard:snapshot.dynamicGuard,actionPolicy:snapshot.actionPolicy};
      return{...layers,feed,official,scenario,kp:NaN,signal,presentation:{...snapshot.presentation},decisionScore:Number(snapshot.decisionScore),actionEligible:true,calendarOffset:offset,missing:!Number.isFinite(layers.rawValue),snapshot};
    }
    if((isToday&&!currentKpAuthority().usable)||(!isToday&&!official)||!Number.isFinite(liveRaw))return unavailableForDate(layers,feed,official,scenario,liveKp,offset,true);
    let signal=null;try{signal=resolveDaySignal_v88825(new Date(layers.ds+'T12:00:00Z'),liveRaw,liveKp,{isToday})}catch(_e){window.NRDiagnostics.record('authority.resolve','invariant',_e);signal=null}
    const presentation=advisoryPresentation(signal);
    const snapshot=isToday?saveCanonicalSnapshot(layers.ds,signal,presentation):null;
    return{...layers,feed,official,scenario,kp:liveKp,signal,presentation,decisionScore:presentation.available?Number(signal.decisionScore):NaN,actionEligible:true,calendarOffset:offset,missing:!Number.isFinite(layers.rawValue),snapshot};
  }
  function legacyContextForDate(d){
    const layers=resolveDateLayers(d),feed=window.__nrFutureKp?.kp?.[layers.ds]||{};
    const official=feed.kp_synthetic===false&&/^NOAA_/.test(String(feed.source||''))&&Number.isFinite(kpDayTerm(feed.kp));
    const scenario=feed.kp_synthetic===true||feed.source==='synthetic_fallback';
    const offset=Number.isInteger(d?._calendarOffset)?d._calendarOffset:calendarOffsetForDs(layers.ds);
    return{...layers,feed,official,scenario,kp:official?Number(feed.kp):NaN,signal:null,presentation:advisoryPresentation(null),decisionScore:NaN,actionEligible:false,calendarOffset:offset,missing:!Number.isFinite(layers.rawValue)};
  }
  function canonicalForDate(d){
    const layers=resolveDateLayers(d),offset=calendarOffsetForDs(layers.ds);
    const result=window.NRConsumerAuthority.resolve((_sourceForecastRows||{})[layers.ds],layers.ds,Date.now(),offlineAuthorityMode()||window.__nrConsumerCached===true);
    const presentation=window.NRConsumerAuthority.present(result);
    const signal={decisionAvailable:result.available,decisionScore:result.score,opKey:presentation.opKey,guard:'none',dynamicGuard:null,authority:result.authority};
    return {...layers,primary:result.score,consumer:result,feed:(_sourceForecastRows||{})[layers.ds]||{},official:result.available,scenario:false,kp:NaN,signal,presentation,
      decisionScore:result.available?result.score:NaN,actionEligible:false,calendarOffset:offset,missing:!result.available,snapshot:null};
  }
  // BEGIN product render queue
  const _productQueue=window.NRRenderQueue.create({resolve:canonicalForDate,renderers:{
    forecast:()=>renderUnifiedForecast(), calendar:()=>renderCalendar(),
    independent:()=>renderIndependentForecasts(), cover:()=>renderCompetitiveCover()
  }});
  function operationalForDate(d){return _productQueue.resolve(d);}
  function requestProductRender(...parts){return _productQueue.request(...parts);}
  window.requestProductRender=requestProductRender;
  // END product render queue
  window.fp455OperationalForDate=operationalForDate;
  window.fp456OperationalForDate=operationalForDate;
  window.fp457CanonicalForDate=legacyCanonicalForDate;
  window.fp463CanonicalForDate=legacyCanonicalForDate;
  window.fp469ConsumerForDate=canonicalForDate;
  function contextForDate(d){return canonicalForDate(d);}
  function calendarPointG(d){const resolved=operationalForDate(d);return resolved.decisionScore}
  function renderCalendar(){
    const week=document.getElementById('nrCalendarWeek'),month=document.getElementById('nrCalendarMonth');if(!week||!month)return;
    const source=(typeof _27dComputed!=='undefined'&&Array.isArray(_27dComputed))?_27dComputed:[];
    const start=todayKey(),data=buildCalendarFrame(source,start,27);
    if(!source.length){week.innerHTML='<div class="nr-chart-empty">Канонічний ряд ще завантажується…</div>';setTimeout(()=>requestProductRender('calendar'),900);return}
    const fmtDay=ds=>window.NRPresentation.dateFormatter('uk-UA',{timeZone:'Europe/Kyiv',weekday:'short'}).format(new Date(ds+'T12:00:00Z'));
    const fmtDate=ds=>window.NRPresentation.dateFormatter('uk-UA',{timeZone:'Europe/Kyiv',day:'numeric',month:'short'}).format(new Date(ds+'T12:00:00Z'));
    week.innerHTML=data.slice(0,7).map((d,i)=>{const resolved=operationalForDate(d),p=resolved.presentation,today=d.ds===start;return `<button class="nr-calendar-day ${p.className}${i===0?' active':''}" data-ds="${d.ds}" aria-pressed="${i===0?'true':'false'}" onclick="fp443SelectCalendarDay('${d.ds}',this)"><small>${today?'сьогодні':escapeHtml(fmtDay(d.ds))}</small><b>${p.symbol} ${escapeHtml(p.label)}</b><span>${escapeHtml(fmtDate(d.ds))}<br>${escapeHtml(p.title)}</span></button>`}).join('');
    const cells=[];
    for(let i=0;i<27;i++){
      const d=data[i],ds=d.ds;
      if(i>=7){const context=contextForDate(d),source=context.expert?'є джерело':d._missing?'даних немає':'лише фон';cells.push(`<div class="nr-calendar-cell context-only state-none${d._missing?' missing':''}" data-ds="${ds}" data-action-eligible="false" aria-label="${escapeHtml(fmtDate(ds))}: лише контекст, ${escapeHtml(source)}, порада на дію не надається"><strong>${escapeHtml(fmtDate(ds))}</strong><span aria-hidden="true">◇ ${escapeHtml(source)}</span></div>`);continue}
      const resolved=operationalForDate(d),p=resolved.presentation;
      cells.push(`<div class="nr-calendar-cell ${p.className}${d._missing?' missing':''}" data-ds="${ds}" data-action-eligible="true"><strong>${escapeHtml(fmtDate(ds))}</strong>${p.symbol} ${escapeHtml(p.label)}${d._missing?' · поточний G відсутній':''}${resolved.expert?` · PDF ${resolved.expert.score>=0?'+':''}${resolved.expert.score.toFixed(0)}`:''}</div>`)
    }
    month.innerHTML=cells.join('');
    window.fp443SelectCalendarDay(data[0].ds,week.querySelector('.nr-calendar-day'));
  }
    window.fp443SelectCalendarDay=function(ds,button){const source=(typeof _27dComputed!=='undefined'&&Array.isArray(_27dComputed))?_27dComputed:[],d=buildCalendarFrame(source,todayKey(),27).find(x=>x.ds===ds),box=document.getElementById('nrCalendarDetail');if(!d||!box)return;document.querySelectorAll('.nr-calendar-day').forEach(n=>{const active=n===button;n.classList.toggle('active',active);n.setAttribute('aria-pressed',String(active))});const resolved=operationalForDate(d),p=resolved.presentation,expert=resolved.expert,raw=resolved.rawValue,fmt=v=>Number.isFinite(v)?`${v>=0?'+':''}${v.toFixed(1)}`:'—';box.innerHTML=`<span class="nr-chip">РІШЕННЯ ДНЯ · ${escapeHtml(p.label.toUpperCase())}</span><p class="nr-source-summary">${escapeHtml(sourceSummary(ds))}</p><h3>${window.NRPresentation.dateFormatter('uk-UA',{timeZone:'Europe/Kyiv',weekday:'long',day:'numeric',month:'long'}).format(new Date(ds+'T12:00:00Z'))}</h3><p><strong>${p.symbol} ${escapeHtml(p.title)}</strong></p><p>${escapeHtml(p.summary)}</p><details class="nr-authority-details"><summary>Джерела й технічні дані</summary><p class="nr-result-meta">Канонічний механізм: ${p.available?`${escapeHtml(String(resolved.signal.opKey))} · рішення ${fmt(resolved.decisionScore)}`:'рішення недоступне'}${resolved.signal?.guard&&resolved.signal.guard!=='none'?` · обмеження ${escapeHtml(resolved.signal.guard)}`:''}. Довідковий PDF: ${expert?fmt(expert.score)+' · джерело звірено':'немає'}. Поточний G: ${fmt(raw)} · контекст, не команда. ${resolved.scenario?'Резервний сценарій не визначає колір поради.':''}</p></details>`};
  window.fp453SetHorizon=function(days,button){
    document.querySelectorAll('#nrRoute-forecast .nr-forecast-tabs [role="tab"]').forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});
    document.querySelectorAll('#nrRoute-forecast .nr-horizon[data-horizon]').forEach(panel=>panel.dataset.active=String(Number(panel.dataset.horizon)===Number(days)));
    const panel=document.getElementById('nrHorizon'+days);if(panel&&matchMedia('(max-width:700px)').matches)panel.scrollIntoView({behavior:'smooth',block:'start'});
  };
  function renderCosmicConcept(){
    const root=document.getElementById('nrCosmicConcept');if(!root||typeof computePanchanga!=='function')return;
    try{
      const now=new Date(),p=computePanchanga(now),kpAuthority=currentKpAuthority(),kp=kpAuthority.usable?kpAuthority.kp:NaN;
      const ai=typeof computeAi==='function'?computeAi(now,Number.isFinite(kp)?kp:0):null;
      const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};
      set('nrSkySun',`${p.vara?.name||'Vara'} · ${p.vara?.planet||'сонячний ритм дня'}`);
      set('nrSkySunNote',`Yoga: ${p.yoga?.name||'—'} · резонанс Сонця й Місяця${p.vara?.note?` · ${p.vara.note}`:''}`);
      set('nrSkyMoon',`${ai?.phaseName||'Фаза уточнюється'} · ${p.nakshatra?.name||'Nakshatra —'}`);
      set('nrSkyMoonNote',`Tithi: ${p.tithi?.name||'—'} · зоряна стоянка: ${p.nakshatra?.type||'—'}${p.nakshatra?.regent?` · регент ${p.nakshatra.regent}`:''}`);
      const mi=Number(ai?.Mi),eclipse=Number.isFinite(mi)&&mi!==0?`Вплив затемнення Mᵢ ${mi>0?'+':''}${mi}`:'Затемнення не змінює стан дня';
      const space=Number.isFinite(kp)?`Kp ${kp.toFixed(1)} · ${kpAuthority.label}`:'Kp недоступний';
      set('nrSkyInfluence',`${eclipse} · ${space}`);
      set('nrSkyInfluenceNote','Космічна погода показана як фізичний фон; Панчанга — як традиційний календарний сенс. Вони не дублюють одне одного.');
      const parts=[p.tithi?.type&&`місячний ритм — ${p.tithi.type}`,p.nakshatra?.type&&`характер дії — ${p.nakshatra.type}`,p.karana?.note&&`короткий практичний ритм — ${p.karana.note}`,p.vara?.note&&`тема дня — ${p.vara.note}`].filter(Boolean);
      set('nrSkyMeaning',`${parts.join('; ')||'Традиційний сенс уточнюється за поточними компонентами Панчанги.'}. Це орієнтир для уважності, практики й планування, а не гарантія події.`);
    }catch(error){ globalThis.NRDiagnostics?.record('catch.284','recoverable'); const node=document.getElementById('nrSkyMeaning');if(node)node.textContent='Космічний шар тимчасово недоступний; значення не підміняються припущенням.'}
  }
  window.fp463RenderCosmicConcept=renderCosmicConcept;
  function fetchConsumerFeeds(){
    return window.NRConsumerAuthority.loadFeeds(document.baseURI);
  }
  let _consumerFeedPending=null;
  function loadConsumerForecast(){
    if(_consumerFeedPending)return _consumerFeedPending;
    _consumerFeedPending=fetchConsumerFeeds().then(feed=>{
      window.__nrConsumerCached=false;_sourceForecastRows=feed.days;
      window.NRConsumerOverview?.update(_sourceForecastRows);return feed;
    }).catch(error=>{window.__nrConsumerCached=true;window.NRDiagnostics.record('consumer.feed','recoverable',error);return null;}).finally(()=>{
      _consumerFeedPending=null;renderSourceSummary();requestProductRender('cover','calendar','forecast');
    });return _consumerFeedPending;
  }
  window.fp469LoadConsumerForecast=loadConsumerForecast;
  setTimeout(loadConsumerForecast,0);
  window.addEventListener('gindex:data-ready',loadConsumerForecast);
  window.addEventListener('online',loadConsumerForecast);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadConsumerForecast();});

  let _independentPanelGeneration=0;
  var _sourceForecastRows={};
  function sourceSummary(ds){
    const r=window.NRConsumerAuthority.resolve((_sourceForecastRows||{})[ds],ds,Date.now(),offlineAuthorityMode()||window.__nrConsumerCached===true);
    const fmt=n=>n===null?'—':n<0?'−'+Math.abs(n):n>0?'+'+n:'0';
    return `Оцінка моделі: ${fmt(r.score)}. Експертне джерело: ${fmt(r.expertReference)}. Методики мають спільні вихідні складові; збіг не підтверджує точність. Стан: ${r.state}.`;
  }
  function renderSourceSummary(){window.NRConsumerOverview?.update(_sourceForecastRows);const node=document.getElementById('nrOwnForecastToday');if(node)node.textContent=sourceSummary(todayKey());}
  window.fp468SourceSummary=sourceSummary;
  async function renderIndependentForecasts(){
    const grid=document.getElementById('nrIndependentGrid');if(!grid)return;
    const generation=++_independentPanelGeneration;
    window.__independentPanelState={generation,status:'loading'};
    const score=value=>{const n=_strictDayScore(value);return n===null?'—':`${n>0?'+':''}${n}`};
    try{
      const [feed,scorecard]=await Promise.all([fetchConsumerFeeds(),withTimeout(async signal=>{
        const response=await fetch('FP463_CHANNEL_SCORECARD.json',{cache:'no-store',signal});return response.ok?response.json():{};
      },7500,'independent panel')]);
      if(!feed)throw new Error('consumer feed unavailable');
      if(generation!==_independentPanelGeneration)return;
      window.__nrConsumerCached=false;_sourceForecastRows=feed.days||{};renderSourceSummary();requestProductRender("cover","calendar","forecast");
      const all=Object.values(feed.days||{}).sort((a,b)=>String(a.date).localeCompare(String(b.date))),start=todayKey();
      let rows=all.filter(row=>row.date>=start).slice(0,27);if(!rows.length)rows=all.slice(-7);
      if(!rows.length)throw new Error('empty feed');
      grid.innerHTML=`<div class="nr-independent-row" role="row"><span class="nr-ind-date">Дата</span><span>Наш розрахунок</span><span>PDF</span><span>Архів Engine</span><span class="nr-ind-tanita">Tanita</span><span class="nr-ind-status">Статус</span></div>`+rows.map(row=>{
        const channels=row.channels||{},pdf=channels.expert_pdf?.available?score(channels.expert_pdf.value):'—',engine=channels.frozen_engine?.available?score(channels.frozen_engine.value):'—',tanita=channels.tanita_image?.available?score(channels.tanita_image.value):'—';
        const own=channels.source_formula||{},generated=Date.parse(own.generated_at||''),issued=Date.parse(own.noaa_issued_at||''),now=Date.now();
        const ownFresh=window.NRConsumerAuthority.resolve(row,row.date,now).available;
        const ownScore=own.available&&ownFresh?score(own.value):'—';
        const ownNote=ownScore==='—'?'немає перевірених даних':`Kp max ${own.kp_daily_max} · NOAA`;
        const complete=ownScore!=='—'&&['expert_pdf','frozen_engine','tanita_image'].every(key=>channels[key]?.available&&_strictDayScore(channels[key]?.value)!==null);
        const status=!complete?'— неповні дані':row.material_disagreement?'⚠ розбіжність':'✓ без істотної розбіжності';
        return `<div class="nr-independent-row" role="row" data-date="${escapeHtml(row.date)}" data-disagreement="${row.material_disagreement?'true':'false'}"><span class="nr-ind-date">${escapeHtml(fmtDate(row.date))}</span><span aria-label="Наш розрахунок ${ownScore}" title="${escapeHtml(ownNote)}">Наш ${ownScore}</span><span aria-label="PDF ${pdf}">PDF ${pdf}</span><span aria-label="Engine ${engine}">Engine ${engine}</span><span class="nr-ind-tanita" aria-label="Tanita ${tanita}">Tanita ${tanita}</span><span class="nr-ind-status${row.material_disagreement?' nr-ind-warn':''}">${status} · не усереднюється</span></div>`;
      }).join('');
      const cards=scorecard.channels||{},boundary=document.getElementById('nrProspectiveBoundary');
      if(boundary)boundary.textContent=`Prospective зафіксовано: PDF ${cards.expert_pdf?.frozen_predictions??0}, Engine ${cards.frozen_engine?.frozen_predictions??0}, Tanita ${cards.tanita_image?.frozen_predictions??0}. Валідні незалежні outcomes: ${cards.expert_pdf?.valid_independent_pairs??0}/${cards.frozen_engine?.valid_independent_pairs??0}/${cards.tanita_image?.valid_independent_pairs??0}. Gate кожного каналу: 0/100 на старті; поточні значення показані вище. Порівняння, router та ансамбль заблоковані до 100 пар на канал.`;
      window.__independentPanelState={generation,status:'loaded'};
    }catch(error){ globalThis.NRDiagnostics?.record('catch.285','recoverable');
      if(generation!==_independentPanelGeneration)return;
      renderSourceSummary();requestProductRender("cover","calendar","forecast");
      window.__independentPanelState={generation,status:'error',message:String(error?.message||error)};
      grid.innerHTML='<div class="nr-chart-empty" role="status">[UNVERIFIED] Незалежні канали недоступні. Значення не підмінено припущенням.</div>';
      const boundary=document.getElementById('nrProspectiveBoundary');if(boundary)boundary.textContent='Статистика незалежних каналів недоступна до успішного оновлення.';
    }
  }
  window.fp463RenderIndependentForecasts=renderIndependentForecasts;
  function renderCategories(){
    const grid=document.getElementById('nrCategoryGrid');if(!grid)return;
    let unlocked='';try{const x=JSON.parse(localStorage.getItem('gindex_daily_key_v1')||'null');if(x&&x.date===todayKey())unlocked=x.category}catch(_e){ window.NRDiagnostics?.record('legacy.catch.250','recoverable'); }
    grid.innerHTML=CATS.map(([id,name,copy])=>`<article class="nr-card ${unlocked&&unlocked!==id?'nr-locked':''}"><span class="nr-chip">${unlocked===id?'ФОКУС ДНЯ':unlocked?'МОЖНА ЗМІНИТИ':'КЛЮЧ ДНЯ'}</span><h3>${name}</h3><p>${copy}</p><button class="nr-btn ${unlocked&&unlocked!==id?'secondary':''}" style="margin-top:14px" aria-pressed="${unlocked===id?'true':'false'}" onclick="fp434UnlockCategory('${id}')">${unlocked===id?'Показати фокус':unlocked?'Змінити фокус':'Обрати сьогодні'}</button></article>`).join('');
    if(unlocked)showCategory(unlocked);
  }
  function showCategory(id){
    const item=CATS.find(x=>x[0]===id),box=document.getElementById('nrCategoryDetail');if(!item||!box)return;
    const info=window.NRConsumerOverview?.category(todayKey(),id)||{facts:'Календарні дані завантажуються.',prompt:'Оберіть власну справу.',boundary:'Окремого прогнозу для сфери немає.'};
    box.hidden=false;box.innerHTML=`<span class="nr-chip">ВАШ ФОКУС СЬОГОДНІ</span><h3>${item[1]}</h3><div class="nr-list"><div class="nr-row"><span>У календарі</span><span>${escapeHtml(info.facts)}</span></div><div class="nr-row"><span>Мій план</span><span>${escapeHtml(info.prompt)}</span></div><div class="nr-row"><span>Підстава</span><span>${escapeHtml(info.boundary)}</span></div></div><button class="nr-btn secondary" style="margin-top:14px" onclick="fp456CategoryToPlan('${id}')">Додати цю сферу до плану</button>`;
    const contextHost=document.createElement('div');contextHost.className='nr-category-context';box.append(contextHost);
    window.NRCalendarContext?.render(contextHost,window.nrRetroEphemeris?.(),todayKey(),id);

  }
  window.nrRefreshCategoryContext=function(){const box=document.getElementById('nrCategoryDetail');if(!box||box.hidden)return;let saved=null;try{saved=JSON.parse(localStorage.getItem('gindex_daily_key_v1')||'null')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.251','recoverable'); }if(saved?.date!==todayKey()){box.hidden=true;return;}showCategory(saved.category);};
  window.fp456CategoryToPlan=function(id){restorePlanDraft();fp434Go('plan',false);const select=document.querySelector('#nrPlanForm select[name="category"]'),item=CATS.find(row=>row[0]===id);if(select){if(![...select.options].some(option=>option.value===id)&&item)select.add(new Option(item[1],id));select.value=id}document.querySelector('#nrPlanForm input[name="priority"]')?.focus()};
  window.fp434UnlockCategory=function(id){
    let current=null;try{current=JSON.parse(localStorage.getItem('gindex_daily_key_v1')||'null')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.252','recoverable'); }
    try{localStorage.setItem('gindex_daily_key_v1',JSON.stringify({date:todayKey(),category:id}))}catch(_e){ window.NRDiagnostics?.record('legacy.catch.253','recoverable'); }
    renderCategories();localizeNewShellCopy();showCategory(id);document.getElementById('nrCategoryDetail')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.fp434Go=function(name,scroll){
    if(!ROUTES.includes(name)||(window.GINDEX_PLAY_CHANNEL&&name==='expert'))name='today';
    renderSourceSummary();
    document.querySelectorAll('.nr-route').forEach(n=>{const active=n.dataset.route===name;n.classList.toggle('active',active);n.setAttribute('aria-hidden',String(!active))});
    document.querySelectorAll('.mnav-btn').forEach(n=>{n.classList.remove('active');n.removeAttribute('aria-current')});
    const mobileCurrent=document.getElementById('mnav'+ROUTE_NAV[name]);mobileCurrent?.classList.add('active');mobileCurrent?.setAttribute('aria-current','page');
    document.querySelectorAll('#nrTopNav button').forEach(n=>{const active=n.dataset.route===name||(!['today','concept','panch','forecast','calendar'].includes(name)&&n.dataset.route==='more');n.classList.toggle('active',active);if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
    try{localStorage.setItem('fp434_route',name)}catch(_e){ window.NRDiagnostics?.record('legacy.catch.254','recoverable'); }
    if(name==='categories'){renderCategories();localizeNewShellCopy()}
    if(name==='calendar')setTimeout(()=>requestProductRender('calendar'),80);
    if(name==='forecast'){setTimeout(()=>requestProductRender('forecast'),80);setTimeout(()=>requestProductRender('independent'),120)}
    if(name==='today'){setTimeout(()=>requestProductRender('cover'),80);setTimeout(renderCosmicConcept,120)}
    if(['profile','match','reports','plan'].includes(name))setTimeout(enhanceFunctionalRoutes,80);
    if(scroll){const focusAtNavigation=document.activeElement;window.scrollTo({top:0,behavior:'smooth'});const activeRoute=document.getElementById('nrRoute-'+name);const heading=activeRoute?.querySelector('h1,h2');const announcer=document.getElementById('fp434RouteAnnouncer');if(announcer)announcer.textContent=heading?.textContent?.trim()||name;setTimeout(()=>{if(!activeRoute?.classList.contains('active'))return;if(document.activeElement!==focusAtNavigation&&document.activeElement!==document.body)return;const currentHeading=activeRoute.querySelector('h1,h2');if(currentHeading){currentHeading.setAttribute('tabindex','-1');currentHeading.focus({preventScroll:true})}},120)}
  };
  window.fp435SavePlan=function(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));data.date=todayKey();try{localStorage.setItem('gindex_day_plan_v1',JSON.stringify(data));window.fp466CancelReminder();document.getElementById('nrPlanStatus').textContent='✓ План збережено на цьому пристрої';renderPlanResult()}catch(_e){ globalThis.NRDiagnostics?.record('catch.286','recoverable'); document.getElementById('nrPlanStatus').textContent='Не вдалося зберегти локально'}return false};
  window.fp466CancelReminder=function(){window.clearTimeout(window.__nrPlanReminderTimer);window.__nrPlanReminderTimer=null;try{localStorage.removeItem('gindex_plan_reminder_v1')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.255','recoverable'); }const form=document.getElementById('nrPlanForm');if(form)delete form.dataset.reminder;const status=document.getElementById('nrReminderStatus');if(status)status.textContent='Нагадування скасовано.'};
  window.fp466EnableReminder=async function(){
    const status=document.getElementById('nrReminderStatus'),form=document.getElementById('nrPlanForm'),say=text=>{if(status)status.textContent=text};
    try{
      const raw=localStorage.getItem('gindex_day_plan_v1'),plan=JSON.parse(raw||'null');
      if(!plan||plan.date!==todayKey()||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(String(plan.time||''))){say('Спочатку збережіть план і вкажіть коректний час.');return}
      const instant=NRPlanCalendar.instant(plan.date,plan.time);if(instant===null){say('Цей київський час не існує або повторюється під час переходу годинника. Оберіть інший час.');return}const at=new Date(instant);
      if(at.getTime()<=Date.now()){say('Цей час уже минув. Оберіть майбутній час.');return}
      if(!('Notification' in window)){say('Цей браузер не підтримує сповіщення.');return}
      let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();
      if(permission!=='granted'){say('Сповіщення не дозволені в налаштуваннях браузера.');return}
      if(raw!==localStorage.getItem('gindex_day_plan_v1')||at.getTime()<=Date.now()){say('План або час змінився. Установіть нагадування повторно.');return}
      window.fp466CancelReminder();
      const token=new Date().toISOString();
      localStorage.setItem('gindex_plan_reminder_v1',JSON.stringify({date:plan.date,time:plan.time,scheduled_at:token}));
      window.__nrPlanReminderTimer=window.setTimeout(async()=>{
        try{
          const saved=JSON.parse(localStorage.getItem('gindex_plan_reminder_v1')||'null');
          if(saved?.scheduled_at!==token||raw!==localStorage.getItem('gindex_day_plan_v1'))return;
          const registration=await navigator.serviceWorker?.getRegistration();
          if(registration)await registration.showNotification('NeboRhythm · план',{body:String(plan.priority||'Запланована дія'),tag:'neborhythm-day-plan'});
          else new Notification('NeboRhythm · план',{body:String(plan.priority||'Запланована дія')});
          say('Сповіщення передано системі.');
        }catch(_e){ globalThis.NRDiagnostics?.record('catch.287','recoverable'); say('Не вдалося показати сповіщення. Перевірте дозволи браузера.')}
        finally{window.__nrPlanReminderTimer=null;if(form)delete form.dataset.reminder;try{localStorage.removeItem('gindex_plan_reminder_v1')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.256','recoverable'); }}
      },at.getTime()-Date.now());
      if(form)form.dataset.reminder='active';
      say('Нагадування на '+plan.time+' за Києвом. Залиште сторінку відкритою; після закриття або перезавантаження таймер не працює.');
    }catch(_e){ globalThis.NRDiagnostics?.record('catch.288','recoverable'); say('Не вдалося встановити нагадування. Перевірте дозволи й доступ до локального сховища.')}
  };
  window.fp466SaveOutcome=function(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));if(!['done','partial','not_done'].includes(data.result)){document.getElementById('nrOutcomeStatus').textContent='Оберіть результат плану.';return false;}let plan=null,rows=[];try{plan=JSON.parse(localStorage.getItem('gindex_day_plan_v1')||'null');rows=JSON.parse(localStorage.getItem('gindex_plan_outcomes_v1')||'[]')}catch(_e){ window.NRDiagnostics?.record('legacy.catch.257','recoverable'); }if(!Array.isArray(rows))rows=[];const row={date:todayKey(),result:String(data.result||''),note:String(data.note||'').trim(),priority:plan?.date===todayKey()?String(plan.priority||''):''};rows=rows.filter(x=>x&&x.date!==row.date);rows.push(row);try{localStorage.setItem('gindex_plan_outcomes_v1',JSON.stringify(rows.slice(-90)));document.getElementById('nrOutcomeStatus').textContent='✓ Фактичний результат збережено локально';renderOutcomeHistory();event.currentTarget.reset()}catch(_e){ globalThis.NRDiagnostics?.record('catch.289','recoverable'); document.getElementById('nrOutcomeStatus').textContent='Не вдалося зберегти результат'}return false};
  window.fp435SaveMatch=function(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));try{localStorage.setItem('gindex_match_person_v1',JSON.stringify({name:String(data.name||'').trim()}));document.getElementById('nrMatchStatus').textContent='✓ Ім’я збережено лише на цьому пристрої.';renderMatchResult()}catch(_e){ globalThis.NRDiagnostics?.record('catch.290','recoverable'); document.getElementById('nrMatchStatus').textContent='Не вдалося зберегти ім’я на пристрої'}return false};
  function loadFp440Profile(){const form=document.getElementById('nrProfileForm');if(!form)return;try{const data=JSON.parse(localStorage.getItem('gindex_profile_v2')||'null');if(!data)return;['name','city','mode'].forEach(k=>{if(form.elements[k]&&data[k]!=null)form.elements[k].value=data[k]})}catch(_e){ window.NRDiagnostics?.record('legacy.catch.258','recoverable'); }}
  window.fp440SaveProfile=function(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));try{localStorage.setItem('gindex_profile_v2',JSON.stringify({...JSON.parse(localStorage.getItem('gindex_profile_v2')||'{}'),...data}));document.getElementById('nrProfileStatus').textContent='✓ Дані збережено лише на цьому пристрої';renderProfileResult();renderMatchResult()}catch(_e){ globalThis.NRDiagnostics?.record('catch.291','recoverable'); document.getElementById('nrProfileStatus').textContent='Не вдалося зберегти дані на пристрої'}return false};
  async function renderPanchGuide(){
    const box=document.getElementById('nrPanchNow');if(!box)return;
    const NAK=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
    const YOGA=['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
    const VARA=['Неділя · Сонце','Понеділок · Місяць','Вівторок · Марс','Середа · Меркурій','Четвер · Юпітер','П’ятниця · Венера','Субота · Сатурн'];
    try{
      const res=await fetch('panchanga_shadow_feed_v1.json',{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);const feed=await res.json();const ds=todayKyivStr();const day=feed.days&&feed.days[ds];if(!day)throw new Error('немає дня '+ds);
      const now=Date.now(),fmtTime=d=>window.NRPresentation.dateFormatter('uk-UA',{timeZone:day.timezone||'Europe/Kyiv',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
      const fmtValue=(name,value)=>{if(name==='nakshatra')return NAK[Number(value)-1]||String(value);if(name==='yoga')return YOGA[Number(value)-1]||String(value);if(name==='tithi'){const v=Number(value);return `${v} · ${v<=15?'Shukla':'Krishna'}`};return String(value)};
      function current(name){const c=day.components[name],segments=Array.isArray(c?.segments)?c.segments:[],seg=segments.find(s=>Date.parse(s.start_utc)<=now&&now<Date.parse(s.end_utc));if(!seg)return {value:'UNVERIFIED',end:null,hasNext:false,missing:true};const idx=segments.indexOf(seg),next=segments[idx+1];return {value:fmtValue(name,seg.value),end:seg.end_utc,hasNext:!!next,next:next?fmtValue(name,next.value):null};}
      const meanings={Tithi:'місячний ритм',Vara:'управитель дня',Nakshatra:'характер дії',Yoga:'фон взаємодії',Karana:'короткий практичний ритм'};
      const rows=[['Tithi',current('tithi')],['Vara',{value:VARA[new Date(ds+'T12:00:00').getDay()],end:null,hasNext:false}],['Nakshatra',current('nakshatra')],['Yoga',current('yoga')],['Karana',current('karana')]];
      const events=[];for(const [key,label] of [['tithi','Tithi'],['nakshatra','Nakshatra'],['yoga','Yoga'],['karana','Karana']]){const segs=day.components[key]?.segments||[];for(let i=1;i<segs.length;i++)events.push({at:segs[i].start_utc,label,value:fmtValue(key,segs[i].value)})}events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
      const dateText=window.NRPresentation.dateFormatter('uk-UA',{timeZone:day.timezone||'Europe/Kyiv',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(ds+'T12:00:00Z'));
      const cards=rows.map(([name,x])=>`<article class="nr-panch-component"><b>${name}</b><strong>${escapeHtml(String(x.value))}</strong><small>${escapeHtml(meanings[name])}</small><small class="nr-panch-until">${x.missing?'Немає даних для поточного моменту':x.hasNext?`до ${fmtTime(x.end)}, далі ${escapeHtml(String(x.next))}`:'без наступної зміни сьогодні'}</small></article>`).join('');
      const timeline=events.length?events.map(e=>`<div class="nr-panch-event${Date.parse(e.at)<=now?' is-past':''}"><time datetime="${escapeHtml(e.at)}">${fmtTime(e.at)}</time><b>${e.label}</b><span>починається <strong>${escapeHtml(e.value)}</strong></span></div>`).join(''):'<div class="nr-panch-empty">Переходів до завершення календарної доби немає.</div>';
      const next=events.find(e=>Date.parse(e.at)>now);
      box.innerHTML=`<section class="nr-panch-summary"><div class="nr-panch-summary-head"><div><span class="nr-chip">ПАНЧАНГА ДНЯ</span><h3>Що діє зараз</h3><div class="nr-panch-date">${escapeHtml(dateText)} · ${escapeHtml(day.timezone||'Europe/Kyiv')}</div></div><span class="nr-panch-live">${next?`НАСТУПНА ЗМІНА О ${fmtTime(next.at)}`:'ПЕРЕХОДИ ДНЯ ЗАВЕРШЕНО'}</span></div><div class="nr-panch-components">${cards}</div></section><section class="nr-panch-section"><span class="nr-chip">ШКАЛА ДОБИ</span><h3>Усі переходи сьогодні</h3><div class="nr-panch-timeline">${timeline}</div></section>`;
    }catch(error){ globalThis.NRDiagnostics?.record('catch.292','recoverable'); box.innerHTML='<div class="nr-row"><span>UNVERIFIED</span><span>Переходи Панчанги недоступні: '+escapeHtml(error.message)+'</span></div>'}
  }
  async function renderDataTruthGate(){
    const box=document.getElementById('nrDataTruthBody');if(!box)return;
    try{
      const [kpRes,healthRes,panchRes]=await Promise.all([
        loadFutureKp().then(kp=>({ok:true,json:async()=>window.__nrFutureKp})),
        fetch('SYSTEM_HEALTH_STATUS_v1.json',{cache:'no-store'}),
        fetch('PANCHANGA_ASTRONOMY_ENGINE_CROSSCHECK_v1.json',{cache:'no-store'})
      ]);
      if(!kpRes.ok)throw new Error('future_kp HTTP '+kpRes.status);
      if(!healthRes.ok)throw new Error('system health HTTP '+healthRes.status);
      if(!panchRes.ok)throw new Error('Panchanga cross-check HTTP '+panchRes.status);
      const kp=await kpRes.json(),health=await healthRes.json(),panch=await panchRes.json();
      // Read the shared loader state; diagnostics never own forecast authority.
      const start=todayKey(),dates=[];for(let i=0;i<7;i++){const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);dates.push(d.toISOString().slice(0,10));}
      const rows=dates.map(ds=>({date:ds,...((kp.kp||{})[ds]||{})}));
      const official=rows.filter(x=>x.kp_synthetic===false&&/^NOAA_/.test(String(x.source||''))).length;
      const synthetic=rows.filter(x=>x.kp_synthetic===true||x.source==='synthetic_fallback').length;
      const missing=rows.filter(x=>!Number.isFinite(Number(x.kp))).length;
      const gen=typeof kp.generated==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(kp.generated)?new Date(kp.generated):null;
      const ageH=gen&&isFinite(gen)?(Date.now()-gen.getTime())/36e5:null;
      const fresh=ageH!==null&&ageH>=-5/60&&ageH<=6;
      const warnings=Array.isArray(health.warnings)?health.warnings:[];
      const gate=(health.status==='PASS'&&synthetic===0&&missing===0&&fresh&&panch.status==='PASS')?'PASS':'WARN';
      const dayRows=rows.map((x,i)=>{
        const src=x.kp_synthetic===false&&/^NOAA_/.test(String(x.source||''))?'OFFICIAL NOAA':x.kp_synthetic?'UNVERIFIED Kp':'MISSING';
        const color=src==='OFFICIAL NOAA'?'var(--ok)':src==='UNVERIFIED Kp'?'var(--warn)':'var(--bad)';
        return `<div class="nr-row"><span>${i+1}. ${escapeHtml(x.date)}</span><span><strong style="color:${color}">${src}</strong>${Number.isFinite(Number(x.kp))?` · Kp ${Number(x.kp).toFixed(2)}`:''}<br><small>${escapeHtml(String(x.source||'немає джерела'))}</small></span></div>`;
      }).join('');
      box.innerHTML=`<div class="nr-list"><div class="nr-row"><span>Загальний gate</span><span><strong style="color:${gate==='PASS'?'var(--ok)':'var(--warn)'}">${gate}</strong> · System Health ${escapeHtml(String(health.status||'UNKNOWN'))}</span></div><div class="nr-row"><span>Горизонт Kp</span><span>${official}/7 official · ${synthetic}/7 synthetic · ${missing}/7 missing</span></div><div class="nr-row"><span>Свіжість Kp</span><span><strong style="color:${fresh?'var(--ok)':'var(--bad)'}">${fresh?'FRESH':'STALE / UNVERIFIED'}</strong>${ageH!==null?' · '+ageH.toFixed(1)+' год':''}</span></div><div class="nr-row"><span>Панчанга × Astronomy Engine</span><span><strong style="color:${panch.status==='PASS'?'var(--ok)':'var(--warn)'}">${escapeHtml(panch.status)}</strong> · ${Number(panch.tested||0)} сегментів · ${Number(panch.material_mismatches||0)} material mismatch · ${Number(panch.boundary_sensitive_mismatches||0)} boundary-sensitive</span></div></div><p style="margin:12px 0 8px"><strong>Правило:</strong> NOAA-ділянка — прогноз. <code>UNVERIFIED Kp</code> — технічне плато для обчислювальної сумісності, не прогноз і не підстава для дії. Межі Панчанги в межах кількох хвилин між різними ефемеридами позначаються як model-sensitive.</p><div class="nr-list">${dayRows}</div>${warnings.length?`<p style="margin-top:12px;color:var(--warn)"><strong>Відкриті аномалії:</strong> ${warnings.map(escapeHtml).join(' · ')}</p>`:''}`;
      setTimeout(()=>requestProductRender('forecast'),0);
    }catch(error){ globalThis.NRDiagnostics?.record('catch.293','recoverable'); box.innerHTML=`<div class="nr-row"><span>BLOCKED</span><span>Не вдалося перевірити data gate: ${escapeHtml(error.message)}</span></div>`}
  }
  function renderUnifiedForecast(){
    const source=(typeof _27dComputed!=='undefined'&&Array.isArray(_27dComputed))?_27dComputed:[];
    const start=todayKey();
    const data=buildCalendarFrame(source,start,27);
    if(!source.length){setTimeout(()=>requestProductRender('forecast'),900);return}
    const kpFeed=window.__nrFutureKp&&window.__nrFutureKp.kp?window.__nrFutureKp.kp:{};
    function chart(target,count){
      const box=document.getElementById(target);if(!box)return;
      const rows=data.slice(0,count);if(!rows.length){box.textContent='Немає даних для canonical resolver';return}
      const mobileChart=matchMedia('(max-width:700px)').matches;
      const W=mobileChart?390:1000,H=mobileChart?240:180,L=mobileChart?92:126,R=mobileChart?18:58,T=mobileChart?34:28,B=mobileChart?42:34,min=-3,max=3;
      const x=i=>L+(rows.length===1?0:(W-L-R)*i/(rows.length-1));
      const y=v=>T+(max-Math.max(min,Math.min(max,Number(v))))*(H-T-B)/(max-min);
      const actionEligible=count<=7;
      const layers=rows.map(d=>actionEligible?operationalForDate(d):contextForDate(d));
      const rawRuns=[];let rawCurrent=[];layers.forEach((d,i)=>{if(Number.isFinite(d.raw)){rawCurrent.push({i,value:d.raw})}else if(rawCurrent.length){rawRuns.push(rawCurrent);rawCurrent=[]}});if(rawCurrent.length)rawRuns.push(rawCurrent);
      const rawLines=rawRuns.filter(run=>run.length>1).map(run=>`<polyline class="nr-chart-context-line" points="${run.map(p=>`${x(p.i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')}"/>`).join('');
      const authorityRuns=[];let current=[];if(actionEligible){layers.forEach((d,i)=>{if(d.presentation.available){current.push({i,score:d.decisionScore})}else if(current.length){authorityRuns.push(current);current=[]}});if(current.length)authorityRuns.push(current)}
      const authorityLines=authorityRuns.filter(run=>run.length>1).map(run=>`<polyline class="nr-chart-authority-line" points="${run.map(p=>`${x(p.i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ')}"/>`).join('');
      const tickLabel={3:'ДІЯТИ',0:'ПЕРЕВІРИТИ','-3':'ВІДКЛАСТИ'};
      const ticks=[-3,0,3].map(v=>`<line class="${v===0?'nr-chart-zero':'nr-chart-grid'}" x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}"/><text class="nr-chart-label" x="2" y="${y(v)+5}">${tickLabel[v]}</text>`).join('');
      const step=Math.max(1,Math.ceil(rows.length/7));
      const labels=rows.map((d,i)=>(i%step===0||i===rows.length-1)?`<text class="nr-chart-label" x="${x(i)}" y="${H-16}" text-anchor="middle">${d.ds.slice(5).replace('-','.')}</text>`:'').join('');
      const contextDots=layers.map((d,i)=>Number.isFinite(d.raw)?`<circle class="nr-chart-context-dot" cx="${x(i)}" cy="${y(d.raw)}" r="${rows.length>12?2.4:3}"/>`:'').join('');
      const actionDots=actionEligible?layers.map((d,i)=>{const p=d.presentation,cy=p.available?y(p.bucket==='act'?3:p.bucket==='hold'?-3:0):y(0),r=mobileChart?11:7,symbolOffset=mobileChart?5.5:4.5;return `<circle class="nr-chart-action-dot ${p.className}" cx="${x(i)}" cy="${cy}" r="${r}"/><text class="nr-chart-action-symbol ${p.className}" x="${x(i)}" y="${cy+symbolOffset}" text-anchor="middle">${p.symbol}</text>`}).join(''):'';
      const pdfMarkers=layers.map((d,i)=>{if(!d.expert)return'';const cx=x(i),cy=y(d.expert.score),size=mobileChart?(rows.length>12?4.5:6):(rows.length>12?3.5:4.5);return `<rect class="nr-chart-pdf-marker" x="${cx-size}" y="${cy-size}" width="${size*2}" height="${size*2}" transform="rotate(45 ${cx} ${cy})"/>`}).join('');
      const scenarioDots=layers.map((d,i)=>d.scenario&&Number.isFinite(d.raw)?`<circle class="nr-chart-scenario-dot" cx="${x(i)}" cy="${y(d.raw)}" r="${mobileChart?(rows.length>12?5:7):(rows.length>12?4:5)}"/>`:'').join('');
      const accessibleLabel=actionEligible
        ?`Горизонт ${count} днів: канонічна порада дня. Точки розташовані в рядках Діяти, Перевірити або Відкласти. Сіре тире означає відсутність рішення. Джерела та числові значення доступні в таблиці після графіка.`
        :`Горизонт 27 днів — лише контекст, без порад на дію. Золоті ромби — звірене рішення з PDF. Бірюзова лінія — поточний фон G. Сірий контур — резервний сценарій. Дати підписані тижневими кроками; повна таблиця одразу після графіка.`;
      const contextCalendar=actionEligible?'':`<div class="nr-context-calendar" aria-label="Календар доступності даних на 27 днів">${layers.map((d,i)=>`<div class="nr-context-day${d.expert?' has-source':''}" aria-label="${escapeHtml(rows[i].ds)}: ${d.expert?'є звірене довідкове джерело':'лише контекст без поради'}"><b>${escapeHtml(rows[i].ds.slice(8,10)+'.'+rows[i].ds.slice(5,7))}</b><span>${d.expert?'◆ джерело':'◇ контекст'}</span></div>`).join('')}</div>`;
      box.className='';box.innerHTML=`${actionEligible?'':'<div class="nr-context-boundary" role="note"><strong>27 ДНІВ · КАЛЕНДАР ДАНИХ, НЕ ПРОГНОЗ</strong><br>Після 7-го дня порад на дію немає. Календар нижче показує лише наявність контексту та звірених джерел.</div>'+contextCalendar}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${accessibleLabel}">${ticks}${rawLines}${authorityLines}${contextDots}${scenarioDots}${pdfMarkers}${actionDots}${labels}</svg>`;
      let details=box.parentElement.querySelector('.nr-chart-data');if(!details){details=document.createElement('details');details.className='nr-chart-data';details.innerHTML='<summary>Таблиця значень і статусів</summary><div></div>';box.insertAdjacentElement('afterend',details)}
      const tableRows=rows.map((d,i)=>{const layer=layers[i],raw=layer.rawValue,bounded=Number.isFinite(raw)&&Number.isFinite(layer.raw)&&Math.abs(raw-layer.raw)>.001,contextStatus=layer.official?'■ Офіційний контекст NOAA':layer.scenario?'○ Резервний Kp-сценарій':!actionEligible?'◇ 27-денний контекст':d._missing?'— Поточний G відсутній':'— Kp-контекст не підтверджено',p=layer.presentation,action=actionEligible?`<span class="state-pill ${p.className}">${p.symbol} ${escapeHtml(p.label)}${p.available?` · ${layer.decisionScore>=0?'+':''}${layer.decisionScore.toFixed(0)}`:''}</span>`:'◇ Порада на дію не надається',pdf=layer.expert?`◆ ${layer.expert.score>=0?'+':''}${layer.expert.score.toFixed(0)} · джерело PDF звірено`:'— рішення з PDF немає',rawText=Number.isFinite(layer.raw)?`${layer.raw>=0?'+':''}${layer.raw.toFixed(1)}${bounded?`* (точне ${raw>=0?'+':''}${raw.toFixed(1)})`:''}`:'—';return `<tr data-ds="${escapeHtml(d.ds)}" data-calendar-offset="${d._calendarOffset}" data-action-eligible="${actionEligible}"><td>${escapeHtml(d.ds)}</td><td>${action}</td><td>${pdf}</td><td>${rawText}</td><td>${contextStatus}</td></tr>`}).join('');
      details.querySelector('div').innerHTML=`<table class="nr-chart-table"><caption class="nr-sr-only">Таблична альтернатива графіку ${count} днів: ${actionEligible?'канонічна порада, ':''}рішення з PDF, поточний G і статус контексту</caption><thead><tr><th scope="col">Дата</th><th scope="col">${actionEligible?'Порада дня':'Порада на дію'}</th><th scope="col">Рішення з PDF</th><th scope="col">Поточний G · контекст</th><th scope="col">Статус контексту</th></tr></thead><tbody>${tableRows}</tbody></table><p class="nr-balance-copy">${actionEligible?'Колір поради походить лише з канонічного рішення дня. ':'27-денний горизонт не надає порад на дію. '}Рішення з PDF, поточний G і резервний сценарій не додаються та не усереднюються як голоси. * Значення за межами −3…+3 показано на межі, точне число збережено в дужках.</p>`;
    }
    chart('nrChart3',3);chart('nrChart7',7);chart('nrChart27',27);
    const provenance=data.slice(0,7).map(d=>{const x=kpFeed[d.ds]||{};const official=x.kp_synthetic===false&&/^NOAA_/.test(String(x.source||''));const scenario=x.kp_synthetic===true||x.source==='synthetic_fallback';return{ds:d.ds,official,scenario,missing:!official&&!scenario}});
    const officialCount=provenance.filter(x=>x.official).length,scenarioCount=provenance.filter(x=>x.scenario).length,missingCount=provenance.filter(x=>x.missing).length;
    const resolved=data.slice(0,7).map(operationalForDate),available3=resolved.slice(0,3).filter(d=>d.presentation.available).length,available7=resolved.filter(d=>d.presentation.available).length,verified3=resolved.slice(0,3).filter(d=>!!d.expert).length,verified7=resolved.filter(d=>!!d.expert).length,verified27=data.map(contextForDate).filter(d=>!!d.expert).length;
    const s3=document.getElementById('nrStatus3'),s7=document.getElementById('nrStatus7'),s27=document.getElementById('nrStatus27');
    if(s3)s3.textContent=`${available3}/3 дні мають пораду`;
    if(s7)s7.textContent=`${available7}/7 днів мають пораду`;
    if(s27)s27.textContent=`${verified27}/27 днів мають джерело`;
    const week=resolved.slice(0,7),counts={act:0,check:0,hold:0,none:0};week.forEach(d=>{counts[d.presentation.bucket]=(counts[d.presentation.bucket]||0)+1});
    const score=document.getElementById('nrBalanceScore'),copy=document.getElementById('nrBalanceCopy'),balanceLabel=document.querySelector('.nr-balance-card .nr-chip');
    if(balanceLabel)balanceLabel.textContent='НАЙБЛИЖЧІ 7 ДНІВ';
    if(score)score.textContent=`7 днів · ${available7} ${available7===1?'рішення':'рішень'}`;
    const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=String(value)};set('nrCountAct',counts.act);set('nrCountCheck',counts.check);set('nrCountHold',counts.hold);set('nrCountNone',counts.none);
    const first=week[0]?.presentation,nextChange=week.find((d,i)=>i>0&&(d.presentation.opKey!==first?.opKey||d.presentation.available!==first?.available));
    set('nrNextChange',nextChange?`Найближча зміна: ${nextChange.ds.slice(8,10)}.${nextChange.ds.slice(5,7)} · ${nextChange.presentation.label}`:'Найближча зміна: у межах 7 днів не виявлена');
    const scenarioDates=provenance.filter(x=>x.scenario).map(x=>x.ds.slice(8,10)+'.'+x.ds.slice(5,7)).join(', ');
    if(copy)copy.textContent=`За найближчі сім днів: ${counts.act} діяти · ${counts.check} перевірити · ${counts.hold} відкласти · ${counts.none} без рішення. Джерела не додаються як окремі голоси.`;
    set('nrPdfCoverage',`Довідкове джерело звірено: ${verified27}/27 календарних дат`);
    set('nrPredictiveBoundary','Прогнозну точність ще не підтверджено');
    set('nrContextBoundary','Фонові та сценарні дані: контекст, не команда');
    _productQueue.renderOrDefer('cover');
  }
  const FP463_CANONICAL_SNAPSHOT_KEY='nr_canonical_snapshot_fp463_v1';
  function saveCanonicalSnapshot(date,signal,presentation){
    if(!currentKpAuthority().usable||!presentation?.available||!['favorable','good','neutral','unstable','tense'].includes(String(signal?.opKey||''))||!Number.isFinite(Number(signal?.decisionScore)))return null;
    const snapshot={schema:'fp463-canonical-snapshot-v2',date,opKey:String(signal.opKey),decisionScore:Number(signal.decisionScore),guard:String(signal.guard||'none'),dynamicGuard:String(signal.dynamicGuard||''),actionPolicy:String(signal.actionPolicy||''),presentation:{available:true,opKey:presentation.opKey,bucket:presentation.bucket,className:presentation.className,coverState:presentation.coverState,symbol:presentation.symbol,label:presentation.label,title:presentation.title,summary:presentation.summary,do:presentation.do,avoid:presentation.avoid},resolved_at:new Date().toISOString(),expires_at:new Date(Math.min(Date.now()+3*3600000,currentKpAuthority().expiresAt)).toISOString()};
    try{localStorage.setItem(FP463_CANONICAL_SNAPSHOT_KEY,JSON.stringify(snapshot));return snapshot}catch(_e){window.NRDiagnostics.record('storage.snapshot_write','recoverable',_e);return null}
  }
  function loadCanonicalSnapshot(date){
    try{
      const snapshot=JSON.parse(localStorage.getItem(FP463_CANONICAL_SNAPSHOT_KEY)||'null'),p=snapshot?.presentation;
      const valid=snapshot?.schema==='fp463-canonical-snapshot-v2'&&snapshot.date===date&&['favorable','good','neutral','unstable','tense'].includes(snapshot.opKey)&&Number.isFinite(Number(snapshot.decisionScore))&&p?.available===true&&p.opKey===snapshot.opKey&&['act','check','hold'].includes(p.bucket)&&['state-act','state-check','state-caution','state-hold'].includes(p.className)&&['act','check','caution','hold'].includes(p.coverState)&&['✓','!','×'].includes(p.symbol)&&typeof snapshot.resolved_at==='string'&&Number.isFinite(Date.parse(snapshot.resolved_at))&&Date.parse(snapshot.resolved_at)<=Date.now()&&Date.now()-Date.parse(snapshot.resolved_at)<=3*3600000&&Number.isFinite(Date.parse(snapshot.expires_at))&&Date.now()<=Date.parse(snapshot.expires_at);
      return valid?snapshot:null;
    }catch(_e){window.NRDiagnostics.record('storage.snapshot_read','recoverable',_e);return null}
  }
  window.fp455LoadCanonicalSnapshot=loadCanonicalSnapshot;
  window.fp456LoadCanonicalSnapshot=loadCanonicalSnapshot;
  window.fp457LoadCanonicalSnapshot=loadCanonicalSnapshot;
  window.fp463LoadCanonicalSnapshot=loadCanonicalSnapshot;
  function renderCompetitiveCover(){
    const cover=document.getElementById('nrCover');if(!cover)return;
    const text=id=>document.getElementById(id)?.textContent?.replace(/\s+/g,' ').trim()||'';
    const ui=window.__uiState||{};
    const offline=offlineAuthorityMode();
    const g=offline?NaN:(Number.isFinite(_finiteFormulaNumber(ui.gNow))?_finiteFormulaNumber(ui.gNow):NaN);
    const kp=offline?NaN:currentKpAuthority().kp;
    const date=todayKey(),registryRow=Array.isArray(window._expertDecisionRegistry?.rows)?window._expertDecisionRegistry.rows.find(r=>r.date===date):null;
    const canonical=canonicalForDate({ds:date,G:g,_calendarOffset:0});
    const daySignal=canonical.signal,presentation=canonical.presentation,snapshot=canonical.snapshot;
    const scoreBase=presentation.available?Number(daySignal.decisionScore):NaN;
    const title=presentation.title,summary=presentation.summary;
    const eclipseFromRegistry=/затемнен/i.test(String(registryRow?.headline_text||''));
    const doTxt=presentation.do;
    const avoidTxt=eclipseFromRegistry&&presentation.bucket!=='hold'?`${presentation.avoid} Період впливу затемнення: без форсування ключових рішень.`:presentation.avoid;
    const shift=offline?'—':(text('heroNextShiftChip').replace(/^.*?(?=\d{1,2}[:.]\d{2}|—)/,'')||'—');
    const freshRaw=text('freshnessBadge').replace(/^●\s*Kp\s*/i,'')||'СТАН ДАНИХ —';
    const freshStatus=nrDataStatusLabel(window.__nrSystemHealth,freshRaw,offline);
    const fresh=freshStatus.label;
    const freshnessNode=document.getElementById('nrCoverFresh');
    if(freshnessNode){freshnessNode.dataset.state=freshStatus.state;freshnessNode.title='Статус оновлення джерел; не підтвердження точності прогнозу. Подробиці — у розділі «Дані та походження».'}
    const set=(id,value)=>{const n=document.getElementById(id);if(n)n.textContent=value};
    const liveChip=document.getElementById('nrCoverLiveG')?.parentElement;if(liveChip?.firstChild)liveChip.firstChild.nodeValue='ПОТОЧНИЙ ФОН · G ';
    set('nrCoverDate',window.NRPresentation.dateFormatter('uk-UA',{timeZone:'Europe/Kyiv',weekday:'long',day:'numeric',month:'long'}).format(new Date()));
    set('nrCoverFresh',fresh);set('nrCoverKicker',`СЬОГОДНІ · ${presentation.label.toUpperCase()}`);set('nrCoverTitle',title);set('nrCoverSummary',summary);set('nrCoverDo',doTxt);set('nrCoverAvoid',avoidTxt);
    cover.dataset.advisory=presentation.coverState;
    // Keep every current-day consumer on this same render, including when
    // asynchronous data arrives while another route is open. Do not reset forms.
    renderPlanResult();renderMatchResult();renderDailyReport();
    const balance=document.querySelector('#nrAuthorityBalance span');if(balance){const pdf=_strictDayScore(registryRow?.decision_score),eng=_strictDayScore(registryRow?.engine_score),cal=_finiteFormulaNumber(registryRow?.calendar_score_context),decision=_finiteFormulaNumber(daySignal?.decisionScore);balance.textContent=`Канонічне рішення: ${presentation.available?`${presentation.opKey} · бал ${decision>=0?'+':''}${decision.toFixed(0)} · ${presentation.label}`:'недоступне'}${daySignal?.guard&&daySignal.guard!=='none'?` · обмеження ${daySignal.guard}`:''}${daySignal?.dynamicGuard?` · запобіжник ${daySignal.dynamicGuard}`:''}${offline&&snapshot?` · збережено ${snapshot.resolved_at}`:''}. Довідковий PDF ${Number.isFinite(pdf)?(pdf>=0?'+':'')+pdf:'—'}, Engine ${Number.isFinite(eng)?(eng>=0?'+':'')+eng:'—'}, календарний контекст ${Number.isFinite(cal)?(cal>=0?'+':'')+cal:'—'} і поточний G показані окремо та безпосередньо не визначають колір поради.`}
    const eclipse=document.getElementById('nrEclipseContext');let mi=null;try{mi=typeof computeMiFromEclipses==='function'?computeMiFromEclipses(new Date(todayKey()+'T12:00:00Z')):null}catch(_e){ window.NRDiagnostics?.record('legacy.catch.259','recoverable'); }const eclipseActive=Number(mi?.Mi)<0||eclipseFromRegistry;if(eclipse){eclipse.classList.toggle('is-visible',eclipseActive);if(eclipseActive){set('nrEclipseTitle','ПЕРІОД ВПЛИВУ ЗАТЕМНЕННЯ');set('nrEclipseCopy',`${mi&&Number.isFinite(Number(mi.Mi))?'Mᵢ '+(Number(mi.Mi)>=0?'+':'')+Number(mi.Mi)+' · ':''}вже враховано у денному G. Спокійний темп, без форсування ключових рішень.`)}}
    set('nrCoverScore',presentation.symbol);set('nrCoverDecisionScore',Number.isFinite(scoreBase)?(scoreBase>=0?'+':'')+scoreBase.toFixed(0):'—');set('nrCoverKp',Number.isFinite(kp)?kp.toFixed(1):'—');set('nrCoverShift',shift);set('nrScoreHelper',presentation.available?`${presentation.label} · ${offline?'збережене рішення':'стан на зараз'}`:'Немає підтвердженого рішення');
    const scoreLabel=cover.querySelector('.nr-score-label');if(scoreLabel)scoreLabel.textContent='ОЦІНКА МОДЕЛІ';
    const scoreOrbit=document.getElementById('nrScoreOrbit');if(scoreOrbit)scoreOrbit.setAttribute('aria-label',`${presentation.label}. ${presentation.available?presentation.title:'Рішення недоступне'}`);
    set('nrCoverLiveG',Number.isFinite(g)?(g>=0?'+':'')+g.toFixed(1):'—');
    const orbit=document.getElementById('nrScoreOrbit');if(orbit){orbit.style.setProperty('--nr-score-angle',(presentation.available?300:0)+'deg');orbit.classList.toggle('nr-score-pending',!presentation.available)}
    const source=(typeof _27dComputed!=='undefined'&&Array.isArray(_27dComputed))?_27dComputed:[],data=buildCalendarFrame(source,date,27);
    if(!source.length){set('nrCover3','Дані ще завантажуються');set('nrCover7','Дані ще завантажуються');set('nrCover27','Дані ще завантажуються');setTimeout(()=>requestProductRender('cover'),900);return}
    const describe=n=>{const a=data.slice(0,n).map(operationalForDate);if(!a.length)return 'Дані ще завантажуються';const counts={act:0,check:0,hold:0,none:0};a.forEach(d=>counts[d.presentation.bucket]++);return `${counts.act} діяти · ${counts.check} перевірити · ${counts.hold} відкласти${counts.none?` · ${counts.none} без рішення`:''}`};
    set('nrCover3',describe(3));set('nrCover7',describe(7));set('nrCover27','Довгий огляд · без порад на дію');
  }
  function init(){
    buildShell();let saved='today';try{saved=localStorage.getItem('fp434_route')||'today'}catch(_e){ window.NRDiagnostics?.record('legacy.catch.260','recoverable'); }
    document.querySelector('#nrRoute-forecast .nr-forecast-tabs')?.addEventListener('keydown',event=>{const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]')],current=tabs.indexOf(document.activeElement);if(current<0)return;let next=current;if(event.key==='ArrowRight')next=(current+1)%tabs.length;else if(event.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus();tabs[next].click()});
    const push=new URLSearchParams(location.search).get('push');if(push)saved=push==='storm'?'expert':'today';
    fp434Go(saved,false);
  }
  window.renderCompetitiveCover=renderCompetitiveCover;
  window.addEventListener('engine-data-stale',()=>{renderCompetitiveCover()});
  window.addEventListener('online',()=>{window.__nrOfflineFallback=false;renderCompetitiveCover()});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(init,180),{once:true});
  window.addEventListener('hashchange',()=>{const r=location.hash.replace('#','');if(ROUTES.includes(r))fp434Go(r,true)});
  window.addEventListener('gindex:data-ready',()=>requestProductRender('forecast','calendar','cover','independent'));
})();
