// Library showcase — a deterministic 16 s loop. Every frame is a pure
// function of t: seek(t) sets the whole scene, so the renderer can step
// frame by frame and the loop seam is exact by construction.
const DURATION = 16;
const W = 1600, H = 1200, K = 1.5;            // design canvas 1067×800 drawn at 1.5×
const $ = s => document.querySelector(s);
const clamp = x => Math.max(0, Math.min(1, x));
const lerp = (a, b, p) => a + (b - a) * p;
function cubic(x1, y1, x2, y2) {
  return x => {
    x = clamp(x); if (x === 0 || x === 1) return x;
    let lo = 0, hi = 1, u = x;
    for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; const q = 3*u*(1-u)**2*x1 + 3*u*u*(1-u)*x2 + u**3; if (q < x) lo = u; else hi = u; }
    return 3*u*(1-u)**2*y1 + 3*u*u*(1-u)*y2 + u**3;
  };
}
// Library motion tokens (tokens.generated.css) and Stageshow's two storytelling curves.
const E = {
  default: cubic(.2, 0, 0, 1),      // --ui-ease-default
  out: cubic(0, 0, .2, 1),          // --ui-ease-out
  spring: cubic(.22, 1, .36, 1),    // --ui-ease-spring
  travel: cubic(.45, 0, .1, 1),     // cursor travel
  arrive: cubic(.25, .8, .25, 1),   // arrival from nowhere
};
const D = {fast: .12, base: .2, slow: .32, enter: .4};   // --ui-duration-*
const tw = (t, a, d, e = E.default) => e((t - a) / d);    // 0→1 from a over d
const on = (t, a, d, e) => tw(t, a, d, e);
const between = (t, a, b, d, e) => tw(t, a, d, e) * (1 - tw(t, b, d, e)); // up at a, down at b

/* ---------- people ---------- */
// One cursor does everything, in sequence (feedback: no presence, no name tags).
const PEOPLE = {you: {name: ''}};

/* ---------- cursor paths: keyframes [t, x, y, press?] in design px ---------- */
// Filled in by layout() from measured targets; see SCRIPT below.
const PATHS = {};

function target(sel, fx = .5, fy = .5) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  const st = $('#stage').getBoundingClientRect(), r = el.getBoundingClientRect();
  const s = st.width / (W / K);                       // stage px per design px
  return [(r.left - st.left + r.width * fx) / s, (r.top - st.top + r.height * fy) / s];
}

let ready_ = false;
window.duration = DURATION;
window.ready = new Promise(res => {
  const go = async () => { await document.fonts.ready; setup(); ready_ = true; res(); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', go) : go();
});

function fit() {
  const f = $('#frame'), k = Math.min(innerWidth / W, innerHeight / H);
  f.style.transform = `scale(${k})`;
  f.style.left = (innerWidth - W * k) / 2 + 'px';
  f.style.top = (innerHeight - H * k) / 2 + 'px';
}

function setup() {
  document.documentElement.classList.toggle('render', location.hash.startsWith('#render'));
  if (/dark/.test(location.hash)) document.documentElement.dataset.scheme = 'dark';
  buildCalendar();
  buildCursors();
  $('#frame').style.transform = 'none';
  SCRIPT_BUILD();
  fit(); addEventListener('resize', fit);
  controls();
}

/* ---------- calendar (data, not hand-typed markup) ---------- */
function buildCalendar() {
  const cal = $('#cal');
  const head = `<div class="cal-head"><span class="cal-title">November 2026 ${ICONS.ChevronDown}</span><span class="cal-nav"><span class="chrome">${ICONS.ChevronLeft}</span><span class="chrome">${ICONS.ChevronRight}</span></span></div>`;
  const dow = ['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<span class="cal-dow">${d}</span>`).join('');
  let days = '';
  // November 2026 starts on a Sunday → six leading cells from October.
  const lead = [26, 27, 28, 29, 30, 31];
  for (const d of lead) days += `<span class="cal-day is-out">${d}</span>`;
  for (let d = 1; d <= 30; d++) days += `<span class="cal-day${d === 5 ? ' is-today' : ''}" data-day="${d}">${d}</span>`;
  for (let d = 1; days.split('cal-day').length - 1 < 42; d++) days += `<span class="cal-day is-out">${d}</span>`;
  const foot = `<div class="cal-foot"><span class="l">Review on</span><span class="cal-due"><span id="due18">Wed, 18 Nov</span><span id="due24">Tue, 24 Nov</span></span></div>`;
  cal.innerHTML = head + `<div class="cal-grid">${dow}${days}</div>` + foot;
}

/* ---------- cursors ---------- */
function buildCursors() {
  const host = $('#cursors');
  for (const [id, p] of Object.entries(PEOPLE)) {
    const c = document.createElement('div');
    c.className = 'cur'; c.id = 'cur-' + id; c.style.setProperty('--who', `var(--p-${id})`);
    // macOS arrow geometry from Stageshow's kit (MIT, Benji Taylor), filled with the person's colour.
    c.innerHTML = `<svg class="cur-arrow" width="24" height="24" viewBox="0 0 32 32" fill="none"><g transform="translate(10 7)">
      <path d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z" fill="#fff"/>
      <path d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z" fill="var(--who)"/></g></svg>
      <svg class="cur-ibeam" width="10" height="16" viewBox="0 0 10 16" fill="none" overflow="visible">
      <path d="M3 1H7M3 15H7M5 1V15" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M3 1H7M3 15H7M5 1V15" stroke="var(--who)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <span class="cur-press"></span><span class="cur-name">${p.name}</span>`;
    host.append(c);
  }
}

// A path is a list of stops {t, at:[x,y], press?:bool, ibeam?:bool}. Between
// stops the cursor travels on a shallow arc, timed by the stop times.
function cursorAt(path, t) {
  if (!path || !path.length) return null;
  if (t <= path[0].t) return {...path[0], x: path[0].at[0], y: path[0].at[1], p: 0};
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    if (t >= a.t && t <= b.t) {
      if (a.hold) return {x: a.at[0], y: a.at[1], ibeam: a.ibeam};
      const span = b.t - a.t, p = E.travel(clamp((t - a.t) / span));
      const dx = b.at[0] - a.at[0], dy = b.at[1] - a.at[1], len = Math.hypot(dx, dy);
      const bow = b.straight ? 0 : Math.min(40, len * .12) * Math.sin(Math.PI * p);   // shallow arc
      return {x: lerp(a.at[0], b.at[0], p) - dy / (len || 1) * bow, y: lerp(a.at[1], b.at[1], p) + dx / (len || 1) * bow,
              ibeam: p > .7 ? b.ibeam : a.ibeam};
    }
  }
  const z = path[path.length - 1];
  return {x: z.at[0], y: z.at[1], ibeam: z.ibeam};
}

function drawCursor(id, t) {
  const el = $('#cur-' + id), path = PATHS[id];
  const c = cursorAt(path, t);
  if (!c) { el.style.opacity = 0; return; }
  el.style.transform = `translate(${c.x}px, ${c.y}px)`;
  const v = path.vis ? path.vis(t) : 1;
  el.style.opacity = v;
  el.style.setProperty('--ib', c.ibeam ? 1 : 0);
  // presses: a 140 ms dip, matching the library's press feedback timing
  let pr = (path.presses || []).reduce((m, pt) => Math.max(m, between(t, pt, pt + .1, .07, E.out)), 0);
  if (path.hold) pr = Math.max(pr, between(t, path.hold[0], path.hold[1], .07, E.out));
  el.style.setProperty('--press', pr);
}

/* ---------- play / scrub controls (hidden in render) ---------- */
let current = 0, playing = !location.hash.startsWith('#render'), last = null;
function controls() {
  const play = $('#play'), scrub = $('#scrub'), time = $('#time');
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; last = null; };
  scrub.oninput = () => { playing = false; play.textContent = 'Play'; seek(+scrub.value); };
  const tick = now => {
    if (playing) { if (last != null) seek((current + (now - last) / 1000) % DURATION); last = now; }
    scrub.value = current; time.textContent = current.toFixed(2) + ' s';
    requestAnimationFrame(tick);
  };
  seek(0); requestAnimationFrame(tick);
}

window.seek = t => { current = ((t % DURATION) + DURATION) % DURATION; SCENE(current); };

/* =====================================================================
   SCRIPT — beat times (s). Measured targets are resolved in SCRIPT_BUILD.
   ===================================================================== */
const T = {
  in: .45, searchPress: 1.25, typeAt: 1.45, typeStep: .14, tickPress: 2.55,
  grab: 3.35, dragEnd: 4.55, switchPress: 5.2, tabPress: 5.9, dayPress: 6.85,
  selectPress: 7.85, monthlyHover: 8.35, monthlyPress: 8.8,
  pubPress: 9.75, busyEnd: 11.15,
  exit: 13.55, rs: 13.75, step: .08,
};
const TYPED = 'Docs';
const SL0 = 40, SL1 = 72, PG0 = 50, PG1 = 75;

const el = {};
function SCRIPT_BUILD() {
  for (const id of ['tabDay','tabWeek','tabMonth','search','typed','caret','ph','rowDocs','cbDocs','prog','progVal','switch','slider','sliderVal','sliderThumb','publish','pubIdle','pubBusy','pubDone','spin','select','svWeekly','svMonthly','listbox','optWeekly','optMonthly','chkWeekly','chkMonthly','toast','cal'])
    el[id] = document.getElementById(id);
  el.d18 = el.cal.querySelector('[data-day="18"]');
  el.d24 = el.cal.querySelector('[data-day="24"]');


  // Measure targets in the states they will be in.
  const sv = v => { el.slider.style.setProperty('--v', v); return target(el.sliderThumb, .5, .5); };
  const th0 = sv(SL0), th1 = sv(SL1);
  el.listbox.style.opacity = 1;
  const optM = target(el.optMonthly, .3, .55);
  const search = target(el.search, .52, .5), docsCb = target(el.cbDocs, .55, .6);
  const sel = target(el.select, .78, .6), tabM = target(el.tabMonth, .72, .62), sw = target(el.switch, .6, .6);
  const day = target(el.d24, .62, .64);
  const pub = target(el.publish, .82, .7);

  const s = (t, at, o = {}) => ({t, at, ...o});
  const park = [1052, 300], rest = [704, 304];    // park: right margin; rest: a dot in the gutter crossing
  PATHS.you = [
    s(0, park), s(T.in, park),
    s(T.searchPress - .07, search, {ibeam: true}), s(T.typeAt + 4 * T.typeStep + .15, search, {ibeam: true}),
    s(T.tickPress - .06, docsCb), s(T.tickPress + .2, docsCb),
    s(T.grab - .07, th0), s(T.grab + .15, th0), s(T.dragEnd, th1, {straight: true}), s(T.dragEnd + .1, th1),
    s(T.switchPress - .07, sw), s(T.switchPress + .15, sw),
    s(T.tabPress - .07, tabM), s(T.tabPress + .15, tabM),
    s(T.dayPress - .07, day), s(T.dayPress + .2, day),
    s(T.selectPress - .07, sel), s(T.monthlyHover - .2, sel), s(T.monthlyHover, optM), s(T.monthlyPress + .2, optM),
    s(T.pubPress - .07, pub), s(T.busyEnd + .45, pub), s(T.busyEnd + 1.25, rest),
    s(T.exit, rest), s(T.exit + .9, [1060, 420]),
  ];
  PATHS.you.presses = [T.searchPress, T.tickPress, T.switchPress, T.tabPress, T.dayPress, T.selectPress, T.monthlyPress, T.pubPress];
  PATHS.you.hold = [T.grab, T.dragEnd + .05];
  PATHS.you.vis = t => tw(t, T.in - .3, .3, E.out) * (1 - tw(t, T.exit + .2, .45, E.out));

  el.listbox.style.opacity = '';
}

// A reverted state: r(t, i) is 1 once the reset stagger step i has played.
const R = (t, i, d = D.base) => tw(t, T.rs + i * T.step, d, E.default);

function SCENE(t) {
  /* --- Mira: search + checklist --- */
  const focusS = tw(t, T.searchPress, D.fast, E.out) * (1 - tw(t, T.tickPress, D.fast, E.out));
  el.search.style.setProperty('--focus', focusS);
  el.search.style.setProperty('--b', `color-mix(in srgb, var(--ui-border-focus) ${focusS * 100}%, var(--ui-border-subtle))`);
  let n = t < T.typeAt ? 0 : Math.min(TYPED.length, Math.floor((t - T.typeAt) / T.typeStep) + 1);
  const clear = R(t, 6, D.fast);
  if (clear >= 1) n = 0;
  el.typed.textContent = TYPED.slice(0, n);
  el.typed.style.opacity = 1 - clear;
  el.ph.style.opacity = n ? 0 : 1;
  el.caret.style.opacity = focusS;
  const hl = tw(t, T.typeAt + (TYPED.length - 1) * T.typeStep + .05, D.fast, E.out) * (1 - R(t, 6, D.fast));
  el.rowDocs.style.setProperty('--hl', hl);
  const tick = tw(t, T.tickPress, D.base, E.out) * (1 - R(t, 5, D.fast));
  el.cbDocs.style.setProperty('--on', tick);
  const pg = lerp(PG0, PG1, tw(t, T.tickPress + .05, D.base, E.out) * (1 - R(t, 5)));
  el.prog.style.setProperty('--v', pg);
  el.progVal.textContent = Math.round(pg);

  /* --- Tomas: slider --- */
  const drag = E.travel(clamp((t - T.grab - .15) / (T.dragEnd - T.grab - .15)));
  const slv = lerp(SL0, SL1, drag * (1 - R(t, 4, D.slow)));
  el.slider.style.setProperty('--v', slv);
  el.sliderVal.textContent = Math.round(slv);
  const held = between(t, T.grab, T.dragEnd + .05, D.fast, E.out);
  el.sliderThumb.style.setProperty('--thumb-shadow', held > .5 ? 'var(--ui-shadow-md)' : 'var(--ui-shadow-sm)');

  /* --- Ana: tabs, switch, calendar --- */
  const month = tw(t, T.tabPress, D.fast, E.out) * (1 - R(t, 3, D.fast));
  el.tabWeek.style.setProperty('--sel', 1 - month);
  el.tabMonth.style.setProperty('--sel', month);
  el.tabDay.style.setProperty('--sel', 0);
  const swOn = tw(t, T.switchPress, D.fast, E.out) * (1 - R(t, 2, D.fast));
  el.switch.style.setProperty('--on', swOn);
  const d = tw(t, T.dayPress, D.fast, E.out) * (1 - R(t, 0, D.fast));
  const dayPaint = (node, s) => {
    node.style.background = `color-mix(in srgb, var(--ui-bg-accent-subtle) ${s * 100}%, var(--ui-bg-elevated))`;
    node.style.color = `color-mix(in srgb, var(--ui-text-primary) ${s * 100}%, var(--ui-text-muted))`;
    node.style.fontWeight = s > .5 ? 600 : 500;
  };
  dayPaint(el.d18, 1 - d); dayPaint(el.d24, d);
  $('#due18').style.opacity = 1 - d; $('#due24').style.opacity = d;

  /* --- Mira: select --- */
  const open = tw(t, T.selectPress, D.fast, E.out) * (1 - tw(t, T.monthlyPress + .1, D.fast, E.out));
  el.listbox.style.opacity = open;
  el.listbox.style.transform = `scale(${.98 + .02 * open})`;
  el.listbox.style.visibility = open > 0 ? 'visible' : 'hidden';
  const selFocus = between(t, T.selectPress, T.monthlyPress + .6, D.fast, E.out);
  el.select.style.setProperty('--focus', selFocus);
  el.select.style.setProperty('--b', `color-mix(in srgb, var(--ui-border-focus) ${selFocus * 100}%, var(--ui-border-subtle))`);
  const hov = tw(t, T.monthlyHover - .05, D.fast, E.out);
  el.optWeekly.style.setProperty('--hl', 1 - hov);
  el.optMonthly.style.setProperty('--hl', hov);
  const picked = tw(t, T.monthlyPress, D.fast, E.out) * (1 - R(t, 1, D.fast));
  el.chkWeekly.style.opacity = 1 - picked; el.chkMonthly.style.opacity = picked;
  el.optWeekly.style.fontWeight = picked < .5 ? 600 : 400; el.optMonthly.style.fontWeight = picked >= .5 ? 600 : 400;
  el.svWeekly.style.opacity = 1 - picked; el.svMonthly.style.opacity = picked;

  /* --- Tomas: publish → busy → published → toast --- */
  const busy = tw(t, T.pubPress + .04, D.fast, E.out) * (1 - tw(t, T.busyEnd, D.fast, E.out));
  const done = tw(t, T.busyEnd, D.base, E.out) * (1 - tw(t, T.rs - .05, D.base, E.out));
  const idle = 1 - busy - done;
  el.pubIdle.style.opacity = Math.max(0, idle); el.pubBusy.style.opacity = busy; el.pubDone.style.opacity = done;
  el.spin.style.transform = `rotate(${(t * 450) % 360}deg)`;
  const pressed = t >= T.pubPress && t < T.pubPress + .12;
  el.publish.style.setProperty('--press-k', pressed ? 'var(--ui-press-scale)' : 1);
  const hover = between(t, T.pubPress - .1, T.busyEnd + .4, D.fast, E.out);
  el.publish.style.setProperty('--btn-bg', pressed ? 'var(--ui-bg-accent-active)' : `color-mix(in srgb, var(--ui-bg-accent-hover) ${hover * 100}%, var(--ui-bg-accent))`);
  const tIn = tw(t, T.busyEnd + .1, D.enter, E.spring), tOp = tw(t, T.busyEnd + .1, D.slow, E.out);
  const tOut = tw(t, T.exit, D.slow, E.default);
  el.toast.style.transform = `translateY(${(1 - tIn) * 150 + tOut * 24}%)`;
  el.toast.style.opacity = tOp * (1 - tOut);

  /* --- cursors --- */
  for (const id of Object.keys(PEOPLE)) drawCursor(id, t);
}
