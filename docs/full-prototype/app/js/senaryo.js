/* BuildArena · Senaryo modu (Proje Dokümanı v1.2 Bölüm 7, 11.2) — takma ad, kriz çarkı, kriz girişi, 5 karar, final */
'use strict';

const S = { nick: '', shift: false, izin: true, sc: null, step: 0, picks: [], t0: 0, raf: 0, locked: true, entry: null, sheetNext: null };
const EFFECT_MS = 2600;   // kelebek etkisi kartı (dokununca geçer)
const ranked = (list = scores) => [...list].sort((a, b) => b.score - a.score || a.sure - b.sure || a.zaman - b.zaman);
const setStepSecLabels = () => $$('[data-stepsec]').forEach(e => (e.textContent = AYAR.stepSec));

/* =================================================================
   TAKMA AD (Bölüm 7.2)
   ================================================================= */
const NICK_IDEAS = ['Cache Kedisi', 'Null Baykuş', 'Deploy Kartalı', 'Commit Tavşanı', 'Piksel Panda', 'Git Sincabı', 'Kernel Kirpi', 'Lambda Lama', 'Sprint Çitası', 'Docker Yunusu', 'Regex Rakunu', 'Byte Böceği', 'Cursor Kunduzu', 'Bulut Baykuşu'];
const ALLOWED = /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]+$/;
/* Prototip filtresi: kısa bir örnek liste. Uygulamada badwords.json + yapay zekâ denetimi kullanılır. */
const BAD_ANY = ['siktir', 'sikis', 'orospu', 'yarrak', 'pezevenk', 'gavat', 'kahpe', 'ibne', 'amina', 'gotveren', 'fuck', 'shit', 'bitch', 'nazi'];
const BAD_WORD = ['am', 'amk', 'aq', 'oc', 'pic', 'got', 'mal', 'salak', 'aptal', 'gerizekali', 'dangalak', 'sik', 'yavsak', 'kaltak'];
const normNick = s => lowerTr(s).replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c]))
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
function isClean(s) { const n = normNick(s), flat = n.replace(/[^a-z]/g, ''); if (BAD_ANY.some(w => flat.includes(w))) return false; return !n.split(/[^a-z]+/).some(w => BAD_WORD.includes(w)); }
function uniqueNick(n) {
  const taken = new Set(scores.map(s => lowerTr(s.nick)));
  if (!taken.has(lowerTr(n))) return n;
  for (let k = 2; k < 100; k++) { const suf = '_' + k, c = n.slice(0, 16 - suf.length) + suf; if (!taken.has(lowerTr(c))) return c; }
  return n;
}
const KB = [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '_', '-'], ['SHIFT', 'SPACE', 'DEL']];
$('#kb').innerHTML = KB.map(r => `<div class="kr">${r.map(k => k === 'SHIFT' ? `<button class="k mid" data-k="SHIFT">${ic('arrow-big-up')}</button>` : k === 'SPACE' ? '<button class="k wide" data-k=" ">boşluk</button>' : k === 'DEL' ? `<button class="k mid" data-k="DEL">${ic('delete')}</button>` : `<button class="k" data-k="${k}">${k}</button>`).join('')}</div>`).join('');
$('#kb').addEventListener('pointerdown', e => {
  const b = e.target.closest('.k'); if (!b) return;
  b.classList.add('pr'); setTimeout(() => b.classList.remove('pr'), 110);
  const r = document.createElement('i'), br = stageRect(b), p = toStage(e); r.className = 'rp';
  r.style.left = (p.x - br.x - 15) + 'px'; r.style.top = (p.y - br.y - 15) + 'px'; b.appendChild(r); setTimeout(() => r.remove(), 460);
  Sfx.key(); keyIn(b.dataset.k);
});
function keyIn(k) {
  if (k === 'DEL') S.nick = S.nick.slice(0, -1);
  else if (k === 'SHIFT') S.shift = !S.shift;
  else {
    if (S.nick.length >= 16) { bump(); return; }
    if (k === ' ' && (!S.nick.length || S.nick.endsWith(' '))) return;
    let ch = k;
    if (/\p{L}/u.test(k)) { const up = S.shift || !S.nick.length || S.nick.endsWith(' '); ch = up ? k : lowerTr(k); S.shift = false; }
    S.nick += ch;
  }
  renderNick();
}
function bump() { const f = $('#field'); f.classList.remove('err'); void f.offsetWidth; f.classList.add('err'); setTimeout(() => f.classList.remove('err'), 400); }
function checkNick() { const n = S.nick.trim(); return { len: n.length >= 3 && n.length <= 16, chars: n.length > 0 && ALLOWED.test(n), clean: n.length > 0 && isClean(n) }; }
function renderNick() {
  const n = S.nick, r = checkNick(), empty = !n.trim().length;
  $('#nickTx').textContent = n; $('#nickPh').style.display = n ? 'none' : ''; $('#nickCnt').textContent = `${n.length}/16`;
  $$('#rules li').forEach(li => { const ok = r[li.dataset.r]; li.classList.toggle('ok', !empty && ok); li.classList.toggle('bad', !empty && !ok); li.querySelector('.lucide, i').setAttribute('data-lucide', ok || empty ? 'check' : 'x'); });
  $('#cleanTx').textContent = !empty && !r.clean ? 'Bu ad kullanılamıyor, başka bir ad dene.' : 'Herkese uygun bir ad';
  const valid = r.len && r.chars && r.clean, u = valid ? uniqueNick(n.trim()) : '';
  $('#dup').classList.toggle('on', valid && u !== n.trim()); $('#dupTx').innerHTML = `Bugün bu ad alınmış → <b>${esc(u)}</b> olarak kaydedilecek.`;
  $('#startBtn').disabled = !valid;
  $('#pvNm').textContent = n.trim() ? (valid ? u : n) : 'Takma adın'; $('#pvNm').classList.toggle('empty', !n.trim()); $('#pvAv').textContent = n.trim() ? initial(n) : '?';
  $('[data-k="SHIFT"]').classList.toggle('on', S.shift);
  paint();
}
async function typeNick(name, ms = 45) { S.nick = ''; renderNick(); for (const ch of name) { S.nick += ch; renderNick(); Sfx.key(); await wait(ms); } }
ACT.dice = () => {
  const d = $('.dice'); d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll');
  const free = NICK_IDEAS.filter(x => !scores.some(s => lowerTr(s.nick) === lowerTr(x)));
  typeNick(pick(free.length ? free : NICK_IDEAS));
};
ACT.consent = () => { S.izin = !S.izin; $('#consent').classList.toggle('on', S.izin); Sfx.key(); };
ACT.scenario = () => goNick();
ACT.start = () => startGame();
document.addEventListener('keydown', e => {
  if (CUR === 's-nick') {
    if (e.key === 'Backspace') { keyIn('DEL'); e.preventDefault(); }
    else if (e.key === 'Enter') { if (!$('#startBtn').disabled) startGame(); }
    else if (e.key.length === 1 && /[A-Za-zÇĞİÖŞÜçğıöşü0-9 _-]/.test(e.key)) { if (S.nick.length < 16) { S.nick += e.key; renderNick(); Sfx.key(); } else bump(); }
  } else if (CUR === 's-step') {
    if (!S.locked) { const i = 'abcd1234'.indexOf(e.key.toLowerCase()); if (i >= 0) choose(i % 4); }
    else if ((e.key === 'Enter' || e.key === ' ') && S.sheetNext) S.sheetNext();
  }
});
function goNick(keep = false) {
  if (!keep) { S.nick = ''; S.shift = false; S.izin = true; $('#consent').classList.add('on'); }
  S.entry = null; clearFx(); setStepSecLabels(); renderNick(); show('s-nick');
}
function startGame() {
  const r = checkNick(); if (!(r.len && r.chars && r.clean)) { bump(); return; }
  S.nick = uniqueNick(S.nick.trim()); goWheel();
}

/* =================================================================
   KRİZ ÇARKI — 8 senaryo, vurgu yavaşlayarak durur
   ================================================================= */
$('#wtiles').innerHTML = V.senaryolar.map(s => `<div class="wt"><div class="ti">${ic(s.ikon)}</div><b>${esc(shortName(s))}</b><small>${esc(crisisName(s))}</small></div>`).join('');
async function goWheel(forceIdx) {
  $('#wName').textContent = S.nick;
  const tiles = $$('.wt'), N = tiles.length; tiles.forEach(t => (t.className = 'wt')); $('#wstamp').classList.remove('on');
  show('s-wheel');
  const last = Store.get(KEY.son);
  const pool = V.senaryolar.map((s, i) => i).filter(i => V.senaryolar[i].id !== last);
  const target = forceIdx ?? pick(pool);
  const start = Math.floor(Math.random() * N), total = N * 2 + ((target - start + N) % N);
  await wait(350);
  for (let k = 0, i = start; k <= total; k++, i++) {
    tiles.forEach(t => t.classList.remove('hl')); tiles[i % N].classList.add('hl'); Sfx.tick();
    const p = k / total; await wait(50 + 340 * p * p * p);
  }
  tiles.forEach((t, j) => t.classList.add(j === target ? 'win' : 'lose'));
  $('#wstamp').classList.add('on'); Sfx.stamp(); paint();
  await wait(1500);
  goIntro(V.senaryolar[target]);
}

/* =================================================================
   KRİZ GİRİŞİ
   ================================================================= */
function fillIntro(sc) {
  S.sc = sc; S.step = 0; S.picks = [];
  const [h, m] = sc.saat.split(':');
  $('#iClock').innerHTML = `${h}<i>:</i>${m}`;
  $('#iYer').innerHTML = `${ic('map-pin')}${esc(sc.yer)}`; $('#iOlcek').innerHTML = `${ic('users')}${esc(sc.olcek)}`;
  $('#iIc').innerHTML = ic(sc.ikon); $('#iTitle').textContent = sc.baslik;
  $('#iAud').innerHTML = sc.hedefKitle.map(a => `<span class="chip">${ic(a.ikon)}${esc(a.ad)}</span>`).join('');
  const word = `<span>${ic('siren')}KRİZ ALARMI</span><span>${ic('triangle-alert')}${esc(upperTr(sc.sistem))}</span>`;
  $('#mq').innerHTML = word.repeat(6); setStepSecLabels();
}
async function goIntro(sc) { fillIntro(sc); show('s-intro'); Sfx.alarm(); await wait(350); typewriter($('#iText'), sc.giris, 16); }
ACT.go = () => countdown().then(() => goStep(0));

/* =================================================================
   KARAR ADIMI + KELEBEK ETKİSİ
   ================================================================= */
function renderChain(justIdx = -1) {
  $('#chain').innerHTML = S.sc.adimlar.map((a, i) => {
    const p = S.picks[i], cls = p ? 'done' : i === S.step ? 'cur' : 'todo';
    const inner = p ? ic(p.secenek ? p.secenek.ikon : 'timer-off') : `<b>${i + 1}</b>`;
    const lab = p || i === S.step ? cap(a.konu) : `Adım ${i + 1}`;
    return `<div class="cn ${cls}${i === justIdx ? ' just' : ''}" data-i="${i}"><div class="dot">${inner}</div><span>${esc(lab)}</span></div>${i < 4 ? `<div class="seg${S.picks[i] ? ' full' : ''}"><i></i></div>` : ''}`;
  }).join('');
  paint();
}
function fillStep(i) {
  S.step = i; const st = S.sc.adimlar[i];
  $('#gTitle').textContent = S.sc.baslik; $('#gStep').innerHTML = `${ic('git-commit-horizontal')}Adım ${i + 1}/5`;
  $('#gNick').textContent = S.nick; $('#gAv').textContent = initial(S.nick);
  renderChain();
  $('#dLbl').innerHTML = `${ic(st.seviye === 'genel' ? 'globe' : 'search')}DURUM · ADIM ${st.no} · ${st.seviye === 'genel' ? 'GENEL KARAR' : 'DETAY'}`;
  $('#dQ').textContent = st.soru; $('#dQ').classList.remove('in');
  $('#opts').classList.remove('in');
  $('#opts').innerHTML = st.secenekler.map((o, k) => `<button class="opt" data-k="${k}" style="--d:${k * 80}ms"><span class="key">${'ABCD'[k]}</span><span class="oic">${ic(o.ikon)}</span><span class="otx">${esc(o.metin)}</span><span class="ock">${ic('check')}</span></button>`).join('');
  $('#sheet').classList.remove('on', 'late');
  setTimer(AYAR.stepSec); paint();
}
async function goStep(i) {
  S.locked = true; fillStep(i); show('s-step');
  await typewriter($('#dText'), S.sc.adimlar[i].durum, 14);
  $('#dQ').classList.add('in'); await wait(180);
  $('#opts').classList.add('in'); await wait(380);
  S.locked = false; startTimer();
  if (AUTO) setTimeout(() => !S.locked && choose(Math.floor(Math.random() * 4)), rnd(1400, 3000));
}
const TC = 2 * Math.PI * 23;
function setTimer(left) { $('#tArc').style.strokeDashoffset = TC * (1 - left / AYAR.stepSec); $('#tNum').textContent = Math.ceil(left); $('#timer').classList.toggle('low', left <= 5); }
function startTimer() {
  S.t0 = performance.now(); let lastS = AYAR.stepSec; cancelAnimationFrame(S.raf);
  const loop = now => {
    const left = Math.max(0, AYAR.stepSec - (now - S.t0) / 1000); setTimer(left);
    const s = Math.ceil(left); if (s !== lastS) { lastS = s; if (s <= 5 && s > 0) Sfx.tick(); }
    if (left <= 0) { timeout(); return; }
    S.raf = requestAnimationFrame(loop);
  };
  S.raf = requestAnimationFrame(loop);
}
function stopTimer() { cancelAnimationFrame(S.raf); return Math.min(AYAR.stepSec, (performance.now() - S.t0) / 1000); }
ON_HIDE['s-step'] = () => cancelAnimationFrame(S.raf);
$('#opts').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) choose(+b.dataset.k); });
async function choose(k) {
  if (S.locked) return; S.locked = true;
  const used = stopTimer(), st = S.sc.adimlar[S.step], o = st.secenekler[k];
  S.picks.push({ adim: st, secenek: o, puan: o.puan, sure: used });
  const cards = $$('.opt'); cards.forEach((c, j) => c.classList.add(j === k ? 'sel' : 'dim')); Sfx.pick();
  await wait(260);
  await flyButterfly(cards[k].querySelector('.oic'), $(`.cn[data-i="${S.step}"] .dot`));
  renderChain(S.step);
  effectSheet(o.etki, false);
}
function timeout() {
  if (S.locked) return; S.locked = true;
  S.picks.push({ adim: S.sc.adimlar[S.step], secenek: null, puan: 0, sure: AYAR.stepSec });
  $$('.opt').forEach(c => c.classList.add('dim')); Sfx.warn(); renderChain(S.step);
  effectSheet('Karar verilmedi; kriz kendi kendine büyüdü.', true);
}
function fillSheet(text, late) { $('#shLbl').innerHTML = late ? `${ic('timer-off')}SÜRE DOLDU · 0 PUAN` : `${BF}KELEBEK ETKİSİ`; $('#shText').textContent = text; $('#sheet').classList.toggle('late', late); paint(); }
async function effectSheet(text, late) {
  fillSheet(text, late); const sh = $('#sheet'); sh.classList.add('on');
  const bar = $('#shBar'); bar.getAnimations().forEach(a => a.cancel());
  const an = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: EFFECT_MS + 500, easing: 'linear', fill: 'forwards' });
  await new Promise(res => { S.sheetNext = res; an.onfinish = res; });
  S.sheetNext = null; an.cancel(); sh.classList.remove('on');
  await wait(300);
  if (CUR !== 's-step') return;
  if (S.step < 4) goStep(S.step + 1); else goFinal();
}
ACT.next = () => { if (S.sheetNext) S.sheetNext(); };

/* =================================================================
   FİNAL — karar zinciri, puan, unvan, analiz, sıra
   ================================================================= */
/* Jüri analizi: uygulamada yapay zekâ yazar; burada aynı yapıda yerel yedek şablon. */
function analysis(picks, total) {
  const strong = picks.filter(p => p.puan === 20).map(p => p.adim.konu);
  const weak = picks.filter(p => p.puan < 20).sort((a, b) => a.puan - b.puan)[0];
  let s = strong.length >= 2 ? `${cap(joinTr(strong.slice(0, 3)))} kararların çok sağlam. ` : strong.length === 1 ? `${cap(strong[0])} kararın çok sağlam. ` : 'Kriz seni zorladı ama sonuna kadar karar verdin. ';
  if (weak) {
    const best = weak.adim.secenekler.find(o => o.puan === 20);
    s += weak.secenek ? `${cap(weak.adim.konu)} tarafında küçük bir eksik var: "${best.metin}" daha iyi işlerdi. ` : `${cap(weak.adim.konu)} adımında süre doldu; doğru hamle "${best.metin}" olurdu. `;
  }
  s += total >= 90 ? 'Bu sistemi gönül rahatlığıyla teslim ederiz!' : total >= 75 ? 'Biraz cila ile kusursuz olur.' : total >= 55 ? 'Temel sağlam; detaylar biraz daha özen istiyor.' : total >= 35 ? 'Kriz atlatıldı ama yara izi kaldı.' : 'Stajyerlik bir başlangıç; bir tur daha dene!';
  return s;
}
function fillFinal() {
  const total = S.picks.reduce((a, p) => a + p.puan, 0), sure = Math.round(S.picks.reduce((a, p) => a + p.sure, 0)), unvan = unvanOf(total);
  if (!S.entry) {
    S.entry = { id: 'k' + Date.now(), nick: S.nick, score: total, unvan, senaryo: S.sc.id, sure, zaman: STILL ? new Date().setHours(12, 4, 0, 0) : Date.now(), izin: S.izin,
      secimler: S.picks.map(p => (p.secenek ? p.secenek.id : null)) };
    scores.push(S.entry); saveScores(); Store.set(KEY.son, S.sc.id);
  }
  const rank = ranked().findIndex(e => e.id === S.entry.id) + 1;
  $('#fTitle').textContent = S.sc.baslik; $('#fNick').textContent = S.nick; $('#fAv').textContent = initial(S.nick);
  const X = i => (1168 / 5) * (i + .5);
  $('#fc').className = 'fc';
  $('#fc').innerHTML = `<svg class="fpath" viewBox="0 0 1168 20" preserveAspectRatio="none"><line x1="${X(0)}" y1="10" x2="${X(4)}" y2="10"/></svg>` + S.picks.map((p, i) => {
    const s = status(p.puan);
    return `<div class="fn ${s.k}" style="left:${X(i)}px;--i:${i}"><div class="fdot">${ic(p.secenek ? p.secenek.ikon : 'timer-off')}<span class="fb">${ic(s.i)}</span></div><small>ADIM ${i + 1} · ${p.adim.seviye === 'genel' ? 'GENEL' : 'DETAY'}</small><b>${esc(p.secenek ? p.secenek.metin : 'Süre doldu')}</b><em class="st">${ic(s.i)}${s.t}</em><p>${esc(p.secenek ? p.secenek.ozet : 'Karar yok')}</p></div>`;
  }).join('');
  $('#fbars').innerHTML = `<div class="eyebrow" style="margin-bottom:8px">${ic('chart-bar')}ADIM PUANLARI</div>` + S.picks.map((p, i) => { const s = status(p.puan); return `<div class="fbar ${s.k}"><span>${i + 1} · ${esc(cap(p.adim.konu))}</span><div class="trk"><i data-w="${p.puan / 20}" style="transform:scaleX(${STILL ? p.puan / 20 : 0})"></i></div><em>${p.puan}</em></div>`; }).join('');
  $('#fUnvan').textContent = unvan; $('#fUnvan').classList.remove('on');
  $('#fMeta').innerHTML = `<em>${S.picks.filter(p => p.puan === 20).length}/5</em> en iyi karar<br>Toplam süre <em>${mmss(sure)}</em>`;
  $('#fAna').textContent = '';
  $('#fRankS').textContent = rank <= 3 ? 'Günün ilk 3\'ündesin!' : `Bugün ${scores.length} oyuncu arasında ${rank}. sıradasın.`;
  $('#fIzin').innerHTML = S.entry.izin ? `${ic('megaphone')}Paylaşım izni var` : `${ic('eye-off')}Paylaşım izni yok`;
  return { total, rank };
}
async function goFinal() {
  const { total, rank } = fillFinal(); show('s-final');
  const arc = $('#fArc'), C = 540.35;
  if (STILL) {
    $('#fc').classList.add('go'); arc.style.strokeDashoffset = C * (1 - total / 100); $('#fNum').textContent = total; $('#fUnvan').classList.add('on');
    $('#fAna').textContent = analysis(S.picks, total); $('#fRank').textContent = '#' + rank; if (total >= 75) confetti(40); paint(); return;
  }
  await wait(120); $('#fc').classList.add('go');
  S.picks.forEach((p, i) => setTimeout(() => Sfx.tone(520 + i * 90, .09, 'triangle', .05), 300 + i * 240));
  await wait(1500);
  $$('.fbar i').forEach((b, i) => b.animate([{ transform: 'scaleX(0)' }, { transform: `scaleX(${b.dataset.w})` }], { duration: 600, delay: i * 110, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }));
  arc.animate([{ strokeDashoffset: C }, { strokeDashoffset: C * (1 - total / 100) }], { duration: 1400, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  await countUp($('#fNum'), total, 1400);
  $('#fUnvan').classList.add('on'); Sfx.stamp();
  if (total >= 90) { confetti(120); Sfx.fanfare(); } else if (total >= 75) { confetti(60); Sfx.fanfare(); }
  await wait(450);
  typewriter($('#fAna'), analysis(S.picks, total), 16);
  const from = Math.max(rank, scores.length), el = $('#fRank');
  for (let r = from; r >= rank; r--) { el.textContent = '#' + r; Sfx.tick(); await wait(Math.max(30, 380 / Math.max(1, from - rank))); }
  el.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(.3,1.5,.5,1)' });
  if (AUTO) setTimeout(() => ACT.board(), 4000);
}
