/* BuildArena · ilk açılış tutorial'ı (Proje Dokümanı v1.2 Bölüm 4) ve ana ekran (Bölüm 5) */
'use strict';

/* =================================================================
   TUTORIAL — 5 slayt, üstte segmentli slayt bar, Atla / Geri / İleri, kaydırma, basılı tutunca durma
   ================================================================= */
const TUT = [
  { s: 5, eb: 'HOŞ GELDİN', t: 'BuildArena\'ya <span>hoş geldin!</span>', p: 'Doğru kullanıcıya doğru özellik. 2 dakikada bir uygulama tasarla.',
    v: () => `<div class="mini-mode d"><div class="mi">${ic('swords')}</div><div><b>Düello</b><small>2 oyuncu · ${AYAR.duelSec} sn</small></div></div>
      <div class="t-hero"><div class="hero">${heroHTML('t')}</div></div>
      <div class="mini-mode s"><div class="mi">${ic('route')}</div><div><b>Senaryo</b><small>1 oyuncu · 5 adım</small></div></div>` },
  { s: 6, eb: 'GEREKSİNİM NEDİR?', t: 'Her özellik <span>iyi değildir</span>', p: 'Hastane uygulamasında randevu gerekir, sepet gerekmez. İşte gereksinim analizi bu!',
    v: () => `<div class="taskc"><div class="ti">${ic('hospital')}</div><b>Hastane Bilgi Yönetim Sistemi</b><div class="aud"><span class="chip">${ic('user')}Hasta</span><span class="chip">${ic('stethoscope')}Doktor</span><span class="chip">${ic('heart-pulse')}Hemşire</span></div></div>
      <div class="verdicts">
        <div class="vd ok"><span class="vi">${ic('calendar-plus')}</span>Randevu Al<span class="vk">${ic('check')}</span></div>
        <div class="vd ok"><span class="vi">${ic('lock')}</span>Veri Şifreleme<span class="vk">${ic('check')}</span></div>
        <div class="vd no"><span class="vi">${ic('shopping-cart')}</span>Sepet<span class="vk">${ic('x')}</span></div>
      </div>` },
  { s: 7, eb: 'DÜELLO MODU', t: 'Sürükle, bırak, <span>kapış!</span>', p: 'Uygun kartları kendi kutuna sürükle. Tuzak kartlar puan kaybettirir!',
    v: () => `<div style="position:relative;display:flex;gap:50px;align-items:center">
        <div class="tpool">${[['calendar-plus', 'Randevu Al', 1], ['shopping-cart', 'Sepet'], ['pill', 'E-Reçete'], ['lock', 'Veri Şifreleme'], ['flask-conical', 'Tahlil'], ['gift', 'Sadakat']]
          .map(([i, n, src]) => `<div class="tt${src ? ' src' : ''}"><div class="ic">${ic(i)}</div>${n}</div>`).join('')}
          <div class="flyer" style="left:0;top:0"><div class="ic">${ic('calendar-plus')}</div>Randevu Al<i class="fing"></i></div></div>
        <div class="tphone"><div class="scr"><div class="sl"><i class="k">${ic('clipboard-list')}</i>Hasta Kaydı</div><div class="sl"><i class="k">${ic('key-round')}</i>Rol Bazlı Erişim</div><div class="sl t">${ic('arrow-down-to-line')}</div><div class="sl e">${ic('plus')}</div><div class="sl e">${ic('plus')}</div></div></div>
        <div class="tchips"><span class="chip">${ic('users')}2 oyuncu</span><span class="chip">${ic('timer')}${AYAR.duelSec} sn</span><span class="chip">${ic('smartphone')}8 slot</span></div>
      </div>` },
  { s: 7, eb: 'SENARYO MODU', t: 'Her karar <span>sonrakini etkiler</span>', p: 'Tek başına oyna: her adımda en doğru seçeneğe dokun, 5 adımda zirveye çık.',
    v: () => `<div style="display:flex;flex-direction:column;align-items:center">
        <div class="tchain">${[1, 2, 3, 4, 5].map((n, i) => `<div class="n" style="animation-delay:${.4 + i * .7}s">${i < 4 ? ic(['nfc', 'shield-check', 'database-zap', 'salad'][i]) : ic('zap')}</div>${i < 4 ? `<div class="s"><i style="animation-delay:${.6 + i * .7}s"></i></div>` : ''}`).join('')}</div>
        <div class="topts"><div class="dimme"><span class="ic">${ic('door-open')}</span>Önce kapı açılsın</div><div class="pickme"><span class="ic">${ic('shield-check')}</span>Tek işlemde</div><div class="dimme"><span class="ic">${ic('moon')}</span>Gün sonunda toplu</div><div class="dimme"><span class="ic">${ic('ban')}</span>Kontrol kaldırılsın</div></div>
      </div>` },
  { s: 6, eb: 'PUAN VE SKOR TABLOSU', t: 'Yapay zekâ puanlar, <span>sen zirveye çık</span>', p: '100 üzerinden puanını ve kısa bir yorumu gör. Günün ilk 3\'ü paylaşılır!',
    v: () => `<div class="tscore"><div class="tring"><svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="95" fill="none" stroke="rgba(226,73,143,.16)" stroke-width="16"/><circle class="arc" cx="110" cy="110" r="95" fill="none" stroke="#E2498F" stroke-width="16" stroke-linecap="round"/></svg><b>88</b><small>/ 100</small></div>
        <div class="trows"><div style="--m:var(--gold)"><span>1</span><span class="m">A</span>Async Ahtapot<span>96</span></div><div style="--m:var(--silver)"><span>2</span><span class="m">T</span>Turbo Kaplumbağa<span>92</span></div><div class="me" style="--m:var(--bronze)"><span>3</span><span class="m">K</span>Sen<span>88</span></div></div></div>` },
];
const T = { i: 0, anim: null, loop: false, held: false, swX: null };
function buildTut() {
  $('#tSlides').innerHTML = TUT.map((s, i) => `<div class="tslide" data-i="${i}"><div class="tvis">${s.v()}</div><div class="ttxt"><div class="eyebrow">${i + 1} / 5 · ${s.eb}</div><h2>${s.t}</h2><p>${s.p}</p></div></div>`).join('');
  $('#tSegs').innerHTML = TUT.map((s, i) => `<button data-seg="${i}" aria-label="Slayt ${i + 1}"><i></i></button>`).join('');
  $('#tDots').innerHTML = TUT.map(() => '<i></i>').join('') + '<span id="tCnt">1 / 5</span>';
  paint();
}
function tutGo(i) {
  T.i = clamp(i, 0, TUT.length - 1);
  $$('.tslide').forEach((s, j) => { s.classList.toggle('on', j === T.i); s.classList.toggle('left', j < T.i); });
  $$('#tSegs button').forEach((b, j) => { b.classList.toggle('done', j < T.i); b.classList.toggle('cur', j === T.i); b.querySelector('i').getAnimations().forEach(a => a.cancel()); });
  $$('#tDots i').forEach((d, j) => d.classList.toggle('on', j === T.i));
  $('#tCnt').textContent = `${T.i + 1} / 5`;
  $('#tPrev').classList.toggle('hide', T.i === 0);
  const last = T.i === TUT.length - 1;
  $('#tNext').innerHTML = last ? `Hadi Başlayalım ${ic('rocket')}` : `İleri ${ic('chevron-right')}`; paint();
  // aktif slayt sayacı: hikâye tarzı dolan segment
  const seg = $(`#tSegs button[data-seg="${T.i}"] i`);
  if (STILL) { seg.style.transform = 'scaleX(.45)'; return; }
  if (reduced() && !T.loop) return;
  T.anim = seg.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: TUT[T.i].s * 1000, easing: 'linear', fill: 'forwards' });
  T.anim.onfinish = () => { if (T.i < TUT.length - 1) tutGo(T.i + 1); else if (T.loop) tutGo(0); };
  if (T.held) T.anim.pause();
}
function openTutorial(loop = false) { T.loop = loop; show('s-tut'); tutGo(0); }
function finishTut() { Store.set(KEY.tut, 1); T.loop = false; if (T.anim) T.anim.cancel(); show('s-home'); }
ON_HIDE['s-tut'] = () => { if (T.anim) T.anim.cancel(); };
ACT.tutorial = () => openTutorial(false);
ACT['tut-skip'] = () => finishTut();
ACT['tut-prev'] = () => { Sfx.key(); tutGo(T.i - 1); };
ACT['tut-next'] = () => { Sfx.key(); if (T.i === TUT.length - 1) finishTut(); else tutGo(T.i + 1); };
$('#tSegs').addEventListener('click', e => { const b = e.target.closest('[data-seg]'); if (b) { Sfx.key(); tutGo(+b.dataset.seg); } });
/* kaydırma: sola → sonraki, sağa → önceki; basılı tutma: otomatik ilerleme durur. Döngü modunda dokunuş ana ekrana döndürür. */
$('#tSlides').addEventListener('pointerdown', e => {
  if (T.loop) { finishTut(); return; }
  T.swX = toStage(e).x; T.held = true; if (T.anim) T.anim.pause(); $('#s-tut').classList.add('paused');
});
addEventListener('pointerup', e => {
  if (T.swX === null) return;
  const dx = toStage(e).x - T.swX; T.swX = null; T.held = false; $('#s-tut').classList.remove('paused');
  if (dx < -60) { Sfx.key(); tutGo(T.i + 1); } else if (dx > 60) { Sfx.key(); tutGo(T.i - 1); } else if (T.anim) T.anim.play();
});

/* =================================================================
   ANA EKRAN + BEKLEME MODU
   ================================================================= */
$('#s-home .hero').innerHTML = heroHTML('h');
ON_SHOW['s-home'] = () => {
  $('#s-home').classList.remove('idle');
  $('#hDuelSec').innerHTML = `${ic('timer')}${AYAR.duelSec} sn`; paint();
};
ACT.home = () => { clearFx(); if (typeof stopDuel === 'function') stopDuel(); show('s-home'); };
ACT.enterIdle = () => {
  if (AYAR.idleTut) { openTutorial(true); return; }
  const top = [...scores].sort((a, b) => b.score - a.score || a.sure - b.sure || a.zaman - b.zaman).slice(0, 3);
  $('#top3tick').innerHTML = top.length ? `<span>${ic('trophy')}Günün İlk 3'ü</span>` + top.map((e, i) => `<span><i style="--m:${MEDAL[i]}">${i + 1}</i>${esc(e.nick)} · ${e.score}</span>`).join('') : '';
  paint(); $('#s-home').classList.add('idle');
};
/* bekleme modundan çıkış: ilk dokunuş yalnızca uyandırır */
$('#s-home').addEventListener('pointerdown', e => {
  if (!$('#s-home').classList.contains('idle')) return;
  e.preventDefault(); e.stopPropagation(); $('#s-home').classList.remove('idle');
  const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
  document.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 600);
}, true);
