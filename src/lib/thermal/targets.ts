/**
 * Thermal sim targets — shared by PDP simulator and sandbox.
 *
 * criticalSizeM — Johnson DRI / pixels-on-target (characteristic size).
 * visualHeightM — real body height for FOV-based on-screen scale.
 */

export type ThermalTargetId = "deer" | "boar" | "fox" | "human";

export type ThermalTargetDef = {
  id: ThermalTargetId;
  labelUk: string;
  labelRu: string;
  /** Critical dimension (m) for Johnson status / D scaling */
  criticalSizeM: number;
  /**
   * Standing / body height (m) for angular size vs FOV.
   * human≈1.8, deer≈1.3, boar≈1.0, fox≈0.4
   */
  visualHeightM: number;
  /** Luma-keyed subject on black (white-hot style asset) */
  subjectSrc: string;
};

export const THERMAL_TARGETS: ThermalTargetDef[] = [
  {
    id: "deer",
    labelUk: "Олень",
    labelRu: "Олень",
    criticalSizeM: 1.0,
    visualHeightM: 1.3,
    subjectSrc: "/thermal/deer_subject_whitehot.jpg",
  },
  {
    id: "boar",
    labelUk: "Кабан",
    labelRu: "Кабан",
    criticalSizeM: 0.7,
    visualHeightM: 1.0,
    subjectSrc: "/thermal/subject_boar_whitehot.jpg",
  },
  {
    id: "fox",
    labelUk: "Лисиця",
    labelRu: "Лисица",
    criticalSizeM: 0.3,
    visualHeightM: 0.4,
    subjectSrc: "/thermal/subject_fox_whitehot.jpg",
  },
  {
    id: "human",
    labelUk: "Людина",
    labelRu: "Человек",
    criticalSizeM: 0.75,
    visualHeightM: 1.8,
    subjectSrc: "/thermal/subject_human_whitehot.jpg",
  },
];

export function getThermalTarget(id: ThermalTargetId | string): ThermalTargetDef {
  return THERMAL_TARGETS.find((t) => t.id === id) || THERMAL_TARGETS[0];
}

/**
 * Scale passport detection range D (often quoted for human) to this target.
 * D_target = D_human × (size_target / size_human)
 */
export function detectionRangeForTarget(
  detectionRangeHumanM: number,
  targetSizeM: number,
  humanSizeM = 0.75
): number {
  const D = Math.max(1, detectionRangeHumanM);
  return Math.max(80, Math.round((D * targetSizeM) / humanSizeM));
}
