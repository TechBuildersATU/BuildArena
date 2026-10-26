/* BuildArena · Düello modu (Proje Dokümanı v1.2 Bölüm 6, 11.1, 13.5)
   İki oyuncu aynı tablette, her biri yalnızca kendi yarısına dokunabilir. */
'use strict';

const HALF = [{ x0: 0, x1: 628 }, { x0: 652, x1: 1280 }];   // 24 px ölü bölge: 628–652
const SLOT_H = 53;                                            // slot yüksekliği + boşluk
const D = { task: null, names: ['', ''], rerolled: [false, false], ready: [false, false], P: [], t0: 0, dur: 90, raf: 0, phase: 'idle', lastSec: -1, res: null };
const drags = new Map();   // pointerId → sürükleme
const holds = new Map();   // pointerId → Bitir basılı tutma

/* ---------- görev ve takma ad seçimi ---------- */
function pickTask(exceptId) { const pool = V.gorevler.filter(g => g.id !== exceptId); return pick(pool); }
function pickNames(keepOther = null) {
  const recent = Store.get(KEY.adlar, []);
  let pool = V.takmaAdlar.filter(n => !recent.includes(n) && n !== keepOther);
  if (pool.length < 2) pool = V.takmaAdlar.filter(n => n !== keepOther);
  const a = shuffle(pool);
  return [a[0], a[1]];
}
function rememberNames(...ns) { const r = Store.get(KEY.adlar, []).filter(n => !ns.includes(n)); Store.set(KEY.adlar, [...ns, ...r].slice(0, 12)); }

/* ---------- 1 · görev kartı + Hazırım ---------- */
function newDuel(keepNames = false) {
  stopDuel(); clearFx(); D.phase = 'idle';
  D.task = pickTask(D.task && D.task.id);
  if (!keepNames) { D.names = pickNames(); D.rerolled = [false, false]; }
  D.ready = [false, false];
  fillCard(); show('s-dcard');
}
function fillCard() {
  const g = D.task;
  $('#dcNo').textContent = `GÖREV #${g.no} · ORTA`;
  $('#dcIc').innerHTML = ic(g.ikon); $('#dcTitle').textContent = g.baslik; $('#dcDesc').textContent = g.aciklama;
  $('#dcAud').innerHTML = g.hedefKitle.map(h => `<div class="a">${ic(h.ikon)}${esc(h.ad)}</div>`).join('');
  $('#dcSec').innerHTML = `${ic('timer')}${AYAR.duelSec} sn`;
  [0, 1].forEach(p => {
    $(`#dcN${p + 1}`).textContent = D.names[p];
    $(`.rr[data-p="${p}"]`).classList.toggle('used', D.rerolled[p]);
    const r = $(`.ready[data-p="${p}"]`); r.classList.toggle('on', D.ready[p]);
    r.innerHTML = D.ready[p] ? `${ic('circle-check')}<span>Hazırım</span>` : `${ic('hand')}<span>Hazır mısın?</span>`;
    $(`#dcS${p + 1}`).textContent = D.ready[p] ? 'Hazır' : 'Bekleniyor…';
    $(`#dcS${p + 1}`).style.color = D.ready[p] ? `var(--p${p + 1})` : '';
  });
  paint();
}
ACT.duel = () => newDuel(false);
ACT.reroll = async b => {
  const p = +b.dataset.p; if (D.rerolled[p] || D.ready[p]) return;
  D.rerolled[p] = true; b.classList.add('roll'); Sfx.pick();
  const nn = pickNames(D.names[1 - p]).find(n => n !== D.names[p] && n !== D.names[1 - p]);
  const el = $(`#dcN${p + 1}`); el.textContent = '';
  for (const ch of nn) { el.textContent += ch; Sfx.key(); await wait(35); }
  D.names[p] = nn; fillCard();
};
ACT.ready = async b => {
  const p = +b.dataset.p; if (D.phase === 'count') return;
  D.ready[p] = !D.ready[p]; Sfx.pick(); fillCard();
  if (D.ready[0] && D.ready[1]) { D.phase = 'count'; rememberNames(...D.names); await wait(350); await countdown(); startDuel(); }
};

/* ---------- 2 · oyun ---------- */
function startDuel() {
  const g = D.task; D.dur = AYAR.duelSec;
  const pool = [...g.kritik, ...g.onemli, ...g.destek, ...g.tuzak];
  D.P = [0, 1].map(i => ({ i, pool: shuffle(pool), box: [], hist: [], done: false, kalan: null, drag: null }));
  $('#dgIc').innerHTML = ic(g.ikon); $('#dgNo').textContent = '#' + g.no; $('#dgTitle').textContent = g.baslik;
  $('#dgAud').innerHTML = g.hedefKitle.map(h => `<span class="chip">${ic(h.ikon)}${esc(h.ad)}</span>`).join('');
  renderHalf(0); renderHalf(1);
  show('s-duel');
  D.phase = 'play'; D.t0 = performance.now(); D.lastSec = -1; loopTimer();
}
function tileHTML(side, id, used, lifted) {
  const k = card(id);
  return `<div class="tile${used ? ' used' : ''}${lifted ? ' lifted' : ''}" data-card="${id}" data-side="${side}" data-from="pool">${used ? `<b class="ok">${ic('check')}</b>` : ''}${k.nfr ? '<span class="nfr">NFR</span>' : ''}<div class="ic">${ic(k.ikon)}</div><span>${esc(k.ad)}</span></div>`;
}
function renderHalf(side) {
  const P = D.P[side], name = D.names[side], n = P.box.length;
  const slots = [];
  for (let k = 0; k < 8; k++) {
    const id = P.box[k];
    slots.push(id ? `<div class="slot" data-card="${id}" data-side="${side}" data-from="box" data-k="${k}"><div class="sic">${ic(card(id).ikon)}</div><span>${esc(card(id).ad)}</span>${ic('grip-vertical', 'g')}</div>`
      : `<div class="slot empty" data-k="${k}">${ic('plus')}</div>`);
  }
  $(`#dh${side}`).innerHTML = `
    <div class="timebar"><i id="tb${side}"></i></div>
    <div class="hdr"><div class="avatar p${side + 1}">${side + 1}</div><div class="pname">${esc(name)}</div>
      <div class="prog">${ic('smartphone')}<div class="bar3"><i style="width:${n / 8 * 100}%"></i></div><b>${n}/8</b></div></div>
    <div class="dbody">
      <div class="pool"><div class="pool-h">${ic('layout-grid')}GEREKSİNİMLER</div><div class="tiles">${P.pool.map(id => tileHTML(side, id, P.box.includes(id), false)).join('')}</div></div>
      <div class="phone" data-phone="${side}"><div class="screen2">
        <div class="sb"><span>9:41</span><span class="r">${ic('signal')}${ic('wifi')}${ic('battery-full')}</span></div>
        <div class="appbar">${ic(D.task.ikon)}Uygulamam<small>${n}/8</small></div>
        <div class="slots">${slots.join('')}</div></div></div>
    </div>
    <div class="dfoot"><button class="hold" data-hold="${side}">${ic('check')}<span>Bitir</span></button><button class="dib" data-act="d-undo" data-p="${side}" aria-label="Geri al">${ic('undo-2')}</button><button class="dib" data-act="d-clear" data-p="${side}" aria-label="Temizle">${ic('trash-2')}</button></div>
    <div class="lockov"><div class="lk">${ic('check')}</div><b>Bitti!</b><span id="lk${side}"></span></div>`;
  $(`#dh${side}`).classList.toggle('fin', P.done);
  if (P.done) $(`#lk${side}`).textContent = `${P.kalan} sn kala · ${n}/8 kart`;
  paint();
}
function loopTimer() {
  const C = 219.9;
  const step = now => {
    if (D.phase !== 'play') return;
    const left = Math.max(0, D.dur - (now - D.t0) / 1000);
    $('#dArc').style.strokeDashoffset = C * (1 - left / D.dur);
    const s = Math.ceil(left); $('#dNum').textContent = mmss(s);
    $('#dTimer').classList.toggle('low', left <= 10);
    D.P.forEach((P, i) => { if (!P.done) { const tb = $(`#tb${i}`); if (tb) tb.style.transform = `scaleX(${left / D.dur})`; } });
    if (s !== D.lastSec) { D.lastSec = s; if (s <= 10 && s > 0) Sfx.tick(); }
    if (left <= 0) { endDuel(); return; }
    D.raf = requestAnimationFrame(step);
  };
  D.raf = requestAnimationFrame(step);
}
const leftSec = () => Math.max(0, Math.floor(D.dur - (performance.now() - D.t0) / 1000));

/* ---------- ekran izolasyonu + sürükle-bırak (Pointer Events, iki parmak aynı anda) ---------- */
$('#s-duel').addEventListener('pointerdown', e => {
  if (D.phase !== 'play') return;
  const p = toStage(e), side = p.x < HALF[0].x1 ? 0 : p.x >= HALF[1].x0 ? 1 : -1;
  if (side < 0) return;                                        // ölü bölge: yok say
  if (e.pointerType === 'touch' && ((e.width || 0) > 60 || (e.height || 0) > 60)) return;   // avuç içi reddi
  const P = D.P[side]; if (P.done) return;
  const hold = e.target.closest('[data-hold]');
  if (hold) { if (+hold.dataset.hold === side) startHold(side, e); return; }
  const el = e.target.closest('[data-card]');
  if (!el || +el.dataset.side !== side) return;                // yalnızca kendi yarısındaki kartlar
  if (P.drag) return;                                          // tek parmak kuralı
  e.preventDefault();
  beginDrag(side, el, e);
}, { passive: false });
addEventListener('pointermove', e => { const d = drags.get(e.pointerId); if (d) { e.preventDefault(); moveDrag(d, e); } }, { passive: false });
addEventListener('pointerup', e => { const d = drags.get(e.pointerId); if (d) endDrag(d, false); stopHold(e.pointerId); });
addEventListener('pointercancel', e => { const d = drags.get(e.pointerId); if (d) endDrag(d, true); stopHold(e.pointerId); });

function beginDrag(side, el, e) {
  const id = el.dataset.card, from = el.dataset.from, k = from === 'box' ? +el.dataset.k : -1, kart = card(id);
  const g = document.createElement('div'); g.className = `ghost p${side + 1}`;
  g.innerHTML = `<div class="ic">${ic(kart.ikon)}</div><span>${esc(kart.ad)}</span>`;
  $('#fx').appendChild(g); paint();
  el.classList.add(from === 'pool' ? 'lifted' : 'lift');
  const phone = $(`#dh${side} .phone`), slots = $(`#dh${side} .slots`);
  const d = { pid: e.pointerId, side, id, from, k, el, g, x: 0, y: 0, phoneR: stageRect(phone), slotsR: stageRect(slots), tgt: null, key: '' };
  D.P[side].drag = d; drags.set(e.pointerId, d);
  Sfx.lift(); moveDrag(d, e);
}
function dropTarget(d) {
  const r = d.phoneR, P = D.P[d.side];
  const inside = d.x > r.x - 24 && d.x < r.x + r.w + 24 && d.y > r.y - 10 && d.y < r.y + r.h + 10;
  if (!inside) return null;
  const idx = clamp(Math.floor((d.y - d.slotsR.y - 10) / SLOT_H), 0, 7);
  if (d.from === 'pool') return P.box.length >= 8 ? { full: true } : { ins: Math.min(idx, P.box.length) };
  return { ins: Math.min(idx, P.box.length - 1) };
}
function moveDrag(d, e) {
  const p = toStage(e), H = HALF[d.side];
  d.x = clamp(p.x, H.x0 + 48, H.x1 - 48);                     // sınır kilidi: kart kendi yarısından çıkamaz
  d.y = clamp(p.y, 150, 752);
  d.g.style.transform = `translate(${d.x - 48}px, ${d.y - 48}px) rotate(${d.side ? 4 : -4}deg) scale(1.06)`;
  const t = dropTarget(d), key = !t ? 'yok' : t.full ? 'dolu' : 'i' + t.ins;
  d.tgt = t;
  if (key === d.key) return;                                   // hedef değişmediyse DOM'a dokunma
  d.key = key;
  const phone = $(`#dh${d.side} .phone`); phone.classList.toggle('hot', !!t);
  $$(`#dh${d.side} .slot.target`).forEach(s => { s.classList.remove('target'); s.innerHTML = ic('plus'); });
  if (t && !t.full && d.from === 'pool') {
    const s = $(`#dh${d.side} .slot[data-k="${D.P[d.side].box.length}"]`);
    if (s && !s.dataset.card) { s.classList.add('target'); s.innerHTML = ic('arrow-down-to-line'); }
  }
  paint();
}
function pushHist(P) { P.hist.push([...P.box]); if (P.hist.length > 30) P.hist.shift(); }
function flyGhost(d, toEl, ok) {
  const g = d.g; drags.delete(d.pid); D.P[d.side].drag = null;
  if (!toEl || STILL) { g.remove(); return; }
  const r = stageRect(toEl), tx = r.x + r.w / 2 - 48, ty = r.y + r.h / 2 - 48;
  const a = g.animate([{ transform: g.style.transform }, { transform: `translate(${tx}px, ${ty}px) rotate(0deg) scale(${ok ? .55 : .9})`, opacity: ok ? .2 : .6 }], { duration: ok ? 180 : 250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  a.onfinish = () => g.remove();
}
function endDrag(d, cancel) {
  const P = D.P[d.side], t = cancel ? null : d.tgt, phone = $(`#dh${d.side} .phone`);
  if (phone) phone.classList.remove('hot');
  if (D.phase !== 'play' || P.done) { d.g.remove(); drags.delete(d.pid); P.drag = null; return; }
  if (t && t.full) {
    phone.classList.remove('full'); void phone.offsetWidth; phone.classList.add('full'); Sfx.warn();
    toast(`${ic('smartphone')}8 slot dolu — önce bir kartı çıkar`);
    renderHalf(d.side); flyGhost(d, $(`#dh${d.side} .tile[data-card="${d.id}"]`), false); return;
  }
  if (t) {
    pushHist(P);
    if (d.from === 'pool') P.box.splice(t.ins, 0, d.id);
    else { const [c] = P.box.splice(d.k, 1); P.box.splice(Math.min(t.ins, P.box.length), 0, c); }
    renderHalf(d.side); Sfx.drop();
    const idx = P.box.indexOf(d.id), slot = $(`#dh${d.side} .slot[data-k="${idx}"]`);
    if (slot) slot.classList.add('newin');
    flyGhost(d, slot, true); return;
  }
  if (d.from === 'box') { pushHist(P); P.box.splice(d.k, 1); Sfx.whoosh(); }     // kutudan dışarı: havuza döner
  renderHalf(d.side); flyGhost(d, $(`#dh${d.side} .tile[data-card="${d.id}"]`), false);
}
function cancelDrags() { drags.forEach(d => { d.g.remove(); D.P[d.side].drag = null; }); drags.clear(); }

/* ---------- Geri al / Temizle / Bitir (0,6 sn basılı tut) ---------- */
ACT['d-undo'] = b => { const P = D.P[+b.dataset.p]; if (!P || P.done || D.phase !== 'play' || !P.hist.length || P.drag) return; P.box = P.hist.pop(); Sfx.whoosh(); renderHalf(P.i); };
ACT['d-clear'] = b => { const P = D.P[+b.dataset.p]; if (!P || P.done || D.phase !== 'play' || !P.box.length || P.drag) return; pushHist(P); P.box = []; Sfx.whoosh(); renderHalf(P.i); };
function startHold(side, e) {
  if ([...holds.values()].some(h => h.side === side)) return;
  e.preventDefault();
  const btn = $(`[data-hold="${side}"]`), h = { side, t0: performance.now(), btn, raf: 0 };
  holds.set(e.pointerId, h); Sfx.tick();
  const step = now => {
    if (holds.get(e.pointerId) !== h) return;
    const p = Math.min(1, (now - h.t0) / 600); btn.style.setProperty('--hp', p);
    if (p >= 1) { holds.delete(e.pointerId); finishSide(side); return; }
    h.raf = requestAnimationFrame(step);
  };
  h.raf = requestAnimationFrame(step);
}
function stopHold(pid) { const h = holds.get(pid); if (!h) return; holds.delete(pid); cancelAnimationFrame(h.raf); h.btn.style.setProperty('--hp', 0); }
function finishSide(side) {
  const P = D.P[side]; if (P.done || D.phase !== 'play') return;
  if (P.drag) { P.drag.g.remove(); drags.delete(P.drag.pid); P.drag = null; }
  P.done = true; P.kalan = leftSec(); Sfx.pick(); renderHalf(side);
  if (D.P.every(x => x.done)) setTimeout(endDuel, 700);
}

/* ---------- puan motoru (Bölüm 11.1) ---------- */
function duelScore(g, box, kalan, dur) {
  const w = {}; g.kritik.forEach(c => (w[c] = 3)); g.onemli.forEach(c => (w[c] = 2)); g.destek.forEach(c => (w[c] = 1));
  const set = new Set(box), agirlik = box.reduce((a, c) => a + (w[c] || 0), 0);
  const uyum = Math.round(agirlik / 18 * 50);
  const traps = box.filter(c => g.tuzak.includes(c));
  const gereksiz = Math.max(0, 20 - 5 * traps.length);
  const done = g.birlesimler.filter(b => b.kartlar.every(c => set.has(c)));
  const birlesim = Math.round(done.length / g.birlesimler.length * 20);
  const sure = uyum >= 25 ? Math.round(kalan / dur * 10) : 0;
  const missing = [...g.kritik, ...g.onemli].filter(c => !set.has(c));
  return { uyum, gereksiz, birlesim, sure, total: uyum + gereksiz + birlesim + sure, traps, done, missing, agirlik, kalan, n: box.length };
}
/* Lakap + jüri yorumu. Uygulamada yapay zekâ yazar; burada aynı ilkelerle çalışan yerel yedek şablon. */
function lakapYorum(g, s) {
  const ad = id => card(id).ad, yer = lowerTr(g.kisa);
  let lakap;
  if (s.total >= 90) lakap = pick(['Gereksinim Gurusu', 'Analiz Makinesi', 'Product Owner Adayı', 'Kusursuz Mimar']);
  else if (s.traps.length >= 2) lakap = `${ad(s.traps[0])} Koleksiyoncusu`;
  else if (s.traps.length === 1) lakap = pick([`Gizli ${ad(s.traps[0])} Hayranı`, `${ad(s.traps[0])} Meraklısı`]);
  else if (s.n <= 4) lakap = pick(['Minimalist Mimar', 'Az Olsun Benim Olsun']);
  else if (s.kalan >= 30 && s.total >= 60) lakap = pick(['Hız Treni Analist', 'Turbo Tasarımcı']);
  else if (s.done.length === g.birlesimler.length) lakap = 'Kombo Ustası';
  else lakap = pick(['Sağlam Temel Ustası', 'Dengeli Tasarımcı', 'Gereksinim Avcısı']);
  const praise = s.done.length ? `"${s.done[0].ad}" birleşimini kurman çok yerinde.` : s.missing.length <= 2 ? 'Kritik kartların neredeyse hepsini doğru seçtin.' : 'Cesur bir tasarım denemesi oldu.';
  const tease = s.traps.length ? `Ama ${yer} uygulamasında "${ad(s.traps[0])}" ne arıyor?`
    : s.missing.length ? `Yalnız "${ad(s.missing[0])}" olmadan kullanıcılar biraz zorlanacak.` : 'Bir dahaki sefere daha da hızlı ol, rekor senin!';
  return { lakap, yorum: `${praise} ${tease}` };
}
function winnerOf(r) {
  const [a, b] = r;
  if (a.total !== b.total) return a.total > b.total ? 0 : 1;
  if (a.traps.length !== b.traps.length) return a.traps.length < b.traps.length ? 0 : 1;
  if (a.kalan !== b.kalan) return a.kalan > b.kalan ? 0 : 1;
  return -1;
}

/* ---------- 3 · bitiş ve sonuç ---------- */
function stopDuel() { cancelAnimationFrame(D.raf); cancelDrags(); holds.clear(); if (D.phase === 'play') D.phase = 'idle'; }
function endDuel() {
  if (D.phase !== 'play') return;
  D.phase = 'end'; cancelAnimationFrame(D.raf); cancelDrags();
  D.P.forEach(P => { if (!P.done) { P.done = true; P.kalan = 0; } });
  const g = D.task, r = D.P.map(P => Object.assign(duelScore(g, P.box, P.kalan, D.dur), { box: [...P.box] }));
  r.forEach(x => Object.assign(x, lakapYorum(g, x)));
  const win = winnerOf(r);
  D.res = { r, win };
  const rec = { id: 'd' + Date.now(), zaman: Date.now(), gorev: g.id, kazanan: win, p: r.map((x, i) => ({ nick: D.names[i], total: x.total, uyum: x.uyum, gereksiz: x.gereksiz, birlesim: x.birlesim, sure: x.sure, kalan: x.kalan, box: x.box, tuzak: x.traps.length, lakap: x.lakap })) };
  duels.push(rec); saveDuels();
  setTimeout(() => showResult(), STILL ? 0 : 500);
}
function resultHalf(i) {
  const x = D.res.r[i], win = D.res.win, CIRC = 2 * Math.PI * 80;
  const parts = [['users', 'Hedef kitle uyumu', x.uyum, 50], ['ban', 'Gereksizden kaçınma', x.gereksiz, 20], ['link-2', 'Birleşimler', x.birlesim, 20], ['timer', 'Süre bonusu', x.sure, 10]];
  const badge = win === i ? `<div class="win">${ic('crown')}Kazanan</div>` : win === -1 ? `<div class="win tie">${ic('equal')}Berabere</div>` : '';
  return `
    <div class="hdr2"><div class="avatar p${i + 1}">${i + 1}</div><div class="pname">${esc(D.names[i])}</div>${badge}</div>
    <div class="nick2"><small>${ic('tag')}LAKABIN</small><b>“${esc(x.lakap)}”</b></div>
    <div class="srow"><div class="ring2"><svg viewBox="0 0 188 188"><circle cx="94" cy="94" r="80" fill="none" stroke="#312E3A" stroke-width="14"/><circle class="arc" cx="94" cy="94" r="80" fill="none" stroke="var(--pc)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg><div class="v"><b>0</b><small>/ 100</small></div></div>
      <div class="bd">${parts.map(([icn, l, v, m]) => `<div class="brow"><div class="ri">${ic(icn)}</div><span>${l}</span><em>${v}/${m}</em><div class="tr3"><i data-w="${v / m}" style="transform:scaleX(0)"></i></div></div>`).join('')}</div></div>
    <div class="bubble"><small>${ic('message-circle')}JÜRİ YORUMU</small><p></p></div>`;
}
async function showResult() {
  const g = D.task; $('#drTask').innerHTML = `${ic(g.ikon)}${esc(g.baslik)}`;
  [0, 1].forEach(i => { $(`#dr${i}`).innerHTML = resultHalf(i); });
  show('s-dres');
  const CIRC = 2 * Math.PI * 80, T0 = 1400;
  const halves = [0, 1].map(i => ({ i, el: $(`#dr${i}`), x: D.res.r[i] }));
  halves.forEach(({ el, x }) => {
    const arc = el.querySelector('.arc'), num = el.querySelector('.v b'), end = CIRC * (1 - x.total / 100);
    if (STILL) { arc.style.strokeDashoffset = end; num.textContent = x.total; el.querySelectorAll('.tr3 i').forEach(b => (b.style.transform = `scaleX(${b.dataset.w})`)); el.querySelector('.nick2 b').classList.add('on'); el.querySelector('.bubble p').textContent = x.yorum; const w = el.querySelector('.win'); if (w) w.classList.add('on'); return; }
    arc.animate([{ strokeDashoffset: CIRC }, { strokeDashoffset: end }], { duration: T0, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    countUp(num, x.total, T0);
    el.querySelectorAll('.tr3 i').forEach((b, k) => b.animate([{ transform: 'scaleX(0)' }, { transform: `scaleX(${b.dataset.w})` }], { duration: 600, delay: 300 + k * 150, easing: 'ease-out', fill: 'forwards' }));
    setTimeout(() => { el.querySelector('.nick2 b').classList.add('on'); Sfx.stamp(); }, T0 + 150);
    setTimeout(() => { const w = el.querySelector('.win'); if (w) { w.classList.add('on'); } }, T0 + 300);
    setTimeout(() => typewriter(el.querySelector('.bubble p'), x.yorum, 18), T0 + 700);
  });
  if (D.res.win >= 0) {
    const x0 = D.res.win === 0 ? 0 : 652;
    if (STILL) confetti(30); else setTimeout(() => { confetti(70, x0, x0 + 628); Sfx.fanfare(); }, T0 + 300);
  }
}
ACT.rematch = () => newDuel(true);
ON_HIDE['s-duel'] = () => { if (D.phase === 'play') stopDuel(); };
