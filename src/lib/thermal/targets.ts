/**
 * Thermal sim targets — shared by PDP simulator and sandbox.
 * criticalSizeM drives Johnson DRI / pixels-on-target.
 */

export type ThermalTargetId = "deer" | "boar" | "fox" | "human";

export type ThermalTargetDef = {
  id: ThermalTargetId;
  labelUk: string;
  labelRu: string;
  /** Critical dimension (m) for Johnson */
  criticalSizeM: number;
  /** Luma-keyed subject on black (white-hot style asset) */
  subjectSrc: string;
};

export const THERMAL_TARGETS: ThermalTargetDef[] = [
  {
    id: "deer",
    labelUk: "Олень",
    labelRu: "Олень",
    criticalSizeM: 1.0,
    subjectSrc: "/thermal/deer_subject_whitehot.jpg",
  },
  {
    id: "boar",
    labelUk: "Кабан",
    labelRu: "Кабан",
    criticalSizeM: 0.7,
    subjectSrc: "/thermal/subject_boar_whitehot.jpg",
  },
  {
    id: "fox",
    labelUk: "Лисиця",
    labelRu: "Лисица",
    criticalSizeM: 0.3,
    subjectSrc: "/thermal/subject_fox_whitehot.jpg",
  },
  {
    id: "human",
    labelUk: "Людина",
    labelRu: "Человек",
    criticalSizeM: 0.75,
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
