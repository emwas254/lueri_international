// Phase 3 economics. All defaults are ASSUMPTIONS: replace with real cost_actuals.
export interface CostInput {
  minutes: number; km: number; extrasKes?: number; price?: number;
  riderRatePerHr?: number; kmPerLitre?: number; fuelPerLitre?: number;
  payFeePct?: number; riskPct?: number; overheadKes?: number;
}
export function trueCost(i: CostInput): number {
  const rider = (i.minutes / 60) * (i.riderRatePerHr ?? 250);
  const fuel = (i.km / (i.kmPerLitre ?? 40)) * (i.fuelPerLitre ?? 190);
  const price = i.price ?? 0;
  const fee = price * (i.payFeePct ?? 0.025);
  const risk = price * (i.riskPct ?? 0.05);
  return Math.round(rider + fuel + (i.extrasKes ?? 0) + (i.overheadKes ?? 25) + fee + risk);
}
// Floor = cost / (1 - margin). Fee and risk depend on price, so iterate to a fixed point.
export function priceFloor(i: CostInput, margin = 0.25): number {
  let p = 0;
  for (let n = 0; n < 8; n++) p = Math.ceil(trueCost({ ...i, price: p }) / (1 - margin));
  return p;
}
export const roundUp10 = (n: number) => Math.ceil(n / 10) * 10;