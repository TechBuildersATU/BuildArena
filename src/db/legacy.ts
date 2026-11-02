// Records saved by the first booth builds (before 3 November 2026) used Turkish field names and
// ids. The database upgrade (version 3, database.ts) and the settings loader turn them into the
// current English ones, so nothing a tablet already saved is lost. Pure functions, unit-tested.

type Json = Record<string, unknown>

/** old scenario id → current id */
export const LEGACY_SCENARIO_IDS: Readonly<Record<string, string>> = {
  yemekhane: 'cafeteria',
  kutuphane: 'library',
  kafe: 'cafe',
  hastane: 'hospital',
  magaza: 'store',
  obs: 'student-portal',
  servis: 'shuttle',
  yurt: 'dorm',
  eticaret: 'e-commerce',
  ring: 'campus-transit',
  otostop: 'ride-share',
  sinav: 'exam',
  banka: 'banking',
  deprem: 'emergency',
  bilet: 'tickets',
}

/** old duel task id → current id */
export const LEGACY_TASK_IDS: Readonly<Record<string, string>> = {
  hbys: 'hospital',
  magaza: 'store',
  kutuphane: 'library',
  yemekhane: 'cafeteria',
  kafe: 'cafe',
  ring: 'campus-transit',
  etkinlik: 'events',
  otopark: 'parking',
  sinav: 'exam',
  kayip: 'lost-found',
  spor: 'gym',
  camasir: 'laundry',
  derslik: 'classrooms',
  kan: 'blood-drive',
  kariyer: 'career',
}

/** old requirement card id → current id */
export const LEGACY_CARD_IDS: Readonly<Record<string, string>> = {
  katalog: 'catalog-search',
  envanter: 'book-inventory',
  odunc: 'borrow-return',
  rezervasyon: 'reservation',
  gecikme: 'late-fee',
  hatirlatma: 'return-reminder',
  kilit: 'concurrency-lock',
  isbn: 'isbn-scan',
  bakiye: 'top-up',
  turnike: 'turnstile',
  atomik: 'atomic-transaction',
  menu: 'daily-menu',
  gecmis: 'history',
  gecikmesiz: 'low-latency',
  rapor: 'daily-report',
  kalori: 'calories',
  qrmenu: 'qr-menu',
  sepet: 'cart',
  mutfak: 'kitchen-display',
  adisyon: 'table-bill',
  stok: 'stock',
  sadakat: 'loyalty',
  cevrimdisi: 'offline-mode',
  paket: 'takeaway',
  randevu: 'appointment',
  hastakaydi: 'patient-record',
  sifreleme: 'encryption',
  recete: 'e-prescription',
  tahlil: 'lab-results',
  denetim: 'audit-trail',
  vital: 'vitals',
  urunler: 'product-catalog',
  odeme: 'secure-payment',
  filtre: 'filters',
  kargo: 'shipment-tracking',
  iade: 'returns',
  olcek: 'horizontal-scaling',
  kampanya: 'promo-code',
  beden: 'size-picker',
  onbellek: 'cache',
  paylas: 'social-share',
  rozet: 'badges',
  canliskor: 'live-score',
  bildirim: 'push-notifications',
  canlikonum: 'live-location',
  varis: 'arrival-estimate',
  harita: 'campus-map',
  doluluk: 'occupancy',
  sefer: 'trip-schedule',
  erisilebilirlik: 'accessibility',
  etkinlik: 'event-calendar',
  katilim: 'attendance',
  kontenjan: 'quota',
  qrgiris: 'qr-check-in',
  duyuru: 'announcements',
  plaka: 'plate-recognition',
  bosyer: 'free-spaces',
  sarj: 'ev-charging',
  ihlal: 'violations',
  kimlik: 'authentication',
  sayac: 'timer',
  otokayit: 'auto-save',
  soruhavuzu: 'question-pool',
  sonuc: 'results',
  ilan: 'lost-notice',
  fotograf: 'photo-upload',
  teslim: 'handover-record',
  konum: 'found-location',
  seans: 'session-reminder',
  bekleme: 'waitlist',
  antrenman: 'workout-plan',
  makine: 'machine-status',
  sira: 'queue',
  ariza: 'fault-report',
  bosderslik: 'free-classrooms',
  dersprogrami: 'timetable',
  sensor: 'occupancy-sensor',
  uygunluk: 'eligibility',
  kangrubu: 'blood-type',
  cv: 'cv-profile',
  isilani: 'job-listings',
  basvuru: 'application-tracking',
  mesaj: 'messaging',
}
const SCORE_FIELDS: Readonly<Record<string, string>> = {
  sure: 'seconds',
  zaman: 'playedAt',
  unvan: 'title',
  senaryo: 'scenarioId',
  izin: 'consent',
  secimler: 'choices',
  arsivGunu: 'archiveDay',
}

const DUEL_FIELDS: Readonly<Record<string, string>> = {
  zaman: 'playedAt',
  gorev: 'taskId',
  kazanan: 'winner',
  arsivGunu: 'archiveDay',
}

const PLAYER_FIELDS: Readonly<Record<string, string>> = {
  uyum: 'coverage',
  isabet: 'accuracy',
  birlesim: 'combo',
  hiz: 'speed',
  ceza: 'penalty',
  kalan: 'secondsLeft',
  tuzak: 'trapCount',
  lakap: 'epithet',
}

function renameFields(record: Json, fields: Readonly<Record<string, string>>): Json {
  const out: Json = {}
  for (const [key, value] of Object.entries(record)) out[fields[key] ?? key] = value
  return out
}

const newId = (ids: Readonly<Record<string, string>>, id: unknown) =>
  typeof id === 'string' ? (ids[id] ?? id) : id

/** A scenario score (or its archived copy) in the current shape; current records stay as they are. */
export function upgradeScoreRecord(record: Json): Json {
  const out = renameFields(record, SCORE_FIELDS)
  out.scenarioId = newId(LEGACY_SCENARIO_IDS, out.scenarioId)
  return out
}

/** A duel (or its archived copy) in the current shape; current records stay as they are. */
export function upgradeDuelRecord(record: Json): Json {
  const out = renameFields(record, DUEL_FIELDS)
  out.taskId = newId(LEGACY_TASK_IDS, out.taskId)
  if (Array.isArray(out.p)) {
    out.p = out.p.map((player: Json) => {
      const p = renameFields(player, PLAYER_FIELDS)
      if (Array.isArray(p.box)) p.box = p.box.map((card) => newId(LEGACY_CARD_IDS, card))
      return p
    })
  }
  return out
}
