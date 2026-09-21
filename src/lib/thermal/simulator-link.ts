/**
 * Deep link from a product card into the /simulator sandbox, pre-set to that
 * device's optics. Query in, validated sandbox inputs out — the sandbox
 * casts matrix/pitch without checking them, so unknown values are dropped.
 */

import type { ThermalSimParams } from "@/lib/thermal/parse-product-thermal";
import type { SandboxInputs } from "@/lib/thermal/sandbox-physics";

type Query = Record<string, string | string[] | undefined>;

const MATRICES = [160, 256, 384, 640, 1024, 1280] as const;
const PITCHES = [8, 10, 12, 17] as const;

export type SimulatorPreset = Partial<
  Pick<SandboxInputs, "matrixW" | "pitchUm" | "focalMm" | "netdMk">
>;

/** "?res=384&pitch=12&lens=35&netd=15" — only the values we actually know. */
export function simulatorHref(p: ThermalSimParams): string {
  const params = new URLSearchParams({ res: String(p.matrix) });
  if (p.pitchUm) params.set("pitch", String(p.pitchUm));
  if (p.focalMm) params.set("lens", String(p.focalMm));
  if (p.netdMk) params.set("netd", String(p.netdMk));
  return `/simulator?${params.toString()}`;
}

/**
 * NETD (mK) only when the card states it. parseNetd() reads a key named
 * exactly "NETD" and otherwise returns a 35 mK default; cards use keys like
 * "Різниця температур матриці (NETD)", so the link would carry a guess.
 */
export function specNetdMk(specs?: Record<string, string> | null): number | null {
  if (!specs) return null;
  for (const [key, value] of Object.entries(specs)) {
    if (!/netd/i.test(key)) continue;
    const m = String(value).match(/\d+(?:[.,]\d+)?/);
    if (!m) continue;
    let n = parseFloat(m[0].replace(",", "."));
    if (n > 0 && n < 1) n = Math.round(n * 1000); // stated in K, e.g. 0.025
    if (n >= 10 && n <= 100) return n;
  }
  return null;
}

function num(v: string | string[] | undefined): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function simulatorPresetFromQuery(query: Query): SimulatorPreset {
  const out: SimulatorPreset = {};
  const res = num(query.res);
  if (res != null && (MATRICES as readonly number[]).includes(res)) {
    out.matrixW = res as SimulatorPreset["matrixW"];
  }
  const pitch = num(query.pitch);
  if (pitch != null && (PITCHES as readonly number[]).includes(pitch)) {
    out.pitchUm = pitch as SimulatorPreset["pitchUm"];
  }
  // Range limits are enforced by clampSandboxInputs; just reject junk here.
  const lens = num(query.lens);
  if (lens != null && lens > 0 && lens < 1000) out.focalMm = lens;
  const netd = num(query.netd);
  if (netd != null && netd > 0 && netd < 1000) out.netdMk = netd;
  return out;
}
