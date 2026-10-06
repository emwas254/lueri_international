// Pure scoring for a captured drop-off. Weights are starting guesses: recalibrate
// after ~50 deliveries using bookings.found_first_try.
export type Method = "gps" | "pin" | "address" | "landmark" | "call";
export interface LocationInput {
  method: Method;
  accuracyM?: number;            // GPS accuracy
  geocodeApproximate?: boolean;  // provider returned an approximate/area-level match
  hasLandmarkText?: boolean;
  estateMismatch?: boolean;      // typed estate differs from estate at coordinates
  pinMovedFromGpsM?: number;
  deliveredBefore?: boolean;     // same coords delivered OK previously
  outsideServiceZone?: boolean;
}
export interface LocationScore {
  score: number;
  band: "confirmed" | "confirm_pin" | "add_detail" | "human_verify" | "blocked";
  flags: string[];
}
const BASE: Record<Method, number> = { gps: 95, pin: 90, address: 80, landmark: 65, call: 55 };

export function scoreLocation(i: LocationInput): LocationScore {
  const flags: string[] = [];
  if (i.outsideServiceZone) return { score: 0, band: "blocked", flags: ["outside_zone"] };
  let s = BASE[i.method];
  if (i.accuracyM != null) {
    if (i.accuracyM > 50) { s -= 10; flags.push("gps_weak"); }
    if (i.accuracyM > 100) s = Math.min(s, 85);
  }
  if (i.geocodeApproximate) { s -= 10; flags.push("approximate_match"); }
  if (i.hasLandmarkText) s += 5;
  if (i.estateMismatch) { s -= 15; flags.push("estate_mismatch"); }
  if ((i.pinMovedFromGpsM ?? 0) > 300) flags.push("pin_far_from_gps");
  if (i.deliveredBefore) s += 5;
  s = Math.max(0, Math.min(100, Math.round(s)));
  // A call-only or landmark-only capture can never read as exact.
  if (i.method === "call" || i.method === "landmark") s = Math.min(s, 79);
  const band = s >= 90 ? "confirmed" : s >= 80 ? "confirm_pin" : s >= 65 ? "add_detail" : "human_verify";
  return { score: s, band, flags };
}