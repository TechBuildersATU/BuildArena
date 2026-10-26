// Tam uygulamayı uçtan uca test eder: tutorial, düello (CDP ile gerçek çoklu dokunma), senaryo, skor tablosu, görevli, bekleme modu.
const puppeteer = require('puppeteer-core');
const path = require('path');
const { pathToFileURL } = require('url');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL0 = pathToFileURL(path.resolve(__dirname, '..', 'uygulama', 'index.html')).href;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push([ok ? 'GEÇTİ' : 'KALDI', name, extra]); console.log(ok ? '  ✓' : '  ✗', name, extra); };

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  const cdp = await page.target().createCDPSession();
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const on = id => page.waitForSelector(`#${id}.on`, { timeout: 20000 });
  const center = sel => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(p => ({ x: p.x, y: p.y, id: p.id, radiusX: 4, radiusY: 4 })) });
  async function touchDrag(paths, steps = 8) {   // paths: [{id, from:{x,y}, to:{x,y}}]
    await touch('touchStart', paths.map(p => ({ id: p.id, ...p.from })));
    for (let s = 1; s <= steps; s++) { await touch('touchMove', paths.map(p => ({ id: p.id, x: p.from.x + (p.to.x - p.from.x) * s / steps, y: p.from.y + (p.to.y - p.from.y) * s / steps }))); await sleep(16); }
    await touch('touchEnd', []); await sleep(350);
  }
  const boxes = () => page.evaluate(() => D.P.map(P => [...P.box]));

  console.log('1) TUTORIAL');
  await page.goto(URL0); await page.evaluate(() => localStorage.clear()); await page.goto(URL0);
  await on('s-tut'); check('ilk açılışta tutorial gösterilir', true);
  for (let i = 0; i < 4; i++) { await page.click('[data-act="tut-next"]'); await sleep(250); }
  check('5. slaytta "Hadi Başlayalım" çıkar', (await page.$eval('#tNext', e => e.textContent)).includes('Hadi Başlayalım'));
  await page.click('[data-act="tut-next"]'); await on('s-home');
  check('tutorial kaydı tutulur', await page.evaluate(() => localStorage.getItem('buildarena.tutorialSeen') === '1'));
  await page.goto(URL0); await on('s-home'); check('ikinci açılışta doğrudan ana ekran', true);

  console.log('2) DÜELLO');
  await page.click('[data-act="duel"]'); await on('s-dcard');
  const n1 = await page.$eval('#dcN1', e => e.textContent);
  await page.click('.rr[data-p="0"]'); await sleep(1200);
  const n1b = await page.$eval('#dcN1', e => e.textContent);
  check('zar ile takma ad değişir (bir kez)', n1 !== n1b && await page.$eval('.rr[data-p="0"]', e => e.classList.contains('used')), `${n1} → ${n1b}`);
  await page.click('.ready[data-p="0"]'); await page.click('.ready[data-p="1"]');
  await on('s-duel'); await sleep(600);
  check('iki "Hazırım" sonrası 3-2-1 ve oyun başlar', true);

  // a) iki oyuncu aynı anda sürükler
  const t0 = await center('#dh0 .tile:not(.used)'), t1 = await center('#dh1 .tile:not(.used)');
  const ph0 = await center('#dh0 .phone'), ph1 = await center('#dh1 .phone');
  const id0 = await page.$eval('#dh0 .tile:not(.used)', e => e.dataset.card), id1 = await page.$eval('#dh1 .tile:not(.used)', e => e.dataset.card);
  await touchDrag([{ id: 1, from: t0, to: ph0 }, { id: 2, from: t1, to: ph1 }]);
  let b = await boxes();
  check('iki parmak aynı anda: iki kart da kendi kutusuna düştü', b[0].includes(id0) && b[1].includes(id1), JSON.stringify(b));
  // b) karşı tarafa taşımaya çalışma: P1 kartı P2 telefonuna sürüklenir
  const t0b = await center('#dh0 .tile:not(.used)'), id0b = await page.$eval('#dh0 .tile:not(.used)', e => e.dataset.card);
  await touchDrag([{ id: 3, from: t0b, to: ph1 }]);
  b = await boxes();
  check('sınır kilidi: P1 kartı P2 kutusuna giremez', !b[1].includes(id0b), `P2: ${b[1].length} kart`);
  // c) ölü bölgeden başlayan dokunuş yok sayılır
  const before = JSON.stringify(await boxes());
  await touchDrag([{ id: 4, from: { x: 640, y: 400 }, to: ph0 }]);
  check('ölü bölge (628–652 px) dokunuşu yok sayılır', JSON.stringify(await boxes()) === before);
  // d) tek parmak kuralı: P1 iki parmakla iki kart sürüklemeye çalışır
  const tiles0 = await page.$$eval('#dh0 .tile:not(.used)', els => els.slice(0, 2).map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
  const n0 = (await boxes())[0].length;
  await touchDrag([{ id: 5, from: tiles0[0], to: ph0 }, { id: 6, from: tiles0[1], to: { x: ph0.x, y: ph0.y + 60 } }]);
  check('tek parmak kuralı: aynı tarafta ikinci parmak yok sayılır', (await boxes())[0].length === n0 + 1, `${n0} → ${(await boxes())[0].length}`);
  // e) sıralama: kutudaki ilk kartı aşağı taşı
  const first = (await boxes())[0][0], s0 = await center('#dh0 .slot[data-k="0"]'), s2 = await center('#dh0 .slot[data-k="2"]');
  await touchDrag([{ id: 7, from: s0, to: s2 }]);
  check('kutu içinde sıralama değişir', (await boxes())[0][0] !== first && (await boxes())[0].includes(first), JSON.stringify((await boxes())[0]));
  // f) kutudan dışarı sürüklenen kart havuza döner
  const nb = (await boxes())[0].length, sx = await center('#dh0 .slot[data-k="0"]');
  await touchDrag([{ id: 8, from: sx, to: { x: 150, y: 400 } }]);
  check('kutudan dışarı sürüklenen kart havuza döner', (await boxes())[0].length === nb - 1);
  // g) geri al
  await page.click('[data-act="d-undo"][data-p="0"]'); await sleep(200);
  check('Geri al son hamleyi geri getirir', (await boxes())[0].length === nb);
  // h) fare ile sürükleme (masaüstü)
  const m = await center('#dh1 .tile:not(.used)'), mid = await page.$eval('#dh1 .tile:not(.used)', e => e.dataset.card);
  await page.mouse.move(m.x, m.y); await page.mouse.down(); await page.mouse.move(ph1.x, ph1.y, { steps: 8 }); await page.mouse.up(); await sleep(350);
  check('fare ile de sürüklenir', (await boxes())[1].includes(mid));
  // i) kısa basış Bitir'i tetiklemez, 0,6 sn basılı tutma tetikler
  const h0 = await center('[data-hold="0"]'), h1 = await center('[data-hold="1"]');
  await touch('touchStart', [{ id: 9, ...h0 }]); await sleep(200); await touch('touchEnd', []); await sleep(200);
  check('kısa dokunuş Bitir değildir', !(await page.evaluate(() => D.P[0].done)));
  await touch('touchStart', [{ id: 10, ...h0 }, { id: 11, ...h1 }]); await sleep(800); await touch('touchEnd', []);
  await on('s-dres'); await sleep(4200);
  const res = await page.evaluate(() => {
    const g = D.task;
    return D.res.r.map((x, i) => {
      const P = D.P[i], w = {}; g.kritik.forEach(c => (w[c] = 3)); g.onemli.forEach(c => (w[c] = 2)); g.destek.forEach(c => (w[c] = 1));
      const uy = Math.round(P.box.reduce((a, c) => a + (w[c] || 0), 0) / 18 * 50), tr = P.box.filter(c => g.tuzak.includes(c)).length, ge = Math.max(0, 20 - 5 * tr);
      const bi = Math.round(g.birlesimler.filter(bb => bb.kartlar.every(c => P.box.includes(c))).length / 3 * 20), su = uy >= 25 ? Math.round(P.kalan / D.dur * 10) : 0;
      return { app: x.total, beklenen: uy + ge + bi + su, ekran: +document.querySelector(`#dr${i} .v b`).textContent, lakap: x.lakap };
    });
  });
  check('düello puanları formülle birebir (Bölüm 11.1)', res.every(r => r.app === r.beklenen && r.ekran === r.app), JSON.stringify(res));

  console.log('3) SENARYO');
  await page.click('.rbottom [data-act="home"]'); await on('s-home');
  await page.click('#s-home .mode.scen'); await on('s-nick');
  for (const k of ['T', 'E', 'S', 'T', 'Ç', 'İ']) { await page.click(`.k[data-k="${k}"]`); await sleep(40); }
  check('ekran klavyesi Türkçe karakter yazar', (await page.$eval('#nickTx', e => e.textContent)) === 'Testçi');
  await page.click('[data-act="start"]'); await on('s-intro'); await sleep(500);
  await page.click('[data-act="go"]');
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(i => CUR === 's-step' && S.step === i && !S.locked, { timeout: 25000 }, i);
    await page.click(`.opt[data-k="${(i + 1) % 4}"]`);
    await page.waitForSelector('#sheet.on', { timeout: 8000 }); await sleep(200); await page.click('#sheet .nx');
  }
  await on('s-final'); await sleep(6500);
  const fin = await page.evaluate(() => ({ puan: +$('#fNum').textContent, hesap: S.picks.reduce((a, p) => a + p.puan, 0), unvan: $('#fUnvan').textContent, kayit: scores.length, secim: S.entry.secimler.length }));
  check('senaryo puanı = seçimlerin toplamı, kayıt ve seçimler saklanır', fin.puan === fin.hesap && fin.kayit === 1 && fin.secim === 5, JSON.stringify(fin));
  await page.click('.fbtns [data-act="board"]'); await on('s-board'); await sleep(900);
  check('skor tablosunda oyuncu vurgulanır', (await page.$$eval('.tr2.me, .pd.me', e => e.length)) === 1);
  await page.click('#bTabs [data-tab="duel"]'); await sleep(600);
  check('Günün Düelloları sekmesinde düello listelenir', (await page.$$eval('#dl .dr', e => e.length)) === 1);

  console.log('4) GÖREVLİ');
  await page.click('#s-board [data-act="pin"]'); await sleep(200);
  for (const d of ['1', '2', '3', '4']) { await page.click(`#pkeys [data-p="${d}"]`); await sleep(60); }
  await on('s-admin'); await sleep(800);
  await page.click('#aTabs [data-tab="stats"]'); await sleep(1500);
  check('gün sonu özeti hesaplanır', (await page.$eval('#stTiles', e => e.textContent)).includes('kriz çözüldü'));
  await page.click('#aTabs [data-tab="set"]'); await sleep(300);
  await page.click('[data-set="duelSec"][data-v="60"]'); await sleep(200);
  check('ayar kaydedilir (düello 60 sn)', await page.evaluate(() => JSON.parse(localStorage.getItem('buildarena.ayarlar.v1')).duelSec === 60));
  await page.click('[data-act="reset-tut"]'); await sleep(200);
  check('tutorial sıfırlanır', await page.evaluate(() => localStorage.getItem('buildarena.tutorialSeen') === null));
  await page.click('[data-act="load-demo"]'); await sleep(200);
  check('örnek veriler yüklenir', await page.evaluate(() => scores.length > 30 && duels.length > 10));

  console.log('5) BEKLEME MODU');
  await page.click('#s-admin [data-act="home"]'); await on('s-home');
  check('ana ekran düello süresini ayardan gösterir', (await page.$eval('#hDuelSec', e => e.textContent)).includes('60'));
  await page.evaluate(() => { lastTouch = Date.now() - 61000; }); await sleep(1500);
  check('60 sn dokunulmazsa bekleme modu', await page.$eval('#s-home', e => e.classList.contains('idle')));
  await touch('touchStart', [{ id: 20, x: 640, y: 600 }]); await touch('touchEnd', []); await sleep(400);
  check('ilk dokunuş yalnızca uyandırır', await page.evaluate(() => CUR === 's-home' && !$('#s-home').classList.contains('idle')));

  console.log('\nKONSOL HATALARI:', errors.length ? errors : 'yok');
  console.log(`SONUÇ: ${results.filter(r => r[0] === 'GEÇTİ').length}/${results.length} geçti`);
  require('fs').writeFileSync(path.join(__dirname, 'test_sonuclari.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
})().catch(e => { console.error('TEST HATASI', e); process.exit(1); });
