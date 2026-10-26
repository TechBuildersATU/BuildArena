/* BuildArena · skor tablosu (Bölüm 8), görevli menüsü: İlk 3 dışa aktarma, gün sonu özeti, ayarlar */
'use strict';

/* =================================================================
   SKOR TABLOSU — Senaryo + Günün Düelloları
   ================================================================= */
const B = { tab: 'sen', filter: 'all' };
$('#flt').innerHTML = `<button data-f="all" class="on">${ic('layers')}Tümü</button>` + V.senaryolar.map(s => `<button data-f="${s.id}" aria-label="${esc(shortName(s))}" title="${esc(shortName(s))}">${ic(s.ikon)}</button>`).join('');
$('#flt').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Sfx.key(); B.filter = b.dataset.f; renderBoard(true); });
$('#bTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Sfx.key(); B.tab = b.dataset.tab; renderBoard(true); });
ACT.board = () => goBoard('sen');
ACT['board-duel'] = () => goBoard('duel');
function goBoard(tab) { clearFx(); B.tab = tab; B.filter = 'all'; renderBoard(true); show('s-board'); Sfx.pick(); if (AUTO) setTimeout(() => window.autoLoop && window.autoLoop(), 6000); }
function renderBoard(animate) {
  $$('#bTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === B.tab));
  $('#paneSen').classList.toggle('on', B.tab === 'sen'); $('#paneDuel').classList.toggle('on', B.tab === 'duel');
  $('#bDate').textContent = (STILL ? '4 Kasım' : new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })) + (B.tab === 'sen' ? ' · Senaryo' : ' · Düello');
  if (B.tab === 'sen') renderSen(); else renderDuels();
  const sec = $('#s-board'); sec.classList.remove('go2'); if (animate !== false) { void sec.offsetWidth; sec.classList.add('go2'); }
  paint();
}
function renderSen() {
  $$('#flt button').forEach(b => b.classList.toggle('on', b.dataset.f === B.filter));
  const list = ranked().filter(e => B.filter === 'all' || e.senaryo === B.filter), me = S.entry && S.entry.id;
  const top = [list[1], list[0], list[2]], H = [150, 200, 112], O = [1, 0, 2];
  $('#podium').innerHTML = top.map((e, j) => {
    const r = O[j];
    if (!e) return `<div class="pd empty" style="--m:${MEDAL[r]};--h:${H[j]}px;--o:${j}"><div class="top"><div class="pav">–</div><div class="nm" style="color:var(--dim)">Boş</div></div><div class="bar2"><b>${r + 1}</b></div></div>`;
    const sc = scene(e.senaryo);
    return `<div class="pd${e.id === me ? ' me' : ''}" style="--m:${MEDAL[r]};--h:${H[j]}px;--o:${j}"><div class="top"><div class="pav">${r === 0 ? `<span class="crown">${ic('crown')}</span>` : ''}${esc(initial(e.nick))}</div><div class="nm">${esc(e.nick)}</div><div class="ps">${e.score}<small> /100</small></div><div class="pu">${esc(shortUnvan(e.unvan))}</div></div><div class="bar2"><b>${r + 1}</b>${ic(sc.ikon)}${e.izin ? ic('megaphone') : ''}</div></div>`;
  }).join('');
  const row = (e, rk, i) => { const sc = scene(e.senaryo); return `<div class="tr2${e.id === me ? ' me' : ''}" style="--r:${i}"><span class="rk">${rk}</span><span class="iv">${esc(initial(e.nick))}</span><span class="nm"><span>${esc(e.nick)}</span>${e.id === me ? '<span class="tag">SEN</span>' : ''}${e.izin ? ic('megaphone') : ''}</span><span class="sn">${ic(sc.ikon)}${esc(shortName(sc))}</span><span class="un">${esc(shortUnvan(e.unvan))}</span><span class="tm">${hhmm(e.zaman)}</span><span class="sc">${e.score}</span></div>`; };
  const meIdx = list.findIndex(e => e.id === me);
  let html = list.slice(3, 13).map((e, i) => row(e, i + 4, i)).join('');
  if (meIdx >= 13) html += '<div class="tr2 gap">• • •</div>' + row(list[meIdx], meIdx + 1, 11);
  $('#lb').innerHTML = list.length <= 3 ? `<div class="tempty">${list.length ? 'İlk 3\'ten sonrası burada listelenir.' : 'Henüz oyun yok. İlk krizi sen çöz!'}</div>` : html;
}
function renderDuels() {
  const list = [...duels].sort((a, b) => b.zaman - a.zaman);
  $('#dCount').innerHTML = `${ic('swords')}${list.length} düello`;
  $('#dl').innerHTML = list.length ? list.slice(0, 8).map((d, i) => {
    const g = task(d.gorev), p = (x, k) => `<span class="pl ${k ? 'r' : 'l'}"><i class="d" style="--m:var(--p${k + 1})"></i><span class="n">${esc(x.nick)}</span><span class="s">${x.total}</span>${d.kazanan === k ? ic('crown') : ''}</span>`;
    return `<div class="dr ${d.kazanan === 1 ? 'lose-l' : d.kazanan === 0 ? 'lose-r' : ''}" style="--r:${i}"><span class="tm">${hhmm(d.zaman)}</span><span class="tk">${ic(g.ikon)}${esc(g.kisa)}</span>${p(d.p[0], 0)}<span class="vs2">${d.kazanan === -1 ? 'BERABERE' : 'VS'}</span>${p(d.p[1], 1)}</div>`;
  }).join('') : '<div class="tempty">Bugün henüz düello oynanmadı.</div>';
}

/* =================================================================
   GÖREVLİ MENÜSÜ
   ================================================================= */
const A = { tab: 'top' };
ACT.pin = () => openPin(goAdmin);
ACT.admin = () => goAdmin();
$('#aTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; Sfx.key(); A.tab = b.dataset.tab; renderAdmin(); });
function goAdmin() { clearFx(); A.tab = 'top'; show('s-admin'); renderAdmin(); }
async function renderAdmin() {
  $$('#aTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === A.tab));
  $('#paneTop').classList.toggle('on', A.tab === 'top'); $('#paneStats').classList.toggle('on', A.tab === 'stats'); $('#paneSet').classList.toggle('on', A.tab === 'set');
  if (A.tab === 'top') {
    const { top, skipped } = shareTop();
    $('#alist').innerHTML = top.length ? top.map((e, i) => `<div class="arow"><span class="md" style="--m:${MEDAL[i]}">${i + 1}</span><span><b>${esc(e.nick)}</b><br><small>${esc(e.unvan)} · ${esc(shortName(scene(e.senaryo)))}</small></span><span class="sc">${e.score}</span>${ic('megaphone')}</div>`).join('') : '<div class="tempty">Paylaşım izni veren oyuncu yok.</div>';
    $('#askip').innerHTML = skipped.length ? `${ic('info')}<span>${skipped.map(e => `<b>${esc(e.nick)}</b>`).join(', ')} paylaşım izni vermediği için listeye alınmadı.</span>` : '';
    paint();
    await drawShare($('#cvPost'), 'post', top); await drawShare($('#cvStory'), 'story', top);
    sizeCv($('#cvPost'), 330, 412); sizeCv($('#cvStory'), 232, 412);
  } else if (A.tab === 'stats') {
    const st = dayStats();
    $('#stTiles').innerHTML = [[st.senaryo, 'kriz çözüldü'], [st.duello, 'düello oynandı'], [st.ort, 'ortalama senaryo puanı']].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    $('#stFacts').innerHTML = st.facts.map(f => `<div>${ic(f.i)}<span>${f.html}</span></div>`).join('') || '<div>Özet için henüz yeterli oyun yok.</div>';
    paint();
    await drawStats($('#cvStats'), 'post', st); await drawStats($('#cvStatsS'), 'story', st);
    sizeCv($('#cvStats'), 330, 412); sizeCv($('#cvStatsS'), 232, 412);
  } else renderSettings();
}
const sizeCv = (cv, w, h) => { cv.style.width = w + 'px'; cv.style.height = h + 'px'; };
function shareTop() {
  const all = ranked(), top = all.filter(e => e.izin).slice(0, 3);
  const lastIdx = top.length ? all.indexOf(top[top.length - 1]) : -1;
  return { top, skipped: all.slice(0, lastIdx + 1).filter(e => !e.izin) };
}
function download(cv, name) {
  try { cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast(`${ic('check')}${name} indirildi`); }, 'image/png'); }
  catch (e) { toast(`${ic('triangle-alert')}Görsel indirilemedi`); }
}
ACT['dl-post'] = () => download($('#cvPost'), 'buildarena-ilk3-gonderi.png');
ACT['dl-story'] = () => download($('#cvStory'), 'buildarena-ilk3-hikaye.png');
ACT['dl-stats'] = () => download($('#cvStats'), 'buildarena-gun-sonu-ozeti.png');
ACT['dl-stats-story'] = () => download($('#cvStatsS'), 'buildarena-gun-sonu-hikaye.png');

/* ---------- ayarlar ---------- */
function renderSettings() {
  const seg = (k, vals, unit) => `<div class="seg3">${vals.map(v => `<button data-set="${k}" data-v="${v}" class="${AYAR[k] === v ? 'on' : ''}">${v} ${unit}</button>`).join('')}</div>`;
  const sw = k => `<button class="switch${AYAR[k] ? ' on' : ''}" data-set="${k}" aria-label="${k}"></button>`;
  $('#setg').innerHTML = `
    <div class="setr">${ic('swords')}<div class="lab">Düello süresi<small>Proje dokümanı: Kolay 120 · Orta 90 · Zor 60 sn</small></div>${seg('duelSec', [60, 90, 120], 'sn')}</div>
    <div class="setr">${ic('route')}<div class="lab">Senaryo adım süresi<small>Varsayılan 20 sn</small></div>${seg('stepSec', [15, 20, 25], 'sn')}</div>
    <div class="setr">${ic('volume-2')}<div class="lab">Ses efektleri<small>Stant gürültüsünde kapatılabilir</small></div>${sw('ses')}</div>
    <div class="setr">${ic('presentation')}<div class="lab">Bekleme modunda tutorial döngüsü<small>60 sn dokunulmazsa slaytlar kendiliğinden döner</small></div>${sw('idleTut')}</div>`;
  paint();
}
$('#setg').addEventListener('click', e => {
  const b = e.target.closest('[data-set]'); if (!b) return; const k = b.dataset.set;
  AYAR[k] = b.dataset.v ? Number(b.dataset.v) : !AYAR[k]; saveAyar(); Sfx.key(); renderSettings();
});
ACT['reset-tut'] = () => { Store.del(KEY.tut); toast(`${ic('check')}Tutorial bir sonraki açılışta gösterilecek`); };
ACT['reset-day'] = () => {
  if (!STILL && !confirm('Günün skorları ve düelloları arşivlenip tablo sıfırlansın mı?')) return;
  Store.set(KEY.arsiv + new Date().toISOString().slice(0, 16), { scores, duels });
  scores = []; duels = []; saveScores(); saveDuels(); S.entry = null;
  toast(`${ic('archive')}Gün arşivlendi, tablolar sıfırlandı`);
};
ACT['load-demo'] = () => { const o = ornekVeri(); scores = o.scores; duels = o.duels; saveScores(); saveDuels(); toast(`${ic('database')}Örnek veriler yüklendi`); };

/* =================================================================
   GÜN SONU İSTATİSTİKLERİ (kişisel veri içermez)
   ================================================================= */
function dayStats() {
  const sen = scores, du = duels, st = { senaryo: sen.length, duello: du.length, ort: sen.length ? Math.round(sen.reduce((a, e) => a + e.score, 0) / sen.length) : 0, facts: [] };
  // en zor karar: en iyi seçeneği bulanların oranı en düşük adım (en az 3 oyun)
  let hard = null;
  V.senaryolar.forEach(sc => {
    const plays = sen.filter(e => e.senaryo === sc.id && Array.isArray(e.secimler));
    if (plays.length < 3) return;
    sc.adimlar.forEach((a, i) => {
      const bestId = a.secenekler.find(o => o.puan === 20).id, r = plays.filter(e => e.secimler[i] === bestId).length / plays.length;
      if (!hard || r < hard.r) hard = { r, sc, a, n: plays.length };
    });
  });
  st.hard = hard;
  // en popüler senaryo
  const cnt = {}; sen.forEach(e => (cnt[e.senaryo] = (cnt[e.senaryo] || 0) + 1));
  const popId = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  st.pop = popId ? { sc: scene(popId), n: cnt[popId] } : null;
  // düelloda en çok düşülen tuzak
  const trap = {}; du.forEach(d => { const g = task(d.gorev); d.p.forEach(p => p.box.filter(c => g.tuzak.includes(c)).forEach(c => (trap[c] = (trap[c] || 0) + 1))); });
  const trapId = Object.keys(trap).sort((a, b) => trap[b] - trap[a])[0];
  st.trap = trapId ? { k: card(trapId), n: trap[trapId] } : null;
  // en yoğun saat
  const hrs = {}; [...sen, ...du].forEach(e => { const h = new Date(e.zaman).getHours(); hrs[h] = (hrs[h] || 0) + 1; });
  const peak = Object.keys(hrs).sort((a, b) => hrs[b] - hrs[a])[0];
  st.peak = peak !== undefined ? { h: +peak, n: hrs[peak] } : null;
  // unvan dağılımı (tek seri, sabit sıra)
  st.unvan = V.unvanlar.map(u => ({ ad: shortUnvan(u.ad), n: sen.filter(e => e.score >= u.min && e.score <= u.max).length }));
  st.best = sen.length ? Math.max(...sen.map(e => e.score)) : 0;
  if (hard) st.facts.push({ i: 'flame', html: `En zor karar: <b>${esc(shortName(hard.sc))} · ${esc(cap(hard.a.konu))}</b> — oyuncuların yalnızca <b>%${Math.round(hard.r * 100)}</b>'i en iyi seçeneği buldu` });
  if (st.pop) st.facts.push({ i: st.pop.sc.ikon, html: `En popüler kriz: <b>${esc(st.pop.sc.baslik)}</b> (${st.pop.n} oyun)` });
  if (st.trap) st.facts.push({ i: st.trap.k.ikon, html: `Düelloda en çok düşülen tuzak: <b>${esc(st.trap.k.ad)}</b> (${st.trap.n} kez)` });
  if (st.peak) st.facts.push({ i: 'clock', html: `En yoğun saat: <b>${String(st.peak.h).padStart(2, '0')}:00–${String(st.peak.h + 1).padStart(2, '0')}:00</b>` });
  if (st.best) st.facts.push({ i: 'crown', html: `Günün en yüksek senaryo puanı: <b>${st.best}/100</b>` });
  return st;
}

/* =================================================================
   CANVAS ÇİZİMLERİ: İlk 3 paylaşımı + gün sonu özeti (internet gerekmez)
   ================================================================= */
const F = (w, s) => `${w} ${s}px "Plus Jakarta Sans", "Segoe UI", sans-serif`;
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
const pascal = k => k.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join('');
const iconCache = {};
/* Lucide ikonunu SVG olarak canvas'a çizilebilir resme çevirir */
function iconImg(name, color, size = 48) {
  const key = name + color + size; if (iconCache[key]) return iconCache[key];
  let node = (lucide.icons || {})[pascal(name)];
  if (node && node[0] === 'svg') node = node[2];
  const kids = (node || []).map(([tag, at]) => `<${tag} ${Object.entries(at).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${kids}</svg>`;
  return (iconCache[key] = loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)));
}
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.lineTo(X + w - r, Y); x.quadraticCurveTo(X + w, Y, X + w, Y + r); x.lineTo(X + w, Y + h - r); x.quadraticCurveTo(X + w, Y + h, X + w - r, Y + h); x.lineTo(X + r, Y + h); x.quadraticCurveTo(X, Y + h, X, Y + h - r); x.lineTo(X, Y + r); x.quadraticCurveTo(X, Y, X + r, Y); x.closePath(); }
function rrTop(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.lineTo(X + w - r, Y); x.quadraticCurveTo(X + w, Y, X + w, Y + r); x.lineTo(X + w, Y + h); x.lineTo(X, Y + h); x.lineTo(X, Y + r); x.quadraticCurveTo(X, Y, X + r, Y); x.closePath(); }
function fitFont(x, text, w, max, weight = 800) { let s = max; do { x.font = F(weight, s); s -= 2; } while (x.measureText(text).width > w && s > 14); }
function lerpHex(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), Bb = p(b); return `rgb(${A.map((v, i) => Math.round(v + (Bb[i] - v) * t)).join(',')})`; }
function ringText(x, cx, cy, R, text, size) {
  const stops = ['#E2498F', '#B05BC9', '#4B9EFF', '#F28F4B'];
  x.save(); x.font = F(800, size); x.textAlign = 'center'; x.textBaseline = 'middle';
  const chars = [...text], ws = chars.map(c => x.measureText(c).width + size * .18), tot = ws.reduce((a, b) => a + b, 0);
  let acc = 0;
  chars.forEach((c, i) => { const mid = acc + ws[i] / 2; acc += ws[i]; const t = mid / tot, a = -Math.PI / 2 + t * Math.PI * 2, seg = Math.min(2, Math.floor(t * 3)), lt = t * 3 - seg;
    x.save(); x.translate(cx + R * Math.cos(a), cy + R * Math.sin(a)); x.rotate(a + Math.PI / 2); x.fillStyle = lerpHex(stops[seg], stops[seg + 1], lt); x.fillText(c, 0, 0); x.restore(); });
  x.restore();
}
async function baseCanvas(cv, kind) {
  const W = 1080, H = kind === 'story' ? 1920 : 1350; cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  try { await document.fonts.load(F(800, 40)); await document.fonts.load(F(600, 40)); } catch (e) { /* sistem fontu */ }
  x.fillStyle = '#131218'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, -120, 40, W / 2, -120, 1200); g.addColorStop(0, 'rgba(255,255,255,.09)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.lineWidth = 3; x.lineCap = 'round';
  [['rgba(242,143,75,.18)', 0], ['rgba(226,73,143,.16)', 1], ['rgba(75,158,255,.16)', 2]].forEach(([c, i]) => {
    x.strokeStyle = c; const y0 = H - 120 - i * 70;
    x.beginPath(); x.moveTo(0, y0); x.lineTo(150 + i * 40, y0); x.lineTo(190 + i * 40, y0 - 40); x.lineTo(330 + i * 30, y0 - 40); x.stroke(); x.beginPath(); x.arc(338 + i * 30, y0 - 40, 7, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(W, y0 + 30); x.lineTo(W - 160 - i * 40, y0 + 30); x.lineTo(W - 200 - i * 40, y0 - 10); x.lineTo(W - 320 - i * 30, y0 - 10); x.stroke(); x.beginPath(); x.arc(W - 328 - i * 30, y0 - 10, 7, 0, 7); x.stroke();
  });
  for (let i = 0; i < (kind === 'story' ? 40 : 30); i++) {
    const side = i % 2 ? W - 30 - (i * 37) % 150 : 30 + (i * 53) % 150, py = 40 + (i * 131) % (kind === 'story' ? 1150 : 760);
    x.save(); x.translate(side, py); x.rotate(i); x.fillStyle = CONF[i % CONF.length]; x.globalAlpha = .6; x.fillRect(-4, -8, 8, 16); x.restore();
  }
  return { x, W, H };
}
async function headerBlock(x, W, story, L, cy, eyebrow, a, b) {
  const cx = W / 2, img = await loadImg(window.LOGO_DATA); if (img) x.drawImage(img, cx - L / 2, cy - L / 2, L, L);
  ringText(x, cx, cy, L / 2 + (story ? 50 : 40), 'ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • ATÜ • TECHBUILDERS • ', story ? 27 : 22);
  let y = cy + L / 2 + (story ? 150 : 112);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = '#A8A3B3'; x.font = F(800, story ? 30 : 26);
  if ('letterSpacing' in x) x.letterSpacing = '6px';
  x.fillText(eyebrow, cx, y); if ('letterSpacing' in x) x.letterSpacing = '0px';
  y += story ? 100 : 80; x.font = F(800, story ? 84 : 70);
  const wa = x.measureText(a).width, wb = x.measureText(b).width;
  x.textAlign = 'left'; x.fillStyle = '#F5F2ED'; x.fillText(a, cx - (wa + wb) / 2, y); x.fillStyle = '#E2498F'; x.fillText(b, cx - (wa + wb) / 2 + wa, y); x.textAlign = 'center';
  return y;
}
function footer(x, W, H, story, line) {
  x.textAlign = 'center'; x.fillStyle = '#8A859C'; x.font = F(600, story ? 28 : 24); x.fillText(line, W / 2, H - (story ? 150 : 84));
  x.fillStyle = '#E2498F'; x.font = F(800, story ? 34 : 28); x.fillText('#BuildArena', W / 2, H - (story ? 100 : 42));
}
async function drawShare(cv, kind, top) {
  const story = kind === 'story', { x, W, H } = await baseCanvas(cv, kind), cx = W / 2;
  let y = await headerBlock(x, W, story, story ? 330 : 250, story ? 330 : 205, '4 KASIM STANT · SENARYO MODU', 'BuildArena ', 'Şampiyonları');
  if (story) { y += 70; x.fillStyle = '#A8A3B3'; x.font = F(600, 32); x.fillText('Kriz anında en doğru kararları onlar verdi!', cx, y); }
  const base = H - (story ? 250 : 170), colW = 290, gap = 26, Hs = story ? [320, 420, 250] : [215, 285, 170], ord = [1, 0, 2];
  const xs = [cx - colW * 1.5 - gap, cx - colW / 2, cx + colW / 2 + gap];
  ord.forEach((r, j) => {
    const e = top[r], X = xs[j], h = Hs[j], m = MEDAL_HEX[r];
    x.fillStyle = '#1B1A21'; rrTop(x, X, base - h, colW, h, 28); x.fill();
    x.save(); rrTop(x, X, base - h, colW, h, 28); x.clip(); x.fillStyle = m; x.globalAlpha = .16; x.fillRect(X, base - h, colW, h); x.globalAlpha = 1; x.fillRect(X, base - h, colW, 8); x.restore();
    x.fillStyle = m; x.font = F(800, story ? 150 : 120); x.textAlign = 'center'; x.fillText(String(r + 1), X + colW / 2, base - h + (story ? 170 : 140));
    const ay = base - h - (story ? 250 : 210);
    x.beginPath(); x.arc(X + colW / 2, ay, story ? 52 : 44, 0, 7); x.fillStyle = e ? m : '#312E3A'; x.fill();
    x.fillStyle = '#131218'; x.font = F(800, story ? 46 : 38); x.textBaseline = 'middle'; x.fillText(e ? initial(e.nick) : '–', X + colW / 2, ay + 2); x.textBaseline = 'alphabetic';
    if (r === 0 && e) { const c = X + colW / 2, cyy = ay - (story ? 80 : 70), w2 = 34; x.fillStyle = '#F5C451'; x.beginPath(); x.moveTo(c - w2, cyy + 18); x.lineTo(c - w2, cyy - 10); x.lineTo(c - 14, cyy + 6); x.lineTo(c, cyy - 20); x.lineTo(c + 14, cyy + 6); x.lineTo(c + w2, cyy - 10); x.lineTo(c + w2, cyy + 18); x.closePath(); x.fill(); }
    const nm = e ? e.nick : 'Henüz yok'; x.fillStyle = e ? '#F5F2ED' : '#8A859C'; fitFont(x, nm, colW - 20, story ? 40 : 34); x.fillText(nm, X + colW / 2, ay + (story ? 104 : 88));
    if (e) {
      x.font = F(800, story ? 64 : 54); const sv = String(e.score), sw = x.measureText(sv).width; x.font = F(700, story ? 28 : 24); const tw = x.measureText(' /100').width;
      const sx = X + colW / 2 - (sw + tw) / 2; x.textAlign = 'left'; x.font = F(800, story ? 64 : 54); x.fillStyle = '#F5F2ED'; x.fillText(sv, sx, ay + (story ? 172 : 148));
      x.font = F(700, story ? 28 : 24); x.fillStyle = '#A8A3B3'; x.fillText(' /100', sx + sw, ay + (story ? 172 : 148)); x.textAlign = 'center';
      x.font = F(600, story ? 26 : 22); x.fillStyle = '#A8A3B3'; x.fillText(shortUnvan(e.unvan), X + colW / 2, ay + (story ? 210 : 182));
    }
  });
  footer(x, W, H, story, 'ATÜ TechBuilders · Yazılım üretir, kampüse değer katarız.');
}
async function drawStats(cv, kind, st) {
  const story = kind === 'story', { x, W, H } = await baseCanvas(cv, kind), cx = W / 2, M = 90;
  let y = await headerBlock(x, W, story, story ? 260 : 170, story ? 280 : 150, '4 KASIM STANT · GÜNÜN ÖZETİ', 'BuildArena\'da ', 'bugün');
  // 3 sayı karosu
  y += story ? 70 : 40;
  const tiles = [[st.senaryo, 'kriz çözüldü'], [st.duello, 'düello oynandı'], [st.ort, 'ortalama puan']], tw = (W - 2 * M - 2 * 24) / 3, th = story ? 200 : 150;
  tiles.forEach(([v, l], i) => {
    const X = M + i * (tw + 24); x.fillStyle = '#1E1D25'; rr(x, X, y, tw, th, 28); x.fill(); x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2; rr(x, X, y, tw, th, 28); x.stroke();
    x.textAlign = 'center'; x.fillStyle = '#F5F2ED'; x.font = F(800, story ? 96 : 80); x.fillText(String(v), X + tw / 2, y + th * .55);
    x.fillStyle = '#A8A3B3'; x.font = F(700, story ? 28 : 24); x.fillText(l, X + tw / 2, y + th * .82);
  });
  y += th + (story ? 64 : 46);
  // unvan dağılımı: tek serili yatay çubuk grafik (renk = marka, değerler yazılı)
  x.textAlign = 'left'; x.fillStyle = '#8A859C'; x.font = F(800, story ? 26 : 22); if ('letterSpacing' in x) x.letterSpacing = '4px'; x.fillText('UNVAN DAĞILIMI', M, y); if ('letterSpacing' in x) x.letterSpacing = '0px';
  y += story ? 32 : 24;
  const maxN = Math.max(1, ...st.unvan.map(u => u.n)), lw = story ? 250 : 220, bw = W - 2 * M - lw - 70, bh = story ? 28 : 22, rg = story ? 50 : 38;
  st.unvan.forEach((u, i) => {
    const Y = y + i * rg; x.fillStyle = '#DAD5E0'; x.font = F(700, story ? 28 : 24); x.textBaseline = 'middle'; x.fillText(u.ad, M, Y + bh / 2);
    x.fillStyle = '#26242E'; rr(x, M + lw, Y, bw, bh, bh / 2); x.fill();
    const w = Math.max(u.n ? bh : 0, bw * u.n / maxN); if (w) { x.fillStyle = '#E2498F'; rr(x, M + lw, Y, w, bh, bh / 2); x.fill(); }
    x.fillStyle = '#F5F2ED'; x.font = F(800, story ? 28 : 24); x.textAlign = 'right'; x.fillText(String(u.n), W - M, Y + bh / 2); x.textAlign = 'left';
  });
  x.textBaseline = 'alphabetic';
  y += st.unvan.length * rg + (story ? 48 : 28);
  // öne çıkanlar
  const facts = [];
  if (st.hard) facts.push(['flame', 'En zor karar', `${shortName(st.hard.sc)} · ${cap(st.hard.a.konu)}`, `%${Math.round(st.hard.r * 100)} doğru`]);
  if (st.pop) facts.push([st.pop.sc.ikon, 'En popüler kriz', st.pop.sc.baslik, `${st.pop.n} oyun`]);
  if (st.trap) facts.push([st.trap.k.ikon, 'En çok düşülen tuzak', st.trap.k.ad, `${st.trap.n} kez`]);
  const fh = story ? 100 : 80;
  for (let i = 0; i < facts.length; i++) {
    const [icn, lab, val, side] = facts[i], Y = y + i * (fh + (story ? 14 : 12));
    x.fillStyle = '#1E1D25'; rr(x, M, Y, W - 2 * M, fh, 24); x.fill();
    x.fillStyle = '#FAF8F5'; rr(x, M + 18, Y + (fh - 60) / 2, 60, 60, 16); x.fill();
    const im = await iconImg(icn, '#1B1A21', 34); if (im) x.drawImage(im, M + 18 + 13, Y + (fh - 60) / 2 + 13, 34, 34);
    x.fillStyle = '#8A859C'; x.font = F(700, story ? 24 : 20); x.fillText(lab, M + 100, Y + fh * .4);
    x.fillStyle = '#F5F2ED'; fitFont(x, val, W - 2 * M - 330, story ? 34 : 29); x.fillText(val, M + 100, Y + fh * .76);
    x.textAlign = 'right'; x.fillStyle = '#E2498F'; x.font = F(800, story ? 32 : 27); x.fillText(side, W - M - 24, Y + fh * .62); x.textAlign = 'left';
  }
  footer(x, W, H, story, 'Katılan herkese teşekkürler! · ATÜ TechBuilders');
}
