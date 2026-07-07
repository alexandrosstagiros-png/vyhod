/* ═══════════════════════════════════════════════════════
   ВЫХОД — платформа гарантированных рейсов
   Демо-прототип: диспетчерская · водитель · заказчик
   ═══════════════════════════════════════════════════════ */

'use strict';

const BRAND = {
  name: 'ВЫХОД',
  tag: 'каждый рейс выходит — или платим мы',
};

/* ── Справочники ───────────────────────────────────────── */

const CLIENTS = {
  metro:  { name: 'МЕТРО',         color: '#003d8f', letter: 'M', standards: ['Терморежим 2–4 °C', 'Работа с тарой'] },
  danone: { name: 'Данон',         color: '#00579d', letter: 'Д', standards: ['Холодовая цепь', 'Пломбы'] },
  azbuka: { name: 'Азбука вкуса',  color: '#1c8a44', letter: 'А', standards: ['Вежливость с покупателем', 'Форма и бейдж'] },
  perek:  { name: 'Перекрёсток',   color: '#0e9448', letter: 'П', standards: ['Работа с тарой'] },
};

const DIFF = {
  1: { label: 'Лёгкий',   cls: 'diff-1', trail: 'зелёная трасса' },
  2: { label: 'Стандарт', cls: 'diff-2', trail: 'синяя трасса' },
  3: { label: 'Сложный',  cls: 'diff-3', trail: 'чёрная трасса' },
};

const LEVELS = ['', 'Стажёр', 'Прикатка', 'Городской', 'Профи', 'Наставник'];

/* ── Состояние ─────────────────────────────────────────── */

const state = {
  clockMin: 5 * 60 + 12, // 05:12
  view: 'dispatch',
  simDone: false,
  simRunning: false,
  driverTomorrow: null,   // null | 'yes' | 'no'
  driverMood: null,
  drawerTripId: null,
  modalTripId: null,
  savedByReserve: { metro: 3, danone: 1, azbuka: 0, perek: 1 },

  trips: [
    {
      id: 'm12', time: '05:30', clientKey: 'metro', route: 'М-12 · Сокольники, 8 точек', points: 8, diff: 2,
      driver: 'Смирнов Андрей', level: 3, rating: 98.6, streak: 12,
      chain: { even: 'done', morn: 'done', dep: 'wait', load: 'idle' },
      risk: 8, replaced: null,
      factors: [
        { t: 'Вся цепочка вовремя, «Выезжаю» ожидается к 05:20', w: '−20', kind: 'pos' },
        { t: 'Стрик: 12 безупречных рейсов подряд', w: '−15', kind: 'pos' },
      ],
    },
    {
      id: 'd3', time: '06:00', clientKey: 'danone', route: 'Д-3 · Холодовая цепь, 5 точек', points: 5, diff: 3,
      driver: 'Кузнецов Олег', level: 4, rating: 97.1, streak: 6,
      chain: { even: 'done', morn: 'wait', dep: 'idle', load: 'idle' },
      risk: 34, replaced: null,
      factors: [
        { t: 'Ещё не отметил «Я встал» — обычно делает это к 05:20', w: '+22', kind: 'warn' },
        { t: 'Вечернее подтверждение — вовремя', w: '−10', kind: 'pos' },
        { t: 'Рейтинг выхода 97,1% за 90 дней', w: '−12', kind: 'pos' },
      ],
    },
    {
      id: 'm14', time: '06:00', clientKey: 'metro', route: 'М-14 · МКАД-Юг, 6 точек', points: 6, diff: 2,
      driver: 'Волков Пётр', level: 3, rating: 91.4, streak: 0,
      chain: { even: 'fail', morn: 'wait', dep: 'idle', load: 'idle' },
      risk: 78, replaced: null,
      factors: [
        { t: 'Не подтвердил вечером — единственный из смены', w: '+35', kind: 'neg' },
        { t: 'Зарплата была вчера', w: '+20', kind: 'neg' },
        { t: 'Понедельник: исторически +12% к невыходам', w: '+10', kind: 'warn' },
        { t: '2 поздних подтверждения за последние 7 дней', w: '+13', kind: 'warn' },
        { t: 'Знает маршрут: 4 месяца на М-14', w: '−8', kind: 'pos' },
      ],
    },
    {
      id: 'av2', time: '06:30', clientKey: 'azbuka', route: 'АВ-2 · Центр, 4 точки', points: 4, diff: 3,
      driver: 'Орлова Марина', level: 4, rating: 99.2, streak: 21,
      chain: { even: 'done', morn: 'done', dep: 'idle', load: 'idle' },
      risk: 6, replaced: null,
      factors: [
        { t: 'Подтвердила «Я встал» в 05:07 — раньше обычного', w: '−18', kind: 'pos' },
        { t: 'Допуск «стандарт Азбуки»: вежливость, форма', w: '−10', kind: 'pos' },
      ],
    },
    {
      id: 'p8', time: '07:00', clientKey: 'perek', route: 'П-8 · Восток, 5 точек', points: 5, diff: 1,
      driver: 'Гаджиев Руслан', level: 1, rating: 100, streak: 2,
      chain: { even: 'done', morn: 'wait', dep: 'idle', load: 'idle' },
      risk: 28, replaced: null,
      factors: [
        { t: 'Стажёр: всего 3-й рейс на платформе', w: '+25', kind: 'warn' },
        { t: 'Маршрут зелёной категории — подобран по уровню', w: '−10', kind: 'pos' },
        { t: 'Наставник Тихонов на связи, созвон в 05:25', w: '−8', kind: 'pos' },
      ],
    },
    {
      id: 'd7', time: '07:30', clientKey: 'danone', route: 'Д-7 · Запад, 6 точек', points: 6, diff: 2,
      driver: 'Белов Игорь', level: 4, rating: 98.0, streak: 9,
      chain: { even: 'done', morn: 'idle', dep: 'idle', load: 'idle' },
      risk: 12, replaced: null,
      factors: [
        { t: 'Погрузка в 07:30 — утренний чек-ин ожидается к 06:10', w: '', kind: 'pos' },
        { t: 'Рейтинг выхода 98,0%', w: '−12', kind: 'pos' },
      ],
    },
    {
      id: 'm2', time: '08:00', clientKey: 'metro', route: 'М-2 · Север, 7 точек', points: 7, diff: 1,
      driver: 'Тихонов Сергей', level: 5, rating: 99.7, streak: 34,
      chain: { even: 'done', morn: 'idle', dep: 'idle', load: 'idle' },
      risk: 4, replaced: null,
      factors: [
        { t: 'Наставник, 34 безупречных рейса подряд', w: '−25', kind: 'pos' },
      ],
    },
  ],

  standby: [
    { id: 's1', name: 'Гусев Степан',  g: 'm', level: 4, rating: 98.9, streak: 17, since: '05:00', knows: ['metro', 'danone'], note: 'терморежим, тара', busy: false },
    { id: 's2', name: 'Ахмедов Рамиль', g: 'm', level: 3, rating: 97.4, streak: 8, since: '05:30', knows: ['perek'], note: 'восточные маршруты', busy: false },
    { id: 's3', name: 'Климова Елена', g: 'f', level: 4, rating: 99.1, streak: 19, since: '06:00', knows: ['danone'], note: 'холодовая цепь', busy: false },
    { id: 's4', name: 'Барсуков Иван', g: 'm', level: 3, rating: 96.8, streak: 5, since: '06:00', knows: ['metro', 'azbuka'], note: 'центр города', busy: false },
  ],

  events: [
    { time: '05:10', text: 'Автопуш Кузнецову: напоминание «Я встал» (обычное время 05:20)', kind: '' },
    { time: '05:07', text: 'Орлова подтвердила «Я встал» — рейс АВ-2 зелёный', kind: 'ok' },
    { time: '05:02', text: 'Смирнов подтвердил «Я встал» — рейс М-12 зелёный', kind: 'ok' },
    { time: '04:58', text: 'Ночной прогноз готов: 4 рейса зелёные, 2 под наблюдением, 1 красный (Волков, М-14)', kind: 'warn' },
  ],

  route12Points: [
    { title: 'РЦ Белая Дача — погрузка', reqs: ['пломба', 'температура: фото'], done: true },
    { title: 'МЕТРО Сокольники', reqs: ['тара: сдать 8 паллет', 'термо 2–4 °C'], done: false },
    { title: 'МЕТРО Преображенка', reqs: ['тара: забрать 4 паллеты'], done: false },
    { title: 'МЕТРО Гольяново', reqs: ['термо: фото при выгрузке'], done: false },
  ],
};

/* ── Утилиты ───────────────────────────────────────────── */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtClock(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function nowStr() { return fmtClock(state.clockMin); }

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function fem(x) { return x && x.g === 'f'; }

function riskBand(r) { return r >= 60 ? 'high' : r >= 25 ? 'mid' : 'low'; }

function riskLabel(r) { return r >= 60 ? 'Высокий' : r >= 25 ? 'Средний' : 'Низкий'; }

function tripDone(t) { return t.chain.load === 'done'; }

function addEvent(text, kind = '') {
  state.events.unshift({ time: nowStr(), text, kind });
  state.events = state.events.slice(0, 40);
}

function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = esc(text);
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 4200);
  setTimeout(() => el.remove(), 4700);
}

/* ── Рендер: общее ─────────────────────────────────────── */

function renderAll() {
  $('#clock').textContent = nowStr();
  renderDispatch();
  renderDriver();
  renderClient();
  if (state.drawerTripId) renderDrawer(state.drawerTripId);
  if (state.modalTripId) {
    const t = state.trips.find((x) => x.id === state.modalTripId);
    if (!t || t.replaced || tripDone(t)) {
      closeModal();
      toast('Замена уже назначена — модалка резерва закрыта');
    } else {
      openReserveModal(state.modalTripId);
    }
  }
}

/* ── Рендер: диспетчерская ─────────────────────────────── */

function renderDispatch() {
  const trips = state.trips;
  const green = trips.filter((t) => riskBand(t.risk) === 'low').length;
  const mid = trips.filter((t) => riskBand(t.risk) === 'mid').length;
  const high = trips.filter((t) => riskBand(t.risk) === 'high').length;
  const freeStandby = state.standby.filter((s) => !s.busy).length;

  $('#dispatchKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">Рейсы сегодня</div><div class="kpi-value">${trips.length}</div><div class="kpi-sub">погрузки 05:30–09:00</div></div>
    <div class="kpi"><div class="kpi-label">Зелёные — едут сами</div><div class="kpi-value ok">${green}</div><div class="kpi-sub">вмешательство не нужно</div></div>
    <div class="kpi"><div class="kpi-label">Под наблюдением</div><div class="kpi-value ${mid ? 'warn' : ''}">${mid}</div><div class="kpi-sub">цепочка дозревает</div></div>
    <div class="kpi"><div class="kpi-label">Красные</div><div class="kpi-value ${high ? 'danger' : 'ok'}">${high}</div><div class="kpi-sub">${high ? 'плейбук запущен' : 'угроз нет'}</div></div>
    <div class="kpi"><div class="kpi-label">Горячий резерв</div><div class="kpi-value">${freeStandby}</div><div class="kpi-sub">дежурство оплачено</div></div>`;

  const sorted = [...trips].sort((a, b) => (tripDone(a) - tripDone(b)) || (b.risk - a.risk));

  $('#tripList').innerHTML = sorted.map((t) => {
    const c = CLIENTS[t.clientKey];
    const band = riskBand(t.risk);
    const rowCls = tripDone(t) ? 'done-row' : band === 'high' ? 'risk-high' : band === 'mid' ? 'risk-mid' : '';
    const pillCls = band === 'high' ? 'risk-high-pill' : band === 'mid' ? 'risk-mid-pill' : 'risk-low';
    const driverName = t.replaced
      ? `${esc(t.replaced.name)} <span class="swap">ПОДМЕНА</span>`
      : esc(t.driver);
    const driverMeta = t.replaced
      ? `вместо: ${esc(t.driver)}`
      : `${LEVELS[t.level]} · рейтинг ${String(t.rating).replace('.', ',')}%`;
    return `
    <div class="trip-row ${rowCls}" data-trip="${t.id}">
      <div class="trip-time">${t.time}<small>погрузка</small></div>
      <div class="trip-client">
        <div class="client-chip" style="background:${c.color}">${c.letter}</div>
        <div class="trip-route">
          <div class="trip-route-name">${esc(t.route)}</div>
          <div class="trip-route-meta">${esc(c.name)} <span class="diff-badge ${DIFF[t.diff].cls}">${DIFF[t.diff].label}</span></div>
        </div>
      </div>
      <div class="trip-driver">
        <div class="trip-driver-name">${driverName}</div>
        <div class="trip-driver-meta">${driverMeta}</div>
      </div>
      ${chainHtml(t)}
      <div><span class="risk-pill ${pillCls}"><span class="bar"><i style="width:${t.risk}%"></i></span>${t.risk}%</span></div>
      <div class="row-arrow">›</div>
    </div>`;
  }).join('');

  document.querySelectorAll('.trip-row').forEach((row) => {
    row.addEventListener('click', () => openDrawer(row.dataset.trip));
  });

  const free = state.standby.filter((s) => !s.busy);
  const sc = $('#standbyCount');
  sc.textContent = free.length ? `${free.length} ${plural(free.length, 'готов', 'готовы', 'готовы')}` : 'резерв исчерпан';
  sc.className = 'pill ' + (free.length === 0 ? 'pill-red' : free.length === 1 ? 'pill-amber' : 'pill-green');
  $('#standbyList').innerHTML = state.standby.map((s) => `
    <div class="standby-card ${s.busy ? 'busy' : ''}">
      <div class="avatar">${initials(s.name)}</div>
      <div class="standby-info">
        <div class="standby-name">${esc(s.name)}</div>
        <div class="standby-meta">${LEVELS[s.level]} · ${esc(s.note)} · с ${s.since}</div>
      </div>
      ${s.busy ? '<span class="pill pill-blue">в рейсе</span>' : `<span class="pill pill-green">${fem(s) ? 'готова' : 'готов'}</span>`}
    </div>`).join('') + (free.length ? '' : `
    <div class="factor warn"><b>!</b><span>Свободных нет — эскалация бригадиру, подбор подмены из соседней смены</span></div>`);

  $('#eventFeed').innerHTML = state.events.map((e) => `
    <div class="event-item ev-${e.kind}">
      <span class="ev-time">${e.time}</span>
      <span>${esc(e.text)}</span>
    </div>`).join('');

  const btn = $('#simBtn');
  if (state.simDone) { btn.textContent = '↺ Прожить заново'; btn.disabled = false; btn.title = 'Сбросит демо и начнёт утро заново'; }
  else if (state.simRunning) { btn.textContent = '⏱ Утро идёт…'; btn.disabled = true; }
  else { btn.textContent = '▶  Прожить утро'; btn.disabled = false; }
}

function chainHtml(t) {
  const steps = [
    ['even', 'В', 'Вечернее «Выйду»'],
    ['morn', 'У', 'Утро: «Я встал»'],
    ['dep', 'Е', '«Выезжаю» + геометка'],
    ['load', 'П', 'На погрузке'],
  ];
  return `<div class="chain">${steps.map(([k, ch, tip]) => {
    const st = t.chain[k];
    const cls = st === 'done' ? 'done' : st === 'wait' ? 'wait' : st === 'fail' ? 'fail' : '';
    const mark = st === 'done' ? '✓' : st === 'fail' ? '✕' : ch;
    return `<span class="chain-step ${cls}" title="${tip}">${mark}</span>`;
  }).join('')}</div>`;
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}

/* ── Drawer: карточка рейса ────────────────────────────── */

function openDrawer(id) {
  state.drawerTripId = id;
  renderDrawer(id);
  $('#drawer').classList.add('open');
  $('#drawerOverlay').classList.add('open');
}

function closeDrawer() {
  state.drawerTripId = null;
  $('#drawer').classList.remove('open');
  $('#drawerOverlay').classList.remove('open');
}

function renderDrawer(id) {
  const t = state.trips.find((x) => x.id === id);
  if (!t) return;
  const c = CLIENTS[t.clientKey];
  const band = riskBand(t.risk);
  const pillCls = band === 'high' ? 'risk-high-pill' : band === 'mid' ? 'risk-mid-pill' : 'risk-low';

  $('#drawer').innerHTML = `
    <button class="drawer-close" id="drawerClose">✕</button>
    <h2>${esc(t.route)}</h2>
    <p class="panel-sub">${esc(c.name)} · погрузка ${t.time} · <span class="diff-badge ${DIFF[t.diff].cls}">${DIFF[t.diff].label}</span> <span class="muted-sub">(${DIFF[t.diff].trail})</span></p>

    <div class="drawer-section">
      <h4>Водитель</h4>
      <div class="kv"><span>На рейсе</span><span>${t.replaced ? esc(t.replaced.name) + ' (подмена)' : esc(t.driver)}</span></div>
      <div class="kv"><span>Уровень</span><span>${LEVELS[t.replaced ? t.replaced.level : t.level]}</span></div>
      <div class="kv"><span>Рейтинг выхода, 90 дней</span><span>${String((t.replaced || t).rating).replace('.', ',')}%</span></div>
      <div class="kv"><span>Стрик безупречных рейсов</span><span>${(t.replaced || t).streak}</span></div>
      <div class="kv"><span>Стандарты заказчика</span><span>${c.standards.join(' · ')}</span></div>
    </div>

    <div class="drawer-section">
      <h4>Риск срыва — <span class="risk-pill ${pillCls}" style="vertical-align:middle">${t.risk}% · ${riskLabel(t.risk)}</span></h4>
      ${t.factors.map((f) => `<div class="factor ${f.kind}"><b>${esc(f.w)}</b><span>${esc(f.t)}</span></div>`).join('')}
    </div>

    <div class="drawer-actions">
      ${!tripDone(t) && !t.replaced ? `
        <button class="btn btn-primary btn-block" id="actCall">📞 Позвонить водителю</button>
        <button class="btn btn-block" id="actPush">✉️ Автопуш-напоминание</button>
        <button class="btn ${band === 'high' ? 'btn-danger' : ''} btn-block" id="actReserve">🔥 Поднять резерв — замена за минуты</button>
      ` : `<div class="factor pos"><b>✓</b><span>${t.replaced ? 'Резерв назначен, заказчик видит статус «замена в пути»' : 'Рейс идёт по плану — вмешательство не требуется'}</span></div>`}
    </div>`;

  $('#drawerClose').addEventListener('click', closeDrawer);
  const call = $('#actCall');
  if (call) call.addEventListener('click', () => {
    t.risk = Math.max(4, t.risk - 15);
    addEvent(`Диспетчер позвонил: ${lastName(t.driver)} на связи, обещал подтвердить в приложении`, 'ok');
    toast('Звонок зафиксирован. Риск пересчитан.', 'ok');
    renderAll();
  });
  const push = $('#actPush');
  if (push) push.addEventListener('click', () => {
    t.risk = Math.max(4, t.risk - 5);
    addEvent(`Автопуш отправлен: ${lastName(t.driver)}, рейс ${t.route.split(' ·')[0]}`);
    toast('Пуш отправлен');
    renderAll();
  });
  const res = $('#actReserve');
  if (res) res.addEventListener('click', () => openReserveModal(t.id));
}

function lastName(full) { return full.split(' ')[0]; }

/* ── Модалка резерва ───────────────────────────────────── */

function openReserveModal(tripId) {
  state.modalTripId = tripId;
  const t = state.trips.find((x) => x.id === tripId);
  const free = state.standby.filter((s) => !s.busy);
  $('#modal').innerHTML = `
    <h3>Поднять резерв на ${esc(t.route.split(' ·')[0])}</h3>
    <p class="panel-sub">${esc(CLIENTS[t.clientKey].name)} · погрузка ${t.time}. Дежурство скамейки уже оплачено — замена бесплатна для заказчика.</p>
    ${free.length ? free.map((s) => {
      const match = s.knows.includes(t.clientKey);
      return `
      <button class="standby-pick" data-standby="${s.id}">
        <div class="avatar">${initials(s.name)}</div>
        <div>
          <div class="standby-name">${esc(s.name)}</div>
          <div class="standby-meta">${LEVELS[s.level]} · ${esc(s.note)} · ${fem(s) ? 'готова' : 'готов'} с ${s.since}</div>
        </div>
        <span class="pill ${match ? 'pill-green' : 'pill-neutral'} match-tag">${match ? 'допуск: ' + esc(CLIENTS[t.clientKey].name) : 'универсал'}</span>
      </button>`;
    }).join('') : '<p class="panel-sub">Свободного резерва нет — эскалация бригадиру.</p>'}
    <div style="margin-top:14px; text-align:right"><button class="btn" id="modalCancel">Отмена</button></div>`;

  $('#modalOverlay').classList.add('open');
  $('#modalCancel').addEventListener('click', closeModal);
  document.querySelectorAll('.standby-pick').forEach((b) => {
    b.addEventListener('click', () => replaceTrip(tripId, b.dataset.standby));
  });
}

function closeModal() {
  state.modalTripId = null;
  $('#modalOverlay').classList.remove('open');
}

function replaceTrip(tripId, standbyId) {
  const t = state.trips.find((x) => x.id === tripId);
  const s = state.standby.find((x) => x.id === standbyId);
  if (!t || t.replaced || tripDone(t)) {
    closeModal();
    toast('Замена уже назначена — повторная не требуется');
    renderAll();
    return;
  }
  if (!s) return;
  if (s.busy) {
    toast(`${s.name} уже в рейсе — список резерва обновлён`, 'danger');
    openReserveModal(tripId);
    return;
  }

  s.busy = true;
  t.replaced = { name: s.name, level: s.level, rating: s.rating, streak: s.streak, g: s.g };
  t.risk = 4;
  t.chain = { even: 'done', morn: 'done', dep: 'wait', load: 'idle' };
  t.factors = [
    { t: `Резерв ${s.name} назначен, дежурил${fem(s) ? 'а' : ''} с ${s.since}`, w: '✓', kind: 'pos' },
    { t: 'Заказчик видит статус «замена в пути» — пандус не будет пустым', w: '✓', kind: 'pos' },
  ];
  state.savedByReserve[t.clientKey] += 1;

  addEvent(`Резерв поднят: ${s.name} → ${t.route.split(' ·')[0]} (${CLIENTS[t.clientKey].name}). Замена в пути, заказчик не заметит.`, 'ok');
  toast(`${s.name} принял${fem(s) ? 'а' : ''} рейс. Расчётное время до погрузки — 24 мин.`, 'ok');
  closeModal();
  closeDrawer();
  renderAll();
}

/* ── Симуляция «Прожить утро» ──────────────────────────── */

const SIM_STEPS = [
  {
    at: 5 * 60 + 18,
    run() {
      const t = state.trips.find((x) => x.id === 'd3');
      if (t.replaced) return;
      t.chain.morn = 'done'; t.risk = 12;
      t.factors = [
        { t: 'Подтвердил «Я встал» в 05:18', w: '−22', kind: 'pos' },
        { t: 'Рейтинг выхода 97,1% за 90 дней', w: '−12', kind: 'pos' },
      ];
      addEvent('Кузнецов подтвердил «Я встал» — рейс Д-3 зелёный', 'ok');
    },
  },
  {
    at: 5 * 60 + 25,
    run() {
      const t = state.trips.find((x) => x.id === 'p8');
      if (t.replaced) return;
      t.chain.morn = 'done'; t.risk = 11;
      addEvent('Наставник Тихонов созвонился со стажёром Гаджиевым: маршрут разобран по точкам, настрой рабочий', 'ok');
    },
  },
  {
    at: 5 * 60 + 31,
    run() {
      const t = state.trips.find((x) => x.id === 'm14');
      if (t.replaced) return;
      t.risk = 91;
      t.factors.unshift({ t: 'Авто-обзвон: 2 звонка без ответа (05:26, 05:30)', w: '+18', kind: 'neg' });
      addEvent('Волков не отвечает на авто-обзвон. Риск 91%. Плейбук: рекомендован подъём резерва', 'danger');
      toast('⚠️ Волков (М-14) не выходит на связь — откройте рейс и поднимите резерв', 'danger');
    },
  },
  {
    at: 5 * 60 + 38,
    run() {
      const t = state.trips.find((x) => x.id === 'm14');
      if (t.replaced) return;
      const s = state.standby.find((x) => !x.busy && x.knows.includes('metro')) || state.standby.find((x) => !x.busy);
      if (!s) {
        addEvent('Свободного резерва нет — эскалация бригадиру: подбор подмены из соседней смены', 'danger');
        toast('Резерв исчерпан — эскалация бригадиру', 'danger');
        return;
      }
      addEvent('Диспетчер не вмешался за 7 минут — сработал авто-плейбук: резерв поднят без ручного решения', 'warn');
      replaceSilent(t, s);
    },
  },
  {
    at: 5 * 60 + 42,
    run() {
      const t = state.trips.find((x) => x.id === 'm12');
      if (t.chain.dep !== 'done') {
        t.chain.dep = 'done';
        const who = t.replaced ? t.replaced.name : 'Смирнов';
        addEvent(`${who} выехал${fem(t.replaced) ? 'а' : ''} — геометка подтверждена, до РЦ 18 минут`, 'ok');
      }
    },
  },
  {
    at: 5 * 60 + 47,
    run() {
      addEvent('Волков вышел на связь: «проспал». Внезапное молчание зафиксировано в паспорте надёжности, куратор назначил разбор', 'warn');
    },
  },
  {
    at: 5 * 60 + 55,
    run() {
      const t = state.trips.find((x) => x.id === 'm12');
      t.chain.load = 'done'; t.risk = 2;
      const who = t.replaced ? t.replaced.name : 'Смирнов';
      addEvent(`${who} на погрузке, РЦ Белая Дача — по графику`, 'ok');
    },
  },
  {
    at: 6 * 60 + 2,
    run() {
      const t = state.trips.find((x) => x.id === 'd3');
      t.chain.dep = 'done';
      const who = t.replaced ? t.replaced.name : 'Кузнецов';
      addEvent(`${who} выехал${fem(t.replaced) ? 'а' : ''} на Д-3 — холодовая цепь, рефрижератор охлаждён до 3,1 °C`, 'ok');
    },
  },
  {
    at: 6 * 60 + 8,
    run() {
      const t = state.trips.find((x) => x.id === 'm14');
      if (!t.replaced) return;
      t.chain.dep = 'done'; t.risk = 3;
      addEvent(`${t.replaced.name} выехал${fem(t.replaced) ? 'а' : ''} на М-14 — успевает к окну погрузки 06:00–06:30`, 'ok');
    },
  },
  {
    at: 6 * 60 + 15,
    run() {
      state.simDone = true;
      const total = state.trips.length;
      const failed = state.trips.filter((x) => riskBand(x.risk) === 'high' && !x.replaced).length;
      const out = total - failed;
      const saved = state.trips.filter((x) => x.replaced).length;
      if (failed === 0) {
        const savedTxt = saved ? ` ${saved} ${plural(saved, 'срыв закрыт', 'срыва закрыты', 'срывов закрыто')} резервом за минуты.` : '';
        addEvent(`Итог утра: ${out} из ${total} рейсов выходят. Срывов для заказчиков: 0.${savedTxt}`, 'ok');
        toast(`Утро прожито: ${out}/${total} рейсов вышли. Заказчики ничего не заметили.`, 'ok');
      } else {
        addEvent(`Итог утра: ${out} из ${total} рейсов выходят, ${failed} под угрозой — резерв исчерпан, эскалация бригадиру`, 'danger');
        toast(`Утро прожито: ${out}/${total}. ${failed} ${plural(failed, 'рейс', 'рейса', 'рейсов')} под угрозой — эскалация.`, 'danger');
      }
    },
  },
];

function runSim() {
  if (state.simRunning || state.simDone) return;
  state.simRunning = true;
  renderDispatch();
  let i = 0;
  const step = () => {
    if (i >= SIM_STEPS.length) { state.simRunning = false; renderAll(); return; }
    const s = SIM_STEPS[i++];
    state.clockMin = Math.max(state.clockMin, s.at);
    s.run();
    renderAll();
    setTimeout(step, 1500);
  };
  step();
}

function replaceSilent(t, s) {
  s.busy = true;
  t.replaced = { name: s.name, level: s.level, rating: s.rating, streak: s.streak, g: s.g };
  t.risk = 4;
  t.chain = { even: 'done', morn: 'done', dep: 'wait', load: 'idle' };
  t.factors = [
    { t: `Резерв ${s.name} назначен автоматически, дежурил${fem(s) ? 'а' : ''} с ${s.since}`, w: '✓', kind: 'pos' },
    { t: 'Заказчик видит статус «замена в пути»', w: '✓', kind: 'pos' },
  ];
  state.savedByReserve[t.clientKey] += 1;
  addEvent(`Резерв поднят: ${s.name} → М-14 (МЕТРО). Замена в пути — пандус не будет пустым`, 'ok');
  toast(`${s.name} принял${fem(s) ? 'а' : ''} рейс М-14. Заказчик не заметит.`, 'ok');
}

/* ── Рендер: водитель (Смирнов) ────────────────────────── */

function renderDriver() {
  const trip = state.trips.find((x) => x.id === 'm12');
  const departed = trip.chain.dep === 'done';
  const loaded = trip.chain.load === 'done';

  // до завтрашней погрузки 06:00
  const minsLeft = 30 * 60 - state.clockMin;
  const leftTxt = `${Math.floor(minsLeft / 60)} ч ${minsLeft % 60} мин`;

  let tomorrowBlock = '';
  if (state.driverTomorrow === 'yes') {
    tomorrowBlock = `<div class="p-confirm-note ok">✓ Принято! Утром — два касания: «Я встал» и «Выезжаю». Хорошего вечера 👋</div>`;
  } else if (state.driverTomorrow === 'no') {
    tomorrowBlock = `
      <div class="p-confirm-note warm">
        Спасибо, что заранее! Предупредил за ${leftTxt} →<br>
        <b>штраф 0 ₽, рейтинг не тронут.</b><br>
        Молчание до утра стоило бы −1 500 ₽ и −0,4 к рейтингу.<br>
        Замена уже подбирается со скамейки — отдыхай спокойно.
      </div>
      <button class="p-btn-ghost" id="pUndo">Передумал — всё-таки выйду</button>`;
  } else if (state.driverTomorrow === 'confirmno') {
    tomorrowBlock = `
      <div class="p-confirm-note warm">Завтра не выйдешь? Замену начнём подбирать сразу. Предупредить сейчас — без штрафа; молчание до утра стоило бы −1 500 ₽.</div>
      <div class="p-btn-row">
        <button class="p-btn p-btn-no" id="pNoConfirm">Да, не смогу</button>
        <button class="p-btn p-btn-yes" id="pNoCancel">Передумал — выйду</button>
      </div>`;
  } else {
    tomorrowBlock = `
      <div class="p-btn-row">
        <button class="p-btn p-btn-yes" id="pYes">✓ Выйду</button>
      </div>
      <button class="p-btn-ghost" id="pNo">Не смогу выйти</button>
      <p class="p-sub" style="margin-top:6px">Честное «не смогу» заранее — без штрафа. Подводит только молчание.</p>`;
  }

  const points = state.route12Points.map((p, i) => `
    <div class="p-point ${p.done ? 'done' : ''}" data-point="${i}">
      <div class="p-point-num">${p.done ? '✓' : i + 1}</div>
      <div style="flex:1">
        <div class="p-point-title">${esc(p.title)}</div>
        <div class="p-point-req">${p.reqs.map((r) => `<span class="req-tag">${esc(r)}</span>`).join('')}</div>
      </div>
      ${p.done ? '' : '<span class="p-point-mark">отметить</span>'}
    </div>`).join('');

  $('#phoneScreen').innerHTML = `
    <div class="p-head">
      <div class="p-greet">Понедельник, 05:12 · смена подтверждена</div>
      <div class="p-name">Андрей, твой выход 🚚</div>
      <div class="p-level-row">
        <span class="p-level-chip">⭐ Городской · уровень 3</span>
        <span class="p-level-chip">🔥 стрик 12</span>
        <span class="p-level-chip">✓ допуск МЕТРО</span>
      </div>
      <div class="p-progress">
        <div class="p-progress-label"><span>До уровня «Профи» — ставка +12%</span><span>68%</span></div>
        <div class="p-progress-bar"><i style="width:68%"></i></div>
      </div>
    </div>
    <div class="p-body">

      <div class="p-card">
        <h4>Сегодня · М-12 «Сокольники»</h4>
        <div class="p-sub">МЕТРО · погрузка 05:30, РЦ Белая Дача · Стандарт (синяя трасса)</div>
        ${trip.replaced
          ? `<div class="p-confirm-note warm">Рейс передан резерву (${esc(trip.replaced.name)}). Куратор свяжется с тобой — стрик не пострадает.</div>`
          : loaded
            ? '<div class="p-confirm-note ok">✓ На погрузке. Дальше по точкам — хорошей дороги!</div>'
            : departed
              ? '<div class="p-confirm-note ok">✓ Выезд подтверждён, геометка активна. До РЦ 18 минут.</div>'
              : `<div class="p-btn-row"><button class="p-btn p-btn-primary" id="pDepart">🚚 Выезжаю</button></div>
                 <p class="p-sub" style="margin-top:9px">«Я встал» отмечено в 05:02 ✓ — осталось одно касание.</p>`}
        ${trip.replaced ? '' : `<div style="margin-top:12px">${points}</div>`}
      </div>

      <div class="p-streak">
        <div class="p-streak-fire">🔥</div>
        <div>
          <b>12 безупречных рейсов подряд</b>
          <div class="p-sub">Ещё 3 — и бонус 3 000 ₽. Стрик не сгорает от честного «не смогу».</div>
        </div>
      </div>

      <div class="p-card">
        <h4>Завтра · 06:00 · МЕТРО, М-12</h4>
        <div class="p-tomorrow-route">
          <span class="diff-badge diff-2">Стандарт</span>
          <span class="p-sub">8 точек · тот же маршрут, что сегодня</span>
        </div>
        ${tomorrowBlock}
      </div>

      <div class="p-card">
        <h4>Наставник · Сергей Тихонов</h4>
        <div class="p-mentor" style="margin-top:10px">
          <div class="avatar">СТ</div>
          <div class="p-mentor-msg">Андрей, видел вчерашний рейс — Гольяново прошёл на 12 минут быстрее плана, тару оформил без единой ошибки. Ещё пара таких недель и подаю тебя на «Профи». Как настрой?</div>
        </div>
        <div class="p-mood-row">
          ${['💪', '🙂', '😐', '😮‍💨'].map((m) => `<button class="p-mood ${state.driverMood === m ? 'picked' : ''}" data-mood="${m}">${m}</button>`).join('')}
        </div>
        ${state.driverMood
          ? `<div class="p-confirm-note ${state.driverMood === '😮‍💨' || state.driverMood === '😐' ? 'warm' : 'ok'}" style="margin-top:10px">
              ${state.driverMood === '😮‍💨' || state.driverMood === '😐'
                ? 'Слышу тебя. Сегодня наберу после смены — это не проверка, это поддержка. Если нужен выходной, соберём подмену заранее.'
                : 'Отлично! Держим темп 💪'}</div>`
          : ''}
      </div>

      <div class="p-card">
        <div class="p-money-row"><h4>Заработок за неделю</h4><div class="p-money">24 800 ₽</div></div>
        <div class="p-sub" style="margin-top:6px">Рейтинг 98,6% → надбавка к ставке +8%. Прогноз месяца: 106 000 ₽.</div>
        <div class="p-sub" style="margin-top:3px">Твоя надёжность — твой капитал: рейтинг и допуски остаются с тобой.</div>
      </div>

    </div>`;

  const yes = $('#pYes');
  if (yes) yes.addEventListener('click', () => {
    state.driverTomorrow = 'yes';
    addEvent('Смирнов подтвердил выход на завтра (М-12, 06:00) — вечернее «Выйду» получено', 'ok');
    renderAll();
  });
  const no = $('#pNo');
  if (no) no.addEventListener('click', () => {
    state.driverTomorrow = 'confirmno';
    renderDriver();
  });
  const noConfirm = $('#pNoConfirm');
  if (noConfirm) noConfirm.addEventListener('click', () => {
    state.driverTomorrow = 'no';
    addEvent('Смирнов честно предупредил: завтра не выйдет. Штраф 0 ₽ — раннее предупреждение. Плановая замена со скамейки', 'warn');
    renderAll();
  });
  const noCancel = $('#pNoCancel');
  if (noCancel) noCancel.addEventListener('click', () => {
    state.driverTomorrow = 'yes';
    addEvent('Смирнов подтвердил выход на завтра (М-12, 06:00) — вечернее «Выйду» получено', 'ok');
    renderAll();
  });
  const undo = $('#pUndo');
  if (undo) undo.addEventListener('click', () => {
    state.driverTomorrow = 'yes';
    addEvent('Смирнов вернулся в завтрашний рейс — плановая замена отменена', 'ok');
    toast('Диспетчерская видит: завтра выходишь ✓', 'ok');
    renderAll();
  });
  const dep = $('#pDepart');
  if (dep) dep.addEventListener('click', () => {
    if (trip.replaced) { toast('Рейс передан резерву — куратор на связи'); return; }
    trip.chain.dep = 'done';
    trip.risk = Math.min(trip.risk, 5);
    addEvent('Смирнов выехал — геометка подтверждена, до РЦ 18 минут', 'ok');
    toast('Выезд подтверждён. Диспетчерская видит геометку.', 'ok');
    renderAll();
  });
  document.querySelectorAll('.p-point').forEach((el) => {
    el.addEventListener('click', () => {
      const p = state.route12Points[+el.dataset.point];
      if (p.done) { toast('Точка уже закрыта ✓'); return; }
      p.done = true;
      const closed = state.route12Points.filter((x) => x.done).length;
      toast(`Точка ${closed}/${state.route12Points.length} закрыта ✓`, 'ok');
      renderDriver();
    });
  });
  document.querySelectorAll('.p-mood').forEach((el) => {
    el.addEventListener('click', () => {
      state.driverMood = el.dataset.mood;
      if (state.driverMood === '😮‍💨') {
        addEvent('Сигнал куратору: Смирнов отметил усталость в чек-ине — назначен созвон после смены', 'warn');
      }
      renderDriver();
    });
  });
}

/* ── Рендер: заказчик (МЕТРО) ──────────────────────────── */

function renderClient() {
  const metroTrips = state.trips.filter((t) => t.clientKey === 'metro');

  $('#clientKpis').innerHTML = `
    <div class="kpi"><div class="kpi-label">Выход на рейс, 30 дней</div><div class="kpi-value ok">100%</div><div class="kpi-sub">SLA 99,9 — выполняется</div></div>
    <div class="kpi"><div class="kpi-label">Прибытие вовремя</div><div class="kpi-value">98,6%</div><div class="kpi-sub">среднее опоздание 4 мин</div></div>
    <div class="kpi"><div class="kpi-label">Терморежим в норме</div><div class="kpi-value ok">99,8%</div><div class="kpi-sub">телеметрия каждые 30 сек</div></div>
    <div class="kpi"><div class="kpi-label">Оценка сервиса</div><div class="kpi-value">4,9</div><div class="kpi-sub">приёмка на точках</div></div>
    <div class="kpi"><div class="kpi-label">Спасено резервом</div><div class="kpi-value warn">${state.savedByReserve.metro}</div><div class="kpi-sub">срывов вы не увидели</div></div>`;

  $('#clientTripCount').textContent = `${metroTrips.length} ${plural(metroTrips.length, 'рейс', 'рейса', 'рейсов')}`;

  $('#clientTrips').innerHTML = metroTrips.map((t) => {
    const st = clientStatus(t);
    const who = t.replaced ? `${t.replaced.name} · ${LEVELS[t.replaced.level]}` : `${t.driver} · ${LEVELS[t.level]}`;
    return `
    <div class="client-trip">
      <div class="trip-time">${t.time}</div>
      <div>
        <div class="trip-route-name">${esc(t.route)}</div>
        <div class="trip-driver-meta">${esc(who)} · допуск МЕТРО ✓${t.replaced ? ' · подменный из оплаченного резерва' : ''}</div>
      </div>
      <div class="ct-status"><span class="pill ${st.cls}">${st.txt}</span></div>
      <div class="temp-ok">🌡 ${t.id === 'm14' ? '2,9' : t.id === 'm2' ? '3,2' : '2,6'} °C ✓</div>
    </div>`;
  }).join('');

  const weeks = [
    ['12.05', 97.2], ['19.05', 98.1], ['26.05', 99.0], ['02.06', 98.4],
    ['09.06', 99.3], ['16.06', 100], ['23.06', 99.6], ['30.06', 100],
  ];
  $('#trendChart').innerHTML = `<div class="trend">${weeks.map(([w, v]) => `
    <div class="trend-col">
      <span class="trend-val">${String(v).replace('.', ',')}</span>
      <div class="trend-bar ${v === 100 ? 'full' : ''}" style="height:${(v - 95) / 5 * 82 + 8}%"></div>
      <span class="trend-week">${w}</span>
    </div>`).join('')}</div>`;

  $('#incidentList').innerHTML = `
    <div class="incident">
      <div class="incident-head"><span>Опоздание 18 мин · М-2</span><span class="incident-date">03.07</span></div>
      <div class="incident-cause">Причина: ДТП на МКАД, объезд. Заказчик уведомлён в 06:41 — за 50 мин до планового прибытия.</div>
      <div class="incident-comp">✓ Компенсация 1 200 ₽ начислена автоматически, без актов и претензий</div>
    </div>
    <div class="incident">
      <div class="incident-head"><span>Срыв предотвращён · М-14</span><span class="incident-date">21.06</span></div>
      <div class="incident-cause">Водитель не вышел на связь в 05:30. Резерв встал в рейс за 22 минуты — окно погрузки выдержано.</div>
      <div class="incident-comp">✓ SLA выполнен — компенсация не требуется</div>
    </div>
    <div class="incident">
      <div class="incident-head"><span>Недосдача тары · М-12</span><span class="incident-date">14.06</span></div>
      <div class="incident-cause">2 паллеты. Зафиксировано приёмкой, подтверждено фото из приложения водителя.</div>
      <div class="incident-comp">✓ Компенсация 840 ₽ начислена автоматически</div>
    </div>`;
}

function clientStatus(t) {
  if (t.replaced && t.chain.dep !== 'done') return { txt: 'замена в пути', cls: 'pill-blue' };
  if (t.chain.load === 'done') return { txt: 'на маршруте · по графику', cls: 'pill-green' };
  if (t.chain.dep === 'done') return { txt: 'едет на погрузку', cls: 'pill-green' };
  if (riskBand(t.risk) === 'high') return { txt: 'усиленный контроль · резерв прогрет', cls: 'pill-amber' };
  if (t.chain.morn === 'done') return { txt: 'подтверждён, готовится к выезду', cls: 'pill-blue' };
  return { txt: 'подтверждён на рейс', cls: 'pill-neutral' };
}

/* ── Навигация и запуск ────────────────────────────────── */

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.role-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
}

document.addEventListener('DOMContentLoaded', () => {
  $('#brandName').textContent = BRAND.name;
  $('#brandTag').textContent = BRAND.tag;

  document.querySelectorAll('.role-btn').forEach((b) => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });

  $('#simBtn').addEventListener('click', () => {
    if (state.simDone) { location.reload(); return; }
    runSim();
  });
  $('#drawerOverlay').addEventListener('click', closeDrawer);
  $('#modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

  renderAll();
});
