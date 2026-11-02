/* BuildArena · ortak altyapı: ayarlar, depolama, ses, ekran geçişi, efektler, PIN, hareketsizlik */
'use strict';

/* ---------- veri ve ayarlar ---------- */
const V = window.VERI;
const Q = new URLSearchParams(location.search);
const MODE = Q.get('ekran');   // ekran görüntüsü modu (?ekran=...)
const AUTO = Q.has('oto');     // kendi kendine oynayan tanıtım modu (skor kaydetmez)
const STILL = !!MODE;
const PIN_KOD = '1234';
const KEY = {
  skor: 'buildarena.senaryo.skorlar.v1', duel: 'buildarena.duello.kayitlar.v1', son: 'buildarena.senaryo.son',
  tut: 'buildarena.tutorialSeen', ayar: 'buildarena.ayarlar.v1', adlar: 'buildarena.duello.sonAdlar', arsiv: 'buildarena.arsiv.',
};
const Store = {
  get(k, def = null) { if (STILL) return def; try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { if (STILL || AUTO) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* özel pencere vb. */ } },
  del(k) { if (STILL || AUTO) return; try { localStorage.removeItem(k); } catch (e) { /* yok say */ } },
};
const AYAR = Object.assign({ duelSec: 90, stepSec: 20, ses: true, idleTut: false }, Store.get(KEY.ayar, {}));
if (Q.get('sure')) AYAR.stepSec = Number(Q.get('sure')) || AYAR.stepSec;
if (Q.get('dsure')) AYAR.duelSec = Number(Q.get('dsure')) || AYAR.duelSec;
const saveAyar = () => Store.set(KEY.ayar, AYAR);
let scores = [];   // senaryo kayıtları
let duels = [];    // düello kayıtları
const saveScores = () => Store.set(KEY.skor, scores);
const saveDuels = () => Store.set(KEY.duel, duels);

/* ---------- yardımcılar ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (n, c = '') => `<i data-lucide="${n}"${c ? ` class="${c}"` : ''}></i>`;
const paint = () => { try { lucide.createIcons(); } catch (e) { /* ikon kütüphanesi yoksa metin yeter */ } };
const wait = ms => new Promise(r => setTimeout(r, STILL ? 0 : ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lowerTr = s => s.toLocaleLowerCase('tr');
const upperTr = s => s.toLocaleUpperCase('tr');
const cap = s => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const initial = n => (String(n).trim().charAt(0) || '?').toLocaleUpperCase('tr');
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const joinTr = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1];
const mmss = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s % 60))).padStart(2, '0')}`;
const hhmm = t => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const unvanOf = p => V.unvanlar.find(u => p >= u.min && p <= u.max).ad;
const shortUnvan = u => u.replace(' (ama umut var!)', '');
const status = p => p >= 16 ? { k: 's-ok', t: 'İyi', i: 'check' } : p >= 8 ? { k: 's-mid', t: 'Orta', i: 'minus' } : { k: 's-bad', t: 'Zayıf', i: 'x' };
const card = id => V.kartlar.find(c => c.id === id);
const scene = id => V.senaryolar.find(s => s.id === id);
const task = id => V.gorevler.find(g => g.id === id);
const shortName = s => s.baslik.split(':')[0];
const crisisName = s => (s.baslik.split(':')[1] || '').trim();
const MEDAL = ['var(--gold)', 'var(--silver)', 'var(--bronze)'];
const MEDAL_HEX = ['#F5C451', '#C9C6D3', '#D9895A'];
const CONF = ['#E2498F', '#4B9EFF', '#F28F4B', '#3FC2C9', '#B05BC9', '#F5C451'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- sahne ölçekleme: 1280×800 her ekrana sığar ---------- */
const stage = $('#stage');
function fit() { const s = Math.min(innerWidth / 1280, innerHeight / 800); stage.style.transform = `translate(-50%, -50%) scale(${s})`; }
addEventListener('resize', fit); fit();
function stagePt(el) { const sr = stage.getBoundingClientRect(), k = sr.width / 1280, r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k }; }
function stageRect(el) { const sr = stage.getBoundingClientRect(), k = sr.width / 1280, r = el.getBoundingClientRect(); return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k }; }
function toStage(e) { const sr = stage.getBoundingClientRect(), k = sr.width / 1280; return { x: (e.clientX - sr.left) / k, y: (e.clientY - sr.top) / k }; }
const fillLogos = () => $$('[data-logo]').forEach(i => { if (!i.src) i.src = window.LOGO_DATA; });

/* ---------- ses (Web Audio ile üretilir, dosya gerekmez) ---------- */
const Sfx = {
  ctx: null,
  ac() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AYAR.ses = false; } } return this.ctx; },
  tone(f, d = .08, type = 'sine', v = .06, at = 0) {
    if (!AYAR.ses || STILL) return; const c = this.ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .03);
  },
  key() { this.tone(820, .04, 'triangle', .05); },
  tick() { this.tone(1500, .03, 'square', .025); },
  warn() { this.tone(330, .22, 'square', .04); },
  pick() { this.tone(660, .08, 'triangle', .07); this.tone(990, .14, 'triangle', .06, .07); },
  lift() { this.tone(520, .05, 'triangle', .05); },
  drop() { this.tone(300, .07, 'sine', .12); this.tone(760, .06, 'triangle', .05, .04); },
  whoosh() { this.tone(900, .09, 'sine', .03); this.tone(600, .1, 'sine', .03, .05); },
  flutter() { for (let i = 0; i < 7; i++) this.tone(1700 + i * 110, .03, 'sine', .02, i * .07); },
  stamp() { this.tone(110, .2, 'sine', .25); this.tone(70, .24, 'triangle', .12, .02); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .24, 'triangle', .07, i * .12)); },
  alarm() { [0, .34].forEach(a => { this.tone(880, .15, 'sawtooth', .025, a); this.tone(660, .15, 'sawtooth', .025, a + .17); }); },
};
document.addEventListener('pointerdown', () => { const c = Sfx.ctx || (AYAR.ses && Sfx.ac()); if (c && c.state === 'suspended') c.resume(); }, { passive: true, capture: true });

/* ---------- ekran geçişi ve eylemler ---------- */
let CUR = null;
const ON_SHOW = {}, ON_HIDE = {}, ACT = {};
function show(id) {
  if (CUR && CUR !== id && ON_HIDE[CUR]) ON_HIDE[CUR]();
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  CUR = id; fillLogos(); paint(); touchIdle();
  if (ON_SHOW[id]) ON_SHOW[id]();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const f = ACT[b.dataset.act]; if (f) f(b, e);
});
ACT.sound = () => { AYAR.ses = !AYAR.ses; saveAyar(); $$('[data-act="sound"]').forEach(x => (x.innerHTML = ic(AYAR.ses ? 'volume-2' : 'volume-x'))); paint(); if (AYAR.ses) Sfx.pick(); };
function toast(html) { const t = $('#toast'); t.innerHTML = html; paint(); t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }

/* ---------- metin ve sayı animasyonları ---------- */
async function typewriter(el, text, ms = 18) {
  if (STILL || reduced()) { el.textContent = text; return; }
  el.textContent = ''; const tok = (el._tw = {});
  for (let i = 1; i <= text.length; i++) { if (el._tw !== tok) return; el.textContent = text.slice(0, i); await new Promise(r => setTimeout(r, ms)); }
}
function countUp(el, to, ms, fmt = v => v) {
  if (STILL || reduced()) { el.textContent = fmt(to); return Promise.resolve(); }
  return new Promise(res => { const t0 = performance.now(); (function f(now) { const p = Math.min(1, (now - t0) / ms); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(f); else res(); })(t0); });
}

/* ---------- ortak 3-2-1 ---------- */
async function countdown() {
  const cd = $('#cd'); cd.classList.add('on');
  for (const n of ['3', '2', '1', 'Başla!']) {
    cd.innerHTML = `<b class="${n.length > 1 ? 'go' : ''}">${n}</b>`;
    cd.firstChild.animate([{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .35 }, { transform: 'scale(.9)', opacity: 0 }], { duration: n.length > 1 ? 600 : 800, easing: 'ease-out', fill: 'forwards' });
    n.length > 1 ? Sfx.pick() : Sfx.tick();
    await wait(n.length > 1 ? 560 : 780);
  }
  cd.classList.remove('on');
}

/* ---------- konfeti (logo renkleri) ---------- */
function confetti(n = 70, x0 = 0, x1 = 1280) {
  const fx = $('#fx');
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i'), w = rnd(5, 9), round = Math.random() < .35;
    const left = STILL ? (Math.random() < .5 ? rnd(4, 44) : rnd(1236, 1276)) : rnd(x0, x1);
    el.style.cssText = `position:absolute;left:${left}px;top:-16px;width:${w}px;height:${round ? w : w * 1.9}px;border-radius:${round ? '50%' : '2px'};background:${CONF[i % CONF.length]}`;
    fx.appendChild(el);
    const rot = rnd(-540, 540), dx = rnd(-80, 80);
    if (STILL) { el.style.transform = `translate(0px, ${rnd(90, 780)}px) rotate(${rot}deg)`; el.style.opacity = rnd(.6, 1); continue; }
    el.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${dx}px, 840px) rotate(${rot * 2}deg)` }],
      { duration: rnd(2200, 3600), delay: rnd(0, 700), easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' }).onfinish = () => el.remove();
  }
}
const clearFx = () => { $('#fx').innerHTML = ''; };

/* ---------- kelebek (senaryo modunun maskotu) ---------- */
const BF = `<svg class="bf" viewBox="0 0 40 32" aria-hidden="true"><g class="wl"><path d="M20 15C13 3 2 2 3 11c1 6 10 8 17 5z" fill="#E2498F"/><path d="M20 17c-6 1-13 6-11 11 2 4 9 0 11-10z" fill="#B05BC9"/><circle cx="9" cy="10" r="2.2" fill="#4B9EFF"/></g><g class="wr"><path d="M20 15c7-12 18-13 17-4-1 6-10 8-17 5z" fill="#E2498F"/><path d="M20 17c6 1 13 6 11 11-2 4-9 0-11-10z" fill="#B05BC9"/><circle cx="31" cy="10" r="2.2" fill="#4B9EFF"/></g><rect x="19" y="8" width="2" height="16" rx="1" fill="#F5F2ED"/></svg>`;
function ripple(el) { const p = stagePt(el), r = document.createElement('i'); r.className = 'rip'; r.style.left = p.x + 'px'; r.style.top = p.y + 'px'; $('#fx').appendChild(r); setTimeout(() => r.remove(), 900); }
function flyButterfly(fromEl, toEl) {
  return new Promise(res => {
    if (reduced() || STILL) { ripple(toEl); return res(); }
    const p0 = stagePt(fromEl), p3 = stagePt(toEl);
    const p1 = { x: p0.x + rnd(-320, 320), y: p0.y - rnd(140, 220) }, p2 = { x: p3.x + rnd(-160, 160), y: p3.y + rnd(140, 220) };
    const el = document.createElement('div'); el.className = 'bfly'; el.innerHTML = BF; $('#fx').appendChild(el);
    const pts = [], N = 30;
    for (let i = 0; i <= N; i++) {
      const t = i / N, m = 1 - t;
      const x = m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x;
      const y = m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y;
      const dx = 3 * m * m * (p1.x - p0.x) + 6 * m * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      const dy = 3 * m * m * (p1.y - p0.y) + 6 * m * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      pts.push({ x, y, a: Math.atan2(dy, dx) * 180 / Math.PI + 90, s: 1.5 - .7 * t });
    }
    const an = el.animate(pts.map((p, i) => ({ transform: `translate(${p.x - 22}px, ${p.y - 18}px) rotate(${p.a}deg) scale(${p.s})`, opacity: i === N ? 0 : 1 })), { duration: 1000, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
    Sfx.flutter();
    const trail = setInterval(() => {
      const t = Math.min(1, (an.currentTime || 0) / 1000), p = pts[Math.round(t * N)]; if (!p) return;
      const d = document.createElement('i'); d.className = 'trail'; d.style.cssText = `left:${p.x - 3}px;top:${p.y - 3}px;background:${CONF[Math.floor(Math.random() * 3)]}`;
      $('#fx').appendChild(d); setTimeout(() => d.remove(), 760);
    }, 45);
    an.onfinish = () => { clearInterval(trail); el.remove(); ripple(toEl); res(); };
  });
}
/* ara ara ekrandan geçen kelebek (takma ad ve çark ekranlarında) */
function ambientButterfly() {
  if (STILL || reduced() || !['s-nick', 's-wheel', 's-home'].includes(CUR)) return;
  const el = document.createElement('div'); el.className = 'bfly'; el.innerHTML = BF; el.style.opacity = '.85'; $('#fx').appendChild(el);
  const ltr = Math.random() < .5, y0 = rnd(120, 680), pts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, x = ltr ? -60 + 1400 * t : 1340 - 1400 * t, y = y0 + Math.sin(t * Math.PI * 3) * 60 - 80 * t;
    pts.push({ transform: `translate(${x}px, ${y}px) rotate(${(ltr ? 90 : -90) + Math.cos(t * Math.PI * 3) * 25}deg) scale(.9)` }); }
  el.animate(pts, { duration: 9000, easing: 'linear' }).onfinish = () => el.remove();
}
setInterval(ambientButterfly, 13000);

/* ---------- logo halkası + parıltılardan konfeti (ana ekran ve tutorial) ---------- */
function heroHTML(uid) {
  return `<svg class="ring" viewBox="0 0 384 384"><defs><path id="circ${uid}" d="M192,192 m-172,0 a172,172 0 1,1 344,0 a172,172 0 1,1 -344,0"/>
    <linearGradient id="tg${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2498F"/><stop offset=".35" stop-color="#B05BC9"/><stop offset=".65" stop-color="#4B9EFF"/><stop offset="1" stop-color="#F28F4B"/></linearGradient></defs>
    <text font-size="17" fill="url(#tg${uid})"><textPath href="#circ${uid}" textLength="1075" lengthAdjust="spacing">ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • </textPath></text></svg>
    <div class="logo"><img src="${window.LOGO_DATA}" alt="ATÜ TechBuilders logosu"><div class="confetti"></div></div>`;
}
const SPARK = [{ x: 50.0, y: 43.0, a: [-200, -20], n: 11 }, { x: 81.7, y: 32.5, a: [-90, 20], n: 7 }, { x: 80.9, y: 37.8, a: [-50, 40], n: 6 }, { x: 76.0, y: 25.5, a: [-140, -30], n: 6 }];
function sparkBurst(layer, s, still) {
  const g = document.createElement('b'); g.className = 'glint'; g.style.left = s.x + '%'; g.style.top = s.y + '%'; layer.appendChild(g);
  if (!still) g.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1) rotate(45deg)', opacity: 1, offset: .35 }, { transform: 'translate(-50%,-50%) scale(0) rotate(90deg)', opacity: 0 }], { duration: 700 }).onfinish = () => g.remove();
  for (let i = 0; i < s.n; i++) {
    const el = document.createElement('i'), k = Math.random();
    el.className = 'cf ' + (k < .45 ? 'rect' : k < .8 ? 'dot' : 'tri'); el.style.left = s.x + '%'; el.style.top = s.y + '%'; el.style.background = pick(CONF);
    const ang = rnd(s.a[0], s.a[1]) * Math.PI / 180, dist = rnd(70, 150), dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist, rot = rnd(-540, 540), gr = rnd(50, 100);
    layer.appendChild(el);
    if (still) { const p = rnd(.45, .9); el.style.transform = `translate(-50%,-50%) translate(${dx * p}px, ${dy * p + gr * p * p}px) rotate(${rot * p}deg)`; el.style.opacity = 1 - p * .45; continue; }
    el.animate([{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 }, { transform: `translate(-50%,-50%) translate(${dx * .7}px, ${dy * .7 + gr * .15}px) rotate(${rot * .6}deg)`, opacity: 1, offset: .45 }, { transform: `translate(-50%,-50%) translate(${dx}px, ${dy + gr}px) rotate(${rot}deg) scale(.85)`, opacity: 0 }],
      { duration: rnd(1300, 2000), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = () => el.remove();
  }
}
let sparkI = 0;
setInterval(() => {
  if (STILL || reduced()) return;
  $$('.screen.on .hero .confetti').forEach(layer => {
    sparkBurst(layer, SPARK[sparkI % SPARK.length], false);
    if ($('#s-home.idle') && layer.closest('#s-home')) sparkBurst(layer, SPARK[(sparkI + 2) % SPARK.length], false);
  });
  sparkI++;
}, 1200);

/* ---------- PIN (görevli) ---------- */
let pinOk = null, pinVal = '';
$('#pkeys').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', '0', 'DEL'].map(k => `<button data-p="${k}">${k === 'DEL' ? ic('delete') : k === 'X' ? ic('x') : k}</button>`).join('');
$('#pkeys').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const k = b.dataset.p; Sfx.key();
  if (k === 'X') { closePin(); return; }
  pinVal = k === 'DEL' ? pinVal.slice(0, -1) : (pinVal + k).slice(0, 4); pinDots();
  if (pinVal.length === 4) {
    if (pinVal === PIN_KOD) { const f = pinOk; setTimeout(() => { closePin(); if (f) f(); }, 180); }
    else { const d = $('#pdots'); d.classList.add('err'); Sfx.warn(); setTimeout(() => { d.classList.remove('err'); pinVal = ''; pinDots(); }, 450); }
  }
});
function pinDots() { $$('#pdots i').forEach((d, i) => d.classList.toggle('f', i < pinVal.length)); }
function openPin(onOk) { pinOk = onOk; pinVal = ''; pinDots(); $('#pin').classList.add('on'); paint(); }
function closePin() { $('#pin').classList.remove('on'); }
/* logoya 3 sn basılı tutmak görevli menüsünü açar */
document.addEventListener('pointerdown', e => {
  const l = e.target.closest('[data-logo]'); if (!l) return;
  const t = setTimeout(() => openPin(() => ACT.admin && ACT.admin()), 3000);
  const stop = () => { clearTimeout(t); document.removeEventListener('pointerup', stop); document.removeEventListener('pointercancel', stop); };
  document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
});

/* ---------- hareketsizlik: ana ekranda bekleme modu, sonuç ekranlarında ana ekrana dönüş ---------- */
let lastTouch = Date.now();
function touchIdle() { lastTouch = Date.now(); }
document.addEventListener('pointerdown', touchIdle, { capture: true, passive: true });
setInterval(() => {
  if (STILL || AUTO) return;
  const idle = (Date.now() - lastTouch) / 1000;
  if (idle >= 60 && CUR === 's-home' && !$('#s-home').classList.contains('idle') && ACT.enterIdle) ACT.enterIdle();
  if (idle >= 60 && ['s-dres', 's-final', 's-board'].includes(CUR)) { clearFx(); show('s-home'); }
}, 1000);
