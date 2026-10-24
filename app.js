/* =========================================================
   旅行电量表 — 渲染层逻辑
   ========================================================= */

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- 默认词库 ---------- */
const DEFAULT_CATALOG = [
  { id: 'c1',  name: '赶早班机 · 值机安检', sub: '含凌晨起床、排队、脱外套、重新穿外套', cost: -22 },
  { id: 'c2',  name: '在陌生城市找路',       sub: '每迷路一次约等于一次小型挫败',         cost: -15 },
  { id: 'c3',  name: '登山 / 徒步半天',       sub: '体力的账好算，回来的腿不好算',         cost: -30 },
  { id: 'c4',  name: '博物馆 / 美术馆 两小时', sub: '站着看，是加倍的消耗',                cost: -18 },
  { id: 'c5',  name: '网红店排队 40 分钟',     sub: '队伍不会缩短，期待会',                cost: -12 },
  { id: 'c6',  name: '与陌生人寒暄 一小时',    sub: '对内向者是高额支出',                  cost: -10 },
  { id: 'c7',  name: '换酒店 · 搬行李',        sub: '退房、寄存、再入住，一天被切成两半',   cost: -14 },
  { id: 'c8',  name: '临时改行程',             sub: '决定本身，比走路更耗电',              cost: -9  },
  { id: 'c9',  name: '拍照打卡 每处',          sub: '构图、等人走开、再来一张',            cost: -5  },
  { id: 'c10', name: '长途大巴 / 火车 三小时', sub: '坐着也累，是一种特殊的累',            cost: -13 },
  { id: 'c11', name: '购物砍价',               sub: '精神高度集中，且不一定成功',          cost: -8  },
  { id: 'c12', name: '带小孩逛景点',           sub: '指数级消耗，请谨慎勾选',              cost: -35 },
  { id: 'c13', name: '午睡 20 分钟',           sub: '投资回报率最高的一项',                cost: 20  },
  { id: 'c14', name: '洗一个热水澡',           sub: '顺便把当天的情绪冲掉',                cost: 12  },
  { id: 'c15', name: '一顿正经的饭',           sub: '坐下吃，别边走边吃',                  cost: 11  },
  { id: 'c16', name: '一杯咖啡',               sub: '借来的电，晚上要还',                  cost: 10  },
  { id: 'c17', name: '无目的地散步',           sub: '不计步数的那种',                      cost: 9   },
  { id: 'c18', name: '看日落 · 发呆',          sub: '什么都不产出，所以有效',              cost: 8   },
  { id: 'c19', name: '和喜欢的人聊一会',       sub: '最便宜也最有效的充电',                cost: 14  },
  { id: 'c20', name: '提前回酒店',             sub: '放弃一个景点，换回整晚的力气',        cost: 16  }
];

/* ---------- 默认模板 ---------- */
function defaultTemplates(catalog) {
  const byName = n => catalog.find(c => c.name === n);
  const pick = names => names.map(n => byName(n)).filter(Boolean);
  return [
    {
      id: uid(),
      name: '标准观光日',
      builtin: true,
      items: pick([
        '在陌生城市找路', '博物馆 / 美术馆 两小时', '拍照打卡 每处',
        '网红店排队 40 分钟', '一顿正经的饭', '一杯咖啡', '看日落 · 发呆'
      ]).map(c => ({ catId: c.id, cost: c.cost }))
    },
    {
      id: uid(),
      name: '硬核徒步日',
      builtin: true,
      items: pick([
        '登山 / 徒步半天', '赶早班机 · 值机安检', '一顿正经的饭',
        '洗一个热水澡', '提前回酒店'
      ]).map(c => ({ catId: c.id, cost: c.cost }))
    },
    {
      id: uid(),
      name: '城市散策日',
      builtin: true,
      items: pick([
        '无目的地散步', '一杯咖啡', '拍照打卡 每处',
        '一顿正经的饭', '看日落 · 发呆'
      ]).map(c => ({ catId: c.id, cost: c.cost }))
    },
    {
      id: uid(),
      name: '带娃出行日',
      builtin: true,
      items: pick([
        '带小孩逛景点', '网红店排队 40 分钟', '临时改行程',
        '一顿正经的饭', '午睡 20 分钟', '提前回酒店'
      ]).map(c => ({ catId: c.id, cost: c.cost }))
    }
  ];
}

/* ---------- 状态 ---------- */
let state = {
  catalog: DEFAULT_CATALOG.slice(),
  templates: [],
  trips: [],
  currentTripId: null,
  currentDate: todayISO(),
  view: 'trips'
};

/* =========================================================
   Web Demo 存储层（localStorage 替代 Electron 文件）
   ========================================================= */
const STORAGE_KEY = 'travel-power-gazette-v1';

const webStore = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  },
  exportJSON(payload) {
    const blob = new Blob([payload.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = payload.defaultName || 'travel-power-export.json';
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  },
  exportPDF() {
    window.print();
    return { ok: true };
  },
  revealData() {
    return true;
  },
  dataPath() {
    return 'localStorage: ' + STORAGE_KEY;
  }
};

const store = window.api || webStore;

let saveTimer = null;

/* =========================================================
   持久化
   ========================================================= */
function normalize(data) {
  if (!data || typeof data !== 'object') return null;
  const s = {
    catalog: Array.isArray(data.catalog) && data.catalog.length ? data.catalog : DEFAULT_CATALOG.slice(),
    templates: Array.isArray(data.templates) && data.templates.length ? data.templates : null,
    trips: Array.isArray(data.trips) ? data.trips : [],
    currentTripId: data.currentTripId || null,
    currentDate: data.currentDate || todayISO(),
    view: data.view || 'trips'
  };
  if (!s.templates) s.templates = defaultTemplates(s.catalog);
  s.trips.forEach(t => {
    if (!Array.isArray(t.days)) t.days = [];
    if (typeof t.budget !== 'number') t.budget = 100;
  });
  if (!s.trips.some(t => t.id === s.currentTripId)) {
    s.currentTripId = s.trips.length ? s.trips[0].id : null;
  }
  return s;
}

async function loadState() {
  try {
    const data = await store.load();
    const n = normalize(data);
    if (n) state = n;
  } catch (e) {
    console.error('读取数据失败', e);
  }
  if (!Array.isArray(state.templates) || !state.templates.length) {
    state.templates = defaultTemplates(state.catalog);
  }
  if (!state.trips.length) seedDemo();
}

function markDirty() {
  const el = document.getElementById('saveState');
  el.textContent = '保存中…';
  el.classList.add('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await store.save(state);
      el.textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      el.classList.remove('dirty');
    } catch (e) {
      el.textContent = '保存失败';
      el.classList.add('dirty');
    }
  }, 320);
}

/* ---------- 演示数据 ---------- */
function seedDemo() {
  const tripId = uid();
  const start = todayISO();
  const days = [];
  const tpl = state.templates[0];

  for (let i = 0; i < 3; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    let entries = tpl.items.map((it, idx) => {
      const cat = state.catalog.find(c => c.id === it.catId);
      return {
        id: uid(),
        catId: it.catId,
        name: cat ? cat.name : '条目',
        sub: cat ? cat.sub : '',
        cost: it.cost,
        time: String(9 + idx * 2).padStart(2, '0') + ':00'
      };
    });

    // 第二天更累：加一次徒步；第三天赶早班机回程
    if (i === 1) {
      const c = state.catalog.find(x => x.name === '登山 / 徒步半天');
      if (c) entries.push({ id: uid(), catId: c.id, name: c.name, sub: c.sub, cost: c.cost, time: '14:00' });
    }
    if (i === 2) {
      const c = state.catalog.find(x => x.name === '赶早班机 · 值机安检');
      if (c) entries.push({ id: uid(), catId: c.id, name: c.name, sub: c.sub, cost: c.cost, time: '06:00' });
      entries = entries.filter(e => e.name !== '看日落 · 发呆');
    }

    days.push({
      date: iso,
      entries,
      note: i === 0 ? '第一天，腿还在，兴致也在。' : (i === 1 ? '下午那趟山，把最后一格电也带走了。' : '')
    });
  }

  state.trips.push({
    id: tripId,
    name: '十月京都（示例）',
    dest: '京都',
    start,
    end: days[days.length - 1].date,
    budget: 100,
    days
  });
  state.currentTripId = tripId;
  state.currentDate = start;
  markDirty();
}

/* =========================================================
   工具函数
   ========================================================= */
function currentTrip() {
  return state.trips.find(t => t.id === state.currentTripId) || null;
}

function tripDays(trip) {
  if (!trip) return [];
  const days = trip.days.slice().sort((a, b) => a.date.localeCompare(b.date));
  return days;
}

function dayOf(trip, date) {
  return trip ? trip.days.find(d => d.date === date) : null;
}

function ensureDay(trip, date) {
  let d = dayOf(trip, date);
  if (!d) {
    d = { date, entries: [], note: '' };
    trip.days.push(d);
  }
  return d;
}

function remainingOf(trip, day) {
  if (!day) return trip ? trip.budget : 100;
  const delta = day.entries.reduce((s, e) => s + e.cost, 0);
  return Math.max(0, Math.min(100, trip.budget + delta));
}

function sumBy(day, sign) {
  if (!day) return 0;
  return day.entries
    .filter(e => sign < 0 ? e.cost < 0 : e.cost > 0)
    .reduce((s, e) => s + e.cost, 0);
}

function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function weekday(iso) {
  const d = new Date(iso + 'T00:00:00');
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1900);
}

function verdictFor(remain) {
  if (remain >= 75) return '满血。你甚至有条件在机场买一杯很贵的咖啡。';
  if (remain >= 55) return '状态不错。还可以再走一条没在计划里的街。';
  if (remain >= 40) return '尚可。建议找一张椅子坐二十分钟，别硬撑到天黑。';
  if (remain >= 20) return '低电。任何需要排队的项目，都请礼貌地放弃。';
  return '自动关机。回酒店，洗个澡，明天再说。';
}

/* =========================================================
   视图切换
   ========================================================= */
function switchView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === 'view-' + view);
  });
  document.querySelector('.main').scrollTop = 0;
  renderView(view);
  markDirty();
}

function renderView(view) {
  if (view === 'trips') renderTrips();
  else if (view === 'ledger') renderLedger();
  else if (view === 'templates') renderTemplates();
  else if (view === 'report') renderReport();
  else if (view === 'catalog') renderCatalog();
}

/* =========================================================
   行程视图
   ========================================================= */
function renderTrips() {
  const list = document.getElementById('tripList');
  if (!state.trips.length) {
    list.innerHTML = `
      <div class="empty-fig">
        <img src="assets/empty-state.png" alt="打开的行李箱与空椅子">
        <div class="empty-fig-text">
          <b>还没有行程</b>
          <span>空箱子已经打开了，右侧建档，就可以开始计算这一次能撑多久。</span>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = state.trips.map(t => {
    const days = tripDays(t);
    const avg = days.length
      ? Math.round(days.reduce((s, d) => s + remainingOf(t, d), 0) / days.length)
      : t.budget;
    const active = t.id === state.currentTripId ? ' active' : '';
    const low = avg < 20 ? ' low' : '';
    return `
      <div class="trip-card${active}" data-id="${t.id}">
        <div>
          <div class="tc-name">${esc(t.name)}</div>
          <div class="tc-meta">${esc(t.dest || '—')} · ${fmtDate(t.start)} — ${fmtDate(t.end)} · ${days.length} 天</div>
        </div>
        <div class="tc-stat">平均余量<br><b class="${low}">${avg}%</b></div>
      </div>`;
  }).join('');

  list.querySelectorAll('.trip-card').forEach(card => {
    card.addEventListener('click', () => {
      state.currentTripId = card.dataset.id;
      const t = currentTrip();
      const days = tripDays(t);
      state.currentDate = days.length ? days[0].date : (t ? t.start : todayISO());
      markDirty();
      renderTrips();
      renderTripSelect();
      switchView('ledger');
    });
  });
}

function addTrip() {
  const name = document.getElementById('fTripName').value.trim();
  const dest = document.getElementById('fTripDest').value.trim();
  const start = document.getElementById('fTripStart').value;
  const end = document.getElementById('fTripEnd').value;
  const budget = parseInt(document.getElementById('fTripBudget').value, 10) || 100;

  if (!name) return toast('先给行程起个名字');
  if (!start || !end) return toast('请填写起止日期');
  if (end < start) return toast('结束日期不能早于开始日期');

  const trip = { id: uid(), name, dest, start, end, budget, days: [] };

  // 按日期区间建好空的日子
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  let guard = 0;
  while (cur <= last && guard++ < 400) {
    trip.days.push({ date: cur.toISOString().slice(0, 10), entries: [], note: '' });
    cur.setDate(cur.getDate() + 1);
  }

  state.trips.push(trip);
  state.currentTripId = trip.id;
  state.currentDate = trip.days[0] ? trip.days[0].date : start;

  document.getElementById('fTripName').value = '';
  document.getElementById('fTripDest').value = '';
  document.getElementById('fTripStart').value = '';
  document.getElementById('fTripEnd').value = '';

  markDirty();
  renderTripSelect();
  renderTrips();
  toast('行程已建档');
}

function renderTripSelect() {
  const sel = document.getElementById('tripSelect');
  sel.innerHTML = state.trips.length
    ? state.trips.map(t => `<option value="${t.id}"${t.id === state.currentTripId ? ' selected' : ''}>${esc(t.name)}</option>`).join('')
    : '<option value="">（无行程）</option>';
}

/* =========================================================
   记账视图
   ========================================================= */
function renderLedger() {
  const trip = currentTrip();
  if (!trip) {
    document.getElementById('dayStrip').innerHTML = '';
    document.getElementById('entryList').innerHTML = '<div class="empty">请先在「行程」里建档。</div>';
    return;
  }

  const days = tripDays(trip);
  if (!days.length) {
    document.getElementById('dayStrip').innerHTML = '';
    document.getElementById('entryList').innerHTML = '<div class="empty">这个行程还没有日期。</div>';
    return;
  }

  if (!days.some(d => d.date === state.currentDate)) {
    state.currentDate = days[0].date;
  }

  // 日期条
  document.getElementById('dayStrip').innerHTML = days.map(d => {
    const r = remainingOf(trip, d);
    const active = d.date === state.currentDate ? ' active' : '';
    const low = r < 20 ? ' low' : '';
    const dt = new Date(d.date + 'T00:00:00');
    return `
      <button class="day-btn${active}" data-date="${d.date}">
        <span class="d-month">${dt.getMonth() + 1}月 ${weekday(d.date)}</span>
        <span class="d-day">${dt.getDate()}</span>
        <span class="d-lv${low}">${r}%</span>
      </button>`;
  }).join('');

  document.querySelectorAll('.day-btn').forEach(b => {
    b.addEventListener('click', () => {
      state.currentDate = b.dataset.date;
      markDirty();
      renderLedger();
    });
  });

  document.getElementById('ledgerDateLabel').textContent = fmtDate(state.currentDate) + ' · ' + weekday(state.currentDate);

  const day = dayOf(trip, state.currentDate);

  // 条目列表
  const list = document.getElementById('entryList');
  if (!day || !day.entries.length) {
    list.innerHTML = '<div class="empty">这一天还没有记录。从下面挑一条开始。</div>';
  } else {
    list.innerHTML = day.entries.map(e => `
      <div class="entry" data-id="${e.id}">
        <div class="e-name">${esc(e.name)}${e.sub ? `<small>${esc(e.sub)}</small>` : ''}</div>
        <div class="e-val${e.cost > 0 ? ' plus' : ''}">${e.cost > 0 ? '+' : ''}${e.cost}</div>
        <div class="e-time">${e.time || '—'}</div>
        <button class="e-del" data-del="${e.id}" title="删除">×</button>
      </div>`).join('');

    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        const d = ensureDay(trip, state.currentDate);
        d.entries = d.entries.filter(x => x.id !== btn.dataset.del);
        markDirty();
        renderLedger();
      });
    });
  }

  // 备注
  const noteEl = document.getElementById('dayNote');
  noteEl.value = day ? (day.note || '') : '';

  // 电量面板
  renderMeter(trip, day);

  // 当日曲线
  renderDayChart(trip, day);

  // 下拉与快捷条目
  renderPickItem();
  renderQuickChips();
}

function renderMeter(trip, day) {
  const remain = remainingOf(trip, day);
  const debit = sumBy(day, -1);
  const credit = sumBy(day, 1);

  const big = document.getElementById('bigNum');
  big.innerHTML = remain + '<small>%</small>';
  big.style.color = remain < 20 ? 'var(--red)' : 'var(--ink)';

  const cells = document.getElementById('cells');
  const filled = Math.round(remain / 5);
  const lowCls = remain < 20 ? ' low' : '';
  cells.innerHTML = Array.from({ length: 20 }, (_, i) =>
    `<b class="${i < filled ? 'f' + lowCls : ''}"></b>`).join('');

  document.getElementById('verdict').textContent = verdictFor(remain);
  document.getElementById('sumDebit').textContent = debit;
  document.getElementById('sumCredit').textContent = '+' + credit;
}

function renderDayChart(trip, day) {
  const svg = document.getElementById('dayChart');
  const W = 420, H = 190;
  const pad = { l: 30, r: 12, t: 14, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (!day || !day.entries.length) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#867c6c" font-size="11" font-family="Noto Serif SC">今天还没有数据</text>`;
    return;
  }

  const sorted = day.entries.slice().sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  let cur = trip.budget;
  const pts = [{ t: '00:00', v: trip.budget }];
  sorted.forEach(e => {
    cur = Math.max(0, Math.min(100, cur + e.cost));
    pts.push({ t: e.time || '', v: cur, name: e.name });
  });

  const y = v => pad.t + ih - (v / 100) * ih;
  const stepX = pts.length > 1 ? iw / (pts.length - 1) : iw;
  const xs = pts.map((_, i) => pad.l + i * stepX);

  const line = pts.map((p, i) => `${xs[i].toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `M${xs[0]},${y(pts[0].v)} ` +
    pts.slice(1).map((p, i) => `L${xs[i + 1]},${y(p.v)}`).join(' ') +
    ` L${xs[xs.length - 1]},${pad.t + ih} L${xs[0]},${pad.t + ih} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a3271a" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#a3271a" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line class="gridline" x1="${pad.l}" y1="${y(100)}" x2="${W - pad.r}" y2="${y(100)}"/>
    <line class="gridline" x1="${pad.l}" y1="${y(50)}"  x2="${W - pad.r}" y2="${y(50)}"/>
    <line class="axis"     x1="${pad.l}" y1="${pad.t + ih}" x2="${W - pad.r}" y2="${pad.t + ih}"/>
    <text x="${pad.l - 6}" y="${y(100) + 3}" text-anchor="end">100</text>
    <text x="${pad.l - 6}" y="${y(50) + 3}" text-anchor="end">50</text>
    <text x="${pad.l - 6}" y="${pad.t + ih + 3}" text-anchor="end">0</text>
    <line x1="${pad.l}" y1="${y(20)}" x2="${W - pad.r}" y2="${y(20)}" stroke="#a3271a" stroke-width="1" stroke-dasharray="5 4" opacity=".5"/>
    <path class="area" d="${area}"/>
    <polyline class="line" points="${line}"/>
    ${pts.map((p, i) => `<circle class="dot" cx="${xs[i]}" cy="${y(p.v)}" r="2.6"/>`).join('')}
  `;
}

function renderPickItem() {
  const sel = document.getElementById('pickItem');
  const groups = [
    { label: '— 支出 —', items: state.catalog.filter(c => c.cost < 0) },
    { label: '— 回血 —', items: state.catalog.filter(c => c.cost > 0) }
  ];
  sel.innerHTML = groups.map(g =>
    `<optgroup label="${g.label}">` +
    g.items.map(c => `<option value="${c.id}">${esc(c.name)}（${c.cost > 0 ? '+' : ''}${c.cost}）</option>`).join('') +
    '</optgroup>').join('');
}

function renderQuickChips() {
  const box = document.getElementById('quickChips');
  const trip = currentTrip();
  const day = trip ? dayOf(trip, state.currentDate) : null;
  const used = new Set(day ? day.entries.map(e => e.catId) : []);

  // 展示用到最多的 8 条
  const freq = {};
  if (trip) trip.days.forEach(d => d.entries.forEach(e => { freq[e.catId] = (freq[e.catId] || 0) + 1; }));

  const ranked = state.catalog.slice().sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0)).slice(0, 10);

  box.innerHTML = ranked.map(c => {
    const cls = 'chip' + (c.cost > 0 ? ' plus' : '') + (used.has(c.id) ? '' : '');
    return `<button class="${cls}" data-cat="${c.id}">${esc(c.name)}<b>${c.cost > 0 ? '+' : ''}${c.cost}</b></button>`;
  }).join('');

  box.querySelectorAll('[data-cat]').forEach(b => {
    b.addEventListener('click', () => addEntryByCat(b.dataset.cat));
  });
}

function addEntryByCat(catId) {
  const trip = currentTrip();
  if (!trip) return toast('请先选择一个行程');
  const cat = state.catalog.find(c => c.id === catId);
  if (!cat) return;

  const now = new Date();
  const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  const day = ensureDay(trip, state.currentDate);
  day.entries.push({
    id: uid(), catId: cat.id, name: cat.name, sub: cat.sub, cost: cat.cost, time
  });
  markDirty();
  renderLedger();
}

function addEntryFromForm() {
  const trip = currentTrip();
  if (!trip) return toast('请先选择一个行程');
  const catId = document.getElementById('pickItem').value;
  const time = document.getElementById('pickTime').value || '';
  const cat = state.catalog.find(c => c.id === catId);
  if (!cat) return;

  const day = ensureDay(trip, state.currentDate);
  day.entries.push({
    id: uid(), catId: cat.id, name: cat.name, sub: cat.sub, cost: cat.cost, time
  });
  document.getElementById('pickTime').value = '';
  markDirty();
  renderLedger();
}

/* =========================================================
   模板视图
   ========================================================= */
function renderTemplates() {
  const grid = document.getElementById('tplGrid');
  const trip = currentTrip();
  const day = trip ? dayOf(trip, state.currentDate) : null;
  const canSave = day && day.entries.length > 0;

  document.querySelector('.tpl-create .form-title').textContent =
    canSave ? `用 ${fmtDate(state.currentDate)} 的记录存为新模板` : '当前这一天还没有记录，先去记几笔';

  grid.innerHTML = state.templates.map(t => {
    const names = t.items.map(it => {
      const c = state.catalog.find(c => c.id === it.catId);
      return c ? c.name : '（已删除条目）';
    });
    const net = t.items.reduce((s, it) => s + it.cost, 0);
    return `
      <div class="tpl-card" data-id="${t.id}">
        <h4>${esc(t.name)}</h4>
        <div class="tpl-items">${names.map(esc).join(' · ')}</div>
        <div class="tpl-items" style="color:var(--ink-2);font-family:var(--display);font-size:12px;">
          净变化 ${net > 0 ? '+' : ''}${net}
        </div>
        <div class="tpl-actions">
          <button data-apply="${t.id}">套用</button>
          <button class="danger" data-del="${t.id}">删除</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-apply]').forEach(btn => {
    btn.addEventListener('click', () => applyTemplate(btn.dataset.apply));
  });
  grid.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.templates = state.templates.filter(t => t.id !== btn.dataset.del);
      markDirty();
      renderTemplates();
      toast('模板已删除');
    });
  });
}

function applyTemplate(tplId) {
  const trip = currentTrip();
  if (!trip) return toast('请先选择一个行程');
  const tpl = state.templates.find(t => t.id === tplId);
  if (!tpl) return;

  const day = ensureDay(trip, state.currentDate);
  let idx = 0;
  tpl.items.forEach(it => {
    const cat = state.catalog.find(c => c.id === it.catId);
    const hour = 9 + idx * 2;
    day.entries.push({
      id: uid(),
      catId: it.catId,
      name: cat ? cat.name : '条目',
      sub: cat ? cat.sub : '',
      cost: it.cost,
      time: String(Math.min(23, hour)).padStart(2, '0') + ':00'
    });
    idx++;
  });
  markDirty();
  toast('模板已套用到 ' + fmtDate(state.currentDate));
  switchView('ledger');
}

function saveTemplateFromDay() {
  const trip = currentTrip();
  if (!trip) return toast('请先选择一个行程');
  const day = dayOf(trip, state.currentDate);
  if (!day || !day.entries.length) return toast('这一天还没有记录');

  const name = document.getElementById('tplName').value.trim() || (fmtDate(state.currentDate) + ' 的一天');

  state.templates.push({
    id: uid(),
    name,
    items: day.entries.map(e => ({ catId: e.catId, cost: e.cost }))
  });
  document.getElementById('tplName').value = '';
  markDirty();
  renderTemplates();
  toast('已存为模板：' + name);
}

/* =========================================================
   报表视图
   ========================================================= */
function renderReport() {
  const trip = currentTrip();
  const titleEl = document.getElementById('rptTitle');
  const subEl = document.getElementById('rptSub');
  const statRow = document.getElementById('statRow');
  const chart = document.getElementById('tripChart');

  if (!trip) {
    titleEl.textContent = '尚未选择行程';
    subEl.textContent = '';
    statRow.innerHTML = '';
    chart.innerHTML = '';
    document.getElementById('topDrains').innerHTML = '';
    document.getElementById('topCredits').innerHTML = '';
    document.getElementById('alertList').innerHTML = '';
    return;
  }

  const days = tripDays(trip);
  const withData = days.filter(d => d.entries.length);
  titleEl.textContent = trip.name;
  subEl.textContent = `${trip.dest || '—'} · ${fmtDate(trip.start)} — ${fmtDate(trip.end)} · 共 ${days.length} 天，${withData.length} 天有记录`;

  // 统计
  const totalDebit = withData.reduce((s, d) => s + sumBy(d, -1), 0);
  const totalCredit = withData.reduce((s, d) => s + sumBy(d, 1), 0);
  const avgRemain = withData.length
    ? Math.round(withData.reduce((s, d) => s + remainingOf(trip, d), 0) / withData.length)
    : trip.budget;
  const lowDays = withData.filter(d => remainingOf(trip, d) < 20).length;
  const totalEntries = withData.reduce((s, d) => s + d.entries.length, 0);

  statRow.innerHTML = `
    <div class="stat">
      <div class="s-label">平均剩余电量</div>
      <div class="s-val${avgRemain < 20 ? ' low' : ''}">${avgRemain}<small>%</small></div>
      <div class="s-note">${withData.length} 天均值</div>
    </div>
    <div class="stat">
      <div class="s-label">总支出</div>
      <div class="s-val">${Math.abs(totalDebit)}<small>点</small></div>
      <div class="s-note">共 ${totalEntries} 条记录</div>
    </div>
    <div class="stat">
      <div class="s-label">总回血</div>
      <div class="s-val" style="color:var(--olive)">${totalCredit}<small>点</small></div>
      <div class="s-note">净变化 ${totalDebit + totalCredit}</div>
    </div>
    <div class="stat">
      <div class="s-label">低电日</div>
      <div class="s-val${lowDays > 0 ? ' low' : ''}">${lowDays}<small>天</small></div>
      <div class="s-note">低于 20% 警戒线</div>
    </div>`;

  // 逐日柱状图
  renderTripChart(chart, trip, days);

  // 排行
  const agg = {};
  withData.forEach(d => d.entries.forEach(e => {
    const key = e.name;
    if (!agg[key]) agg[key] = { name: e.name, sub: e.sub, total: 0, count: 0 };
    agg[key].total += e.cost;
    agg[key].count++;
  }));
  const all = Object.values(agg);

  const drains = all.filter(x => x.total < 0).sort((a, b) => a.total - b.total).slice(0, 6);
  const credits = all.filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 6);

  document.getElementById('topDrains').innerHTML = drains.length
    ? drains.map((x, i) => `
      <li>
        <span class="r-no">${String(i + 1).padStart(2, '0')}</span>
        <span class="r-name">${esc(x.name)}<small>出现 ${x.count} 次</small></span>
        <span class="r-val">${x.total}</span>
      </li>`).join('')
    : '<li style="border:none;color:var(--ink-3)">暂无数据</li>';

  document.getElementById('topCredits').innerHTML = credits.length
    ? credits.map((x, i) => `
      <li>
        <span class="r-no">${String(i + 1).padStart(2, '0')}</span>
        <span class="r-name">${esc(x.name)}<small>出现 ${x.count} 次</small></span>
        <span class="r-val plus">+${x.total}</span>
      </li>`).join('')
    : '<li style="border:none;color:var(--ink-3)">暂无数据</li>';

  const alerts = withData.filter(d => remainingOf(trip, d) < 20)
    .sort((a, b) => remainingOf(trip, a) - remainingOf(trip, b));

  document.getElementById('alertList').innerHTML = alerts.length
    ? alerts.map(d => {
      const main = d.entries.slice().sort((a, b) => a.cost - b.cost)[0];
      return `<li><b>${fmtDate(d.date)}</b> 收于 ${remainingOf(trip, d)}%${main ? `，罪魁：${esc(main.name)}` : ''}</li>`;
    }).join('')
    : '<li style="border-left-color:var(--olive);color:var(--ink-3)">全程没有掉到警戒线以下。</li>';
}

function renderTripChart(svg, trip, days) {
  const W = 900, H = 260;
  const pad = { l: 40, r: 16, t: 18, b: 40 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (!days.length) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#867c6c" font-size="12" font-family="Noto Serif SC">暂无日期</text>`;
    return;
  }

  const n = days.length;
  const slot = iw / n;
  const barW = Math.min(52, slot * 0.56);

  const y = v => pad.t + ih - (v / 100) * ih;

  // 平均线
  const withData = days.filter(d => d.entries.length);
  const avg = withData.length
    ? withData.reduce((s, d) => s + remainingOf(trip, d), 0) / withData.length
    : trip.budget;

  const bars = days.map((d, i) => {
    const r = remainingOf(trip, d);
    const cx = pad.l + slot * i + slot / 2;
    const x = cx - barW / 2;
    const top = y(r);
    const h = pad.t + ih - top;
    const low = r < 20 ? ' low' : '';
    const dt = new Date(d.date + 'T00:00:00');
    return `
      <rect class="bar-bg" x="${x}" y="${pad.t}" width="${barW}" height="${ih}"/>
      <rect class="bar-fill${low}" x="${x}" y="${top}" width="${barW}" height="${Math.max(1, h)}"/>
      <text x="${cx}" y="${H - 22}" text-anchor="middle">${dt.getMonth() + 1}/${dt.getDate()}</text>
      <text x="${cx}" y="${top - 5}" text-anchor="middle" style="font-size:9px">${d.entries.length ? r + '%' : '—'}</text>
    `;
  }).join('');

  svg.innerHTML = `
    <line class="gridline" x1="${pad.l}" y1="${y(100)}" x2="${W - pad.r}" y2="${y(100)}"/>
    <line class="gridline" x1="${pad.l}" y1="${y(50)}"  x2="${W - pad.r}" y2="${y(50)}"/>
    <line class="axis"     x1="${pad.l}" y1="${pad.t + ih}" x2="${W - pad.r}" y2="${pad.t + ih}"/>
    <text x="${pad.l - 8}" y="${y(100) + 3}" text-anchor="end">100</text>
    <text x="${pad.l - 8}" y="${y(50) + 3}" text-anchor="end">50</text>
    <text x="${pad.l - 8}" y="${pad.t + ih + 3}" text-anchor="end">0</text>
    ${bars}
    <line x1="${pad.l}" y1="${y(20)}" x2="${W - pad.r}" y2="${y(20)}" stroke="#a3271a" stroke-width="1" stroke-dasharray="6 5" opacity=".55"/>
    <text x="${W - pad.r}" y="${y(20) - 5}" text-anchor="end" style="fill:#a3271a">20% 警戒线</text>
    <line x1="${pad.l}" y1="${y(avg)}" x2="${W - pad.r}" y2="${y(avg)}" stroke="#5d6650" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>
    <text x="${pad.l + 4}" y="${y(avg) - 5}" style="fill:#5d6650">平均 ${Math.round(avg)}%</text>
  `;
}

/* =========================================================
   词库视图
   ========================================================= */
function renderCatalog() {
  const debits = state.catalog.filter(c => c.cost < 0).sort((a, b) => a.cost - b.cost);
  const credits = state.catalog.filter(c => c.cost > 0).sort((a, b) => b.cost - a.cost);

  const row = c => `
    <div class="cat-item">
      <div>${esc(c.name)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</div>
      <div class="cv${c.cost > 0 ? ' plus' : ''}">${c.cost > 0 ? '+' : ''}${c.cost}</div>
      <button class="cd" data-del="${c.id}" title="从词库移除">×</button>
    </div>`;

  document.getElementById('catDebit').innerHTML = debits.map(row).join('') || '<div class="empty" style="border:none">空</div>';
  document.getElementById('catCredit').innerHTML = credits.map(row).join('') || '<div class="empty" style="border:none">空</div>';

  document.querySelectorAll('#view-catalog [data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.catalog = state.catalog.filter(c => c.id !== btn.dataset.del);
      markDirty();
      renderCatalog();
    });
  });
}

function addCatalogItem() {
  const name = document.getElementById('catName').value.trim();
  const sub = document.getElementById('catSub').value.trim();
  const cost = parseInt(document.getElementById('catCost').value, 10);

  if (!name) return toast('请填写名称');
  if (!cost || isNaN(cost)) return toast('请填写非零电量数值，如 -12 或 +15');

  state.catalog.push({ id: uid(), name, sub, cost });
  document.getElementById('catName').value = '';
  document.getElementById('catSub').value = '';
  document.getElementById('catCost').value = '';
  markDirty();
  renderCatalog();
  toast('已加入词库');
}

/* =========================================================
   导出
   ========================================================= */
async function exportAll() {
  const content = JSON.stringify(state, null, 2);
  const res = await store.exportJSON({
    defaultName: `旅行电量表-${todayISO()}.json`,
    content
  });
  if (res && res.ok) toast('已导出 JSON');
}

async function exportPDF() {
  const trip = currentTrip();
  if (!trip) return toast('请先选择一个行程');

  switchView('report');
  await new Promise(r => setTimeout(r, 380));

  toast('在打印对话框中选择「另存为 PDF」');
  await new Promise(r => setTimeout(r, 700));

  const res = await store.exportPDF(`${trip.name}-电量报告.pdf`);
  if (res && res.ok) toast('打印对话框已打开');
}

async function revealDataFile() {
  const p = await store.dataPath();
  toast('数据位置：' + p);
}

/* =========================================================
   初始化
   ========================================================= */
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function init() {
  await loadState();

  renderTripSelect();

  // 导航
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // 行程
  document.getElementById('btnAddTrip').addEventListener('click', addTrip);

  // 选择行程
  document.getElementById('tripSelect').addEventListener('change', ev => {
    state.currentTripId = ev.target.value;
    const t = currentTrip();
    if (t) {
      const days = tripDays(t);
      state.currentDate = days.length ? days[0].date : t.start;
    }
    markDirty();
    renderView(state.view);
  });

  // 记账
  document.getElementById('btnAddEntry').addEventListener('click', addEntryFromForm);

  document.getElementById('dayNote').addEventListener('input', ev => {
    const trip = currentTrip();
    if (!trip) return;
    const day = ensureDay(trip, state.currentDate);
    day.note = ev.target.value;
    markDirty();
  });

  // 模板
  document.getElementById('btnSaveTpl').addEventListener('click', saveTemplateFromDay);

  // 词库
  document.getElementById('btnAddCat').addEventListener('click', addCatalogItem);

  // 导出
  document.getElementById('exportAll').addEventListener('click', exportAll);
  document.getElementById('btnExportPDF').addEventListener('click', exportPDF);
  document.getElementById('revealData').addEventListener('click', revealDataFile);

  // 快捷键：⌘/Ctrl + N 新建
  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') {
      ev.preventDefault();
      switchView('trips');
    }
  });

  switchView(state.view || 'trips');
  markDirty();
}

init();
