// Delivery pricing, Uber/Bolt style: a cost-based base price, then a time-band multiplier (peak / standard / quiet / closed).
// Pure functions. Every number lives in QuoteConfig so it can be edited in pricing_settings without code changes.
// Two cost modes: "transit" (rider goes by matatu: fares + time) and "motorbike" (fuel + rider rate; untuned, off by default). Tips are never part of a quote.
export interface TimeBand {
  id: string; label: string;
  days: number[];                 // 0=Sun .. 6=Sat, East Africa Time
  start: number; end: number;     // minutes since midnight; start > end wraps past midnight
  priceMult: number;              // customer price multiplier: >1 peak, 1 standard, <1 quiet
  fareMult: number; timeMult: number;   // physical cost effect: dearer fares / slower trips in this band
}
export interface QuoteConfig {
  mode: "transit" | "motorbike";
  minFare: number; marginTarget: number; floorMargin: number; valueOfTimeKesPerHr: number;
  roadFactor: number; maxAutoKm: number; validMinutes: number; maxMult: number;
  lookaheadMin: number; minSavingKes: number; minSavingPct: number;
  offRoad: { midBandKes: number };
  transit: { outBase: number; outPerKm: number; returnFactor: number; timeBaseMin: number; timePerKmMin: number };
  motorbike: { base: number; perKm: number; perMin: number; riderRatePerHr: number; kmPerLitre: number; fuelPerLitre: number; overheadKes: number; feeRiskPct: number };
  hours: ([number, number] | null)[];          // opening window per day, index 0=Sun..6=Sat, minutes since midnight EAT; null = closed
  lastDispatchBeforeCloseMin: number;           // 0 = same as the published cut-off (the closing time)
  timeBands: TimeBand[];
}
const ALL = [0, 1, 2, 3, 4, 5, 6], WK = [1, 2, 3, 4, 5];
export const DEFAULT_CONFIG: QuoteConfig = {
  mode: "transit", minFare: 100, marginTarget: 0.20, floorMargin: 0.10, valueOfTimeKesPerHr: 100,
  roadFactor: 1.4, maxAutoKm: 40, validMinutes: 30, maxMult: 1.5,
  lookaheadMin: 240, minSavingKes: 20, minSavingPct: 0.08,
  offRoad: { midBandKes: 40 },
  transit: { outBase: 15, outPerKm: 14, returnFactor: 0.5, timeBaseMin: 15, timePerKmMin: 10 },
  motorbike: { base: 40, perKm: 25, perMin: 3, riderRatePerHr: 250, kmPerLitre: 40, fuelPerLitre: 190, overheadKes: 25, feeRiskPct: 0.075 },
  // Business hours must match the website, Terms and Lucy. Mon-Fri 08:00-19:00 is the 2-hour extension trial (was 17:00).
  hours: [null, [480, 1140], [480, 1140], [480, 1140], [480, 1140], [480, 1140], [480, 900]],
  lastDispatchBeforeCloseMin: 0,
  timeBands: [
    { id: "night",        label: "Night",              days: ALL, start: 1320, end: 300,  priceMult: 1.25, fareMult: 1.1,  timeMult: 0.9 },
    { id: "early",        label: "Early morning",      days: WK,  start: 300,  end: 390,  priceMult: 0.95, fareMult: 1.0,  timeMult: 0.9 },
    { id: "morning_rush", label: "Morning rush",       days: WK,  start: 390,  end: 570,  priceMult: 1.25, fareMult: 1.15, timeMult: 1.3 },
    { id: "standard",     label: "Standard hours",     days: WK,  start: 570,  end: 960,  priceMult: 1.0,  fareMult: 1.0,  timeMult: 1.0 },
    { id: "evening_rush", label: "Evening rush",       days: WK,  start: 960,  end: 1200, priceMult: 1.30, fareMult: 1.15, timeMult: 1.35 },
    { id: "late_evening", label: "Late evening",       days: WK,  start: 1200, end: 1320, priceMult: 1.10, fareMult: 1.1,  timeMult: 1.0 },
    { id: "saturday",     label: "Saturday",           days: [6], start: 300,  end: 1200, priceMult: 1.0,  fareMult: 1.0,  timeMult: 1.0 },
    { id: "sat_evening",  label: "Late evening",       days: [6], start: 1200, end: 1320, priceMult: 1.10, fareMult: 1.1,  timeMult: 1.0 },
    { id: "sunday_quiet", label: "Sunday quiet hours", days: [0], start: 300,  end: 1200, priceMult: 0.95, fareMult: 1.0,  timeMult: 0.9 },
    { id: "sun_evening",  label: "Late evening",       days: [0], start: 1200, end: 1320, priceMult: 1.10, fareMult: 1.1,  timeMult: 1.0 },
  ],
};
const STANDARD: TimeBand = { id: "standard", label: "Standard hours", days: ALL, start: 0, end: 1440, priceMult: 1, fareMult: 1, timeMult: 1 };

export type OffRoad = "none" | "mid" | "far";
export interface QuoteInput { km: number; durationMin?: number; when: Date; offRoad?: OffRoad; confidence?: number; hasCoords?: boolean }
export interface QuoteResult {
  needsHuman: boolean; reason?: string;
  price?: number; estCost?: number; marginPct?: number; etaMinutes?: number;
  band?: { id: string; label: string; mult: number; pressure: "peak" | "standard" | "quiet" };
  cheaperLater?: { price: number; after: string; saves: number };
  scheduledFor?: { when: string; label: string };   // set when we are closed: price is for the next opening
  breakdown?: Record<string, number | string | boolean>;
}
export const ceil10 = (n: number) => Math.ceil(n / 10) * 10;
export const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function eatParts(d: Date) {
  const t = new Date(d.getTime() + 3 * 3600_000);
  return { dow: t.getUTCDay(), min: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function isOpen(d: Date, c: QuoteConfig): boolean {
  const { dow, min } = eatParts(d), h = c.hours[dow];
  return !!h && min >= h[0] && min < h[1] - c.lastDispatchBeforeCloseMin;
}
export function nextOpening(d: Date, c: QuoteConfig): Date {
  let t = new Date(Math.ceil(d.getTime() / 900_000) * 900_000);     // next quarter hour
  for (let i = 0; i < 8 * 96 && !isOpen(t, c); i++) t = new Date(t.getTime() + 900_000);
  return t;
}
export function whenLabel(from: Date, to: Date): string {
  const a = eatParts(from), b = eatParts(to);
  const dayGap = Math.round((Date.UTC(...ymd(to)) - Date.UTC(...ymd(from))) / 86400_000);
  const day = dayGap === 0 ? "today" : dayGap === 1 ? "tomorrow" : DAYS[b.dow];
  return `${day} ${hhmm(b.min)}`;
}
function ymd(d: Date): [number, number, number] { const t = new Date(d.getTime() + 3 * 3600_000); return [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()]; }
export function bandAt(d: Date, c: QuoteConfig): TimeBand {
  const { dow, min } = eatParts(d);
  const inRange = (b: TimeBand) => (b.start <= b.end ? min >= b.start && min < b.end : min >= b.start || min < b.end);
  // A band after midnight belongs to the previous evening's "day" only for closed night bands, which list every day.
  return c.timeBands.find((b) => b.days.includes(dow) && inRange(b)) ?? STANDARD;
}
export function offRoadFromNote(note: string | null | undefined): OffRoad {
  const n = String(note ?? "");
  if (/More than 2 km/i.test(n)) return "far";
  if (/500 m to 2 km/i.test(n)) return "mid";
  return "none";
}

function costModel(km: number, dur: number | undefined, c: QuoteConfig, fareMult: number, timeMult: number) {
  if (c.mode === "transit") {
    const t = c.transit;
    const out = Math.round((t.outBase + t.outPerKm * km) * fareMult), back = Math.round(out * t.returnFactor);
    const roundTripMin = Math.round((t.timeBaseMin + t.timePerKmMin * km) * timeMult);
    const timeCost = (roundTripMin / 60) * c.valueOfTimeKesPerHr;
    return { cost: out + back + timeCost, roundTripMin, bd: { fareOut: out, fareReturn: back, roundTripMin, timeCost: Math.round(timeCost) } };
  }
  const b = c.motorbike, oneWay = (dur ?? Math.round(8 + km * 4)) * timeMult, roundTripMin = Math.round(oneWay * 2);
  const rider = (roundTripMin / 60) * b.riderRatePerHr, fuel = ((km * 2) / b.kmPerLitre) * b.fuelPerLitre;
  return { cost: (rider + fuel + b.overheadKes) * (1 + b.feeRiskPct), roundTripMin, bd: { rider: Math.round(rider), fuel: Math.round(fuel), roundTripMin } };
}

function priceAt(i: QuoteInput, c: QuoteConfig, when: Date) {
  const band = bandAt(when, c);
  const neutral = costModel(i.km, i.durationMin, c, 1, 1);
  const inBand = costModel(i.km, i.durationMin, c, band.fareMult, band.timeMult);
  const basePrice = Math.max(c.minFare, neutral.cost / (1 - c.marginTarget));
  const mult = Math.min(band.priceMult, c.maxMult);
  const floor = inBand.cost / (1 - c.floorMargin);            // never below cost + minimum margin, even in quiet hours
  const extra = i.offRoad === "mid" ? c.offRoad.midBandKes : 0;
  const price = ceil10(Math.max(c.minFare, basePrice * mult, floor) + extra);
  return { band, mult, price, cost: inBand.cost, roundTripMin: inBand.roundTripMin, basePrice, extra, bd: inBand.bd, floor };
}

export function computeQuote(i: QuoteInput, cfg: QuoteConfig = DEFAULT_CONFIG, lookahead = true): QuoteResult {
  if (i.hasCoords === false) return { needsHuman: true, reason: "no_coordinates" };
  if ((i.confidence ?? 100) < 65) return { needsHuman: true, reason: "low_location_confidence" };
  if (i.offRoad === "far") return { needsHuman: true, reason: "far_off_road" };
  if (!(i.km >= 0) || i.km > cfg.maxAutoKm) return { needsHuman: true, reason: "distance_out_of_range" };
  // Closed now? Same policy as the website: the order carries over and is priced for the next opening.
  const open = isOpen(i.when, cfg);
  const at = open ? i.when : nextOpening(i.when, cfg);
  const now = priceAt(i, cfg, at);

  const pressure = now.mult > 1.04 ? "peak" : now.mult < 0.99 ? "quiet" : "standard";
  const res: QuoteResult = {
    needsHuman: false, price: now.price, estCost: Math.round(now.cost), marginPct: Math.round(((now.price - now.cost) / now.price) * 100),
    etaMinutes: Math.max(10, Math.round(now.roundTripMin / 2)),
    band: { id: now.band.id, label: now.band.label, mult: +now.mult.toFixed(2), pressure },
    breakdown: { ...now.bd, mode: cfg.mode, km: +i.km.toFixed(2), band: now.band.id, bandMult: now.mult, basePrice: Math.round(now.basePrice), costFloor: Math.round(now.floor), offRoadSurcharge: now.extra },
  };
  if (!open) res.scheduledFor = { when: at.toISOString(), label: whenLabel(i.when, at) };
  if (lookahead) {   // Uber/Bolt-style nudge: tell the customer when it gets cheaper (inside opening hours), if it really does
    let best: { price: number; at: Date } | null = null;
    for (let m = 15; m <= cfg.lookaheadMin; m += 15) {
      const t = new Date(at.getTime() + m * 60_000);
      if (!isOpen(t, cfg)) continue;
      const p = priceAt(i, cfg, t).price;
      if (!best || p < best.price) best = { price: p, at: t };
    }
    if (best && now.price - best.price >= Math.max(cfg.minSavingKes, now.price * cfg.minSavingPct)) {
      res.cheaperLater = { price: best.price, after: hhmm(eatParts(best.at).min), saves: now.price - best.price };
    }
  }
  return res;
}
