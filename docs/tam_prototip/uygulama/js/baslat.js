/* BuildArena · örnek veri, ekran görüntüsü modları (?ekran=), tanıtım döngüsü (?oto) ve açılış */
'use strict';

/* ---------- örnek veri: görevli menüsünden "Örnek verileri yükle" ya da ?ornek ---------- */
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ornekVeri() {
  const R = mulberry32(20261104), pr = a => a[Math.floor(R() * a.length)];
  const at = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); };
  const NICKS = ['Async Ahtapot', 'Turbo Kaplumbağa', 'Regex Rakunu', 'Null Baykuş', 'Piksel Panda', 'Lambda Lama', 'Git Sincabı', 'Byte Böceği', 'Sprint Çitası', 'Kernel Kirpi', 'Cache Kedisi',
    'Deploy Kartalı', 'Commit Tavşanı', 'Docker Yunusu', 'Cursor Kunduzu', 'Bulut Baykuşu', 'Debug Dedektifi', 'Pixel Penguen', 'Semicolon Sülün', 'Refactor Rakunu', 'Kod Kartalı', 'Firewall Flamingo',
    'Stack Sincabı', 'Merge Maymunu', 'Lag\'siz Leopar', 'Deploy Dervişi', '404 Kedisi', 'Commit Canavarı', 'Sonsuz Döngü', 'Gereksinim Ninjası', 'Spagetti Şef', 'Kahvesiz Kodcu', 'Bugsız Baykuş', 'Sepetsiz Samuray', 'Null Panda', 'Pixel Kartal'];
  const W = { yemekhane: 7, kutuphane: 5, kafe: 5, hastane: 4, magaza: 4, obs: 6, servis: 3, yurt: 2 }, wl = Object.entries(W).flatMap(([k, n]) => Array(n).fill(k));
  const HARD = { 'kafe-3': .2, 'obs-1': .3, 'yemekhane-3': .35, 'servis-4': .3 };   // bazı adımlar bilerek daha zor
  const scores2 = NICKS.map((nick, i) => {
    const sid = i === 0 ? 'hastane' : i === 1 ? 'magaza' : pr(wl), sc = scene(sid), secim = [];
    let total = 0;
    sc.adimlar.forEach((a, k) => {
      const pb = HARD[`${sid}-${k}`] ?? .58, best = a.secenekler.find(o => o.puan === 20), mid = [...a.secenekler].sort((x, y) => y.puan - x.puan)[1], rest = a.secenekler.filter(o => o !== best && o !== mid);
      const rr2 = R(); const o = i < 2 ? best : rr2 < pb ? best : rr2 < pb + .25 ? mid : R() < .1 ? null : pr(rest);
      secim.push(o ? o.id : null); total += o ? o.puan : 0;
    });
    if (i === 0) total = Math.min(total, 96);
    const sure = Math.round(40 + R() * 55), h = 9 + Math.floor(R() * 8), m = Math.floor(R() * 60);
    return { id: 'ornek' + i, nick, score: total, unvan: unvanOf(total), senaryo: sid, sure, zaman: at(h, m), izin: i === 1 ? false : R() < .75, secimler: secim, ornek: true };
  });
  const duels2 = [];
  for (let i = 0; i < 16; i++) {
    const g = pr(V.gorevler), names = [pr(V.takmaAdlar), pr(V.takmaAdlar)]; if (names[0] === names[1]) names[1] = V.takmaAdlar[(V.takmaAdlar.indexOf(names[0]) + 1) % V.takmaAdlar.length];
    const req = [...g.kritik, ...g.onemli, ...g.destek];
    const p = names.map(nick => {
      const box = req.filter(() => R() < .78).concat(g.tuzak.filter(() => R() < .14)).slice(0, 8), kalan = R() < .5 ? 0 : Math.floor(R() * 40);
      const s = duelScore(g, box, kalan, 90); return Object.assign(s, { nick, box });
    });
    const win = winnerOf(p);
    duels2.push({ id: 'ornekd' + i, zaman: at(9 + Math.floor(R() * 8), Math.floor(R() * 60)), gorev: g.id, kazanan: win, ornek: true,
      p: p.map(x => ({ nick: x.nick, total: x.total, uyum: x.uyum, gereksiz: x.gereksiz, birlesim: x.birlesim, sure: x.sure, kalan: x.kalan, box: x.box, tuzak: x.traps.length, lakap: lakapYorum(g, x).lakap })) });
  }
  return { scores: scores2, duels: duels2 };
}

/* ---------- tanıtım döngüsü (?oto): senaryo modunu kendi kendine oynar, skor kaydetmez ---------- */
window.autoLoop = async () => {
  show('s-home'); await wait(2500);
  goNick(); await wait(900);
  await typeNick(pick(NICK_IDEAS), 70); await wait(700); startGame();
  const iv = setInterval(() => { if (CUR === 's-intro' && $('#iText').textContent.length > 20) { clearInterval(iv); setTimeout(() => ACT.go(), 1500); } }, 300);
};

/* ---------- ekran görüntüsü modu (?ekran=...) ---------- */
async function demo(mode) {
  document.body.classList.add('still');
  const o = ornekVeri(); scores = o.scores; duels = o.duels;
  const hb = task('hbys');
  const pk = (sc, idx) => idx.map((k, i) => ({ adim: sc.adimlar[i], secenek: sc.adimlar[i].secenekler[k], puan: sc.adimlar[i].secenekler[k].puan, sure: [9, 14, 12, 16, 11][i] }));
  const sc0 = scene('yemekhane');
  const duelSetup = () => {
    D.task = hb; D.names = ['Turbo Kaplumbağa', 'Bugsız Baykuş']; D.dur = 90; D.phase = 'play';
    D.P = [{ i: 0, pool: ['randevu', 'sepet', 'sifreleme', 'qrmenu', 'hastakaydi', 'tahlil', 'paylas', 'rbac', 'kampanya', 'vital', 'rozet', 'denetim', 'sadakat', 'recete'], box: ['randevu', 'hastakaydi', 'sifreleme', 'rbac', 'vital'], hist: [], done: false },
      { i: 1, pool: ['hastakaydi', 'rozet', 'recete', 'randevu', 'sadakat', 'sifreleme', 'sepet', 'vital', 'qrmenu', 'tahlil', 'denetim', 'kampanya', 'paylas', 'rbac'], box: ['randevu', 'sepet', 'sifreleme', 'tahlil'], hist: [], done: false }];
  };
  switch (mode) {
    case 'tut': { show('s-tut'); tutGo((Number(Q.get('s')) || 1) - 1); break; }
    case 'home': show('s-home'); break;
    case 'home-idle': show('s-home'); ACT.enterIdle(); break;
    case 'dcard': { D.task = hb; D.names = ['Turbo Kaplumbağa', 'Bugsız Baykuş']; D.rerolled = [false, true]; D.ready = [true, false]; fillCard(); show('s-dcard'); break; }
    case 'duel': {
      duelSetup(); $('#dgIc').innerHTML = ic(hb.ikon); $('#dgNo').textContent = '#' + hb.no; $('#dgTitle').textContent = hb.baslik;
      $('#dgAud').innerHTML = hb.hedefKitle.map(h => `<span class="chip">${ic(h.ikon)}${esc(h.ad)}</span>`).join('');
      renderHalf(0); renderHalf(1); show('s-duel');
      $('#dArc').style.strokeDashoffset = 219.9 * (1 - 54 / 90); $('#dNum').textContent = '0:54';
      ['tb0', 'tb1'].forEach(t => ($(`#${t}`).style.transform = 'scaleX(.6)'));
      [[0, 'tahlil', 300, 560, -5], [1, 'kampanya', 960, 470, 5]].forEach(([side, id, x, y, rot]) => {
        const t = $(`#dh${side} .tile[data-card="${id}"]`); if (t) t.classList.add('lifted');
        const g = document.createElement('div'); g.className = `ghost p${side + 1}`; g.innerHTML = `<div class="ic">${ic(card(id).ikon)}</div><span>${esc(card(id).ad)}</span><i class="fing"></i>`;
        g.style.transform = `translate(${x - 48}px, ${y - 48}px) rotate(${rot}deg) scale(1.06)`; $('#fx').appendChild(g);
      });
      const s0 = $('#dh0 .slot[data-k="5"]'); s0.classList.add('target'); s0.innerHTML = ic('arrow-down-to-line');
      const s1 = $('#dh1 .slot[data-k="4"]'); s1.classList.add('target'); s1.innerHTML = ic('arrow-down-to-line');
      break;
    }
    case 'dres': {
      duelSetup(); D.phase = 'play'; D.t0 = performance.now();
      D.P[0].box = ['randevu', 'hastakaydi', 'sifreleme', 'rbac', 'tahlil', 'denetim', 'vital']; D.P[0].done = true; D.P[0].kalan = 36;
      D.P[1].box = ['randevu', 'hastakaydi', 'sifreleme', 'recete', 'tahlil', 'vital', 'sepet', 'kampanya']; D.P[1].done = true; D.P[1].kalan = 0;
      const r = D.P.map(P => Object.assign(duelScore(hb, P.box, P.kalan, 90), { box: [...P.box] }));
      r[0].lakap = 'Doğru Kişi, Doğru Veri'; r[0].yorum = '"Doğru kişi, doğru veri" birleşimini kurman çok yerinde. Yalnız "E-Reçete" olmadan doktorlar biraz zorlanacak.';
      r[1].lakap = 'Hastanede Black Friday'; r[1].yorum = 'Tahlil ile e-reçeteyi bağlaman harika! Ama hastane uygulamasında "Sepet" ne arıyor?';
      D.res = { r, win: winnerOf(r) }; D.phase = 'end'; await showResult(); break;
    }
    case 'nick': { S.nick = 'Korkut'; renderNick(); show('s-nick'); $('[data-k="T"]').classList.add('pr'); break; }
    case 'wheel': { S.nick = 'Korkut'; $('#wName').textContent = 'Korkut'; show('s-wheel'); $$('.wt').forEach((t, j) => t.classList.add(j === 5 ? 'win' : 'lose')); $('#wstamp').classList.add('on'); break; }
    case 'intro': { const sc = scene('obs'); fillIntro(sc); $('#iText').textContent = sc.giris; show('s-intro'); break; }
    case 'step': case 'effect': {
      S.nick = 'Korkut'; fillIntro(sc0); S.picks = pk(sc0, [0]); fillStep(1); $('#dText').textContent = sc0.adimlar[1].durum; $('#dQ').classList.add('in'); $('#opts').classList.add('in'); setTimer(14); show('s-step');
      if (mode === 'effect') {
        S.picks = pk(sc0, [0, 1]); $$('.opt').forEach((c, j) => c.classList.add(j === 1 ? 'sel' : 'dim')); renderChain(1); setTimer(11);
        fillSheet(sc0.adimlar[1].secenekler[1].etki, false); $('#sheet').classList.add('on'); $('#shBar').style.transform = 'scaleX(.55)';
        const p = stagePt($('.cn[data-i="1"] .dot')), bf = document.createElement('div'); bf.className = 'bfly'; bf.innerHTML = BF;
        bf.style.transform = `translate(${p.x + 30}px, ${p.y + 52}px) rotate(-28deg) scale(1.1)`; $('#fx').appendChild(bf);
      }
      break;
    }
    case 'final': case 'board': case 'board-duel': {
      S.nick = 'Korkut'; S.izin = true; fillIntro(sc0); S.picks = pk(sc0, [0, 1, 2, 0, 0]);
      if (mode === 'final') await goFinal();
      else { fillFinal(); B.tab = mode === 'board' ? 'sen' : 'duel'; B.filter = 'all'; show('s-board'); renderBoard(false); $('#s-board').classList.add('go2'); }
      break;
    }
    case 'admin-top': case 'admin-stats': case 'admin-set': { A.tab = mode.split('-')[1]; show('s-admin'); await renderAdmin(); break; }
    case 'post': case 'story': case 'stats-post': case 'stats-story': {
      const cv = document.createElement('canvas'), kind = mode.endsWith('story') ? 'story' : 'post';
      if (mode.startsWith('stats')) await drawStats(cv, kind, dayStats()); else await drawShare(cv, kind, shareTop().top);
      document.body.innerHTML = ''; document.body.style.background = '#131218'; cv.style.cssText = 'display:block;width:100vw;height:auto'; document.body.appendChild(cv);
      break;
    }
  }
  paint();
  document.body.dataset.ready = '1';
}

/* ---------- açılış ---------- */
(function init() {
  fillLogos(); buildTut();
  scores = Store.get(KEY.skor, []) || []; duels = Store.get(KEY.duel, []) || [];
  if (Q.has('ornek') && !scores.length) { const o = ornekVeri(); scores = o.scores; duels = o.duels; saveScores(); saveDuels(); }
  if (MODE) { demo(MODE); return; }
  if (AUTO) { const o = ornekVeri(); scores = o.scores; duels = o.duels; window.autoLoop(); return; }
  if (!Store.get(KEY.tut)) openTutorial(false); else show('s-home');
})();
