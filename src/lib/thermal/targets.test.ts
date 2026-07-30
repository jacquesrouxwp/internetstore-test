import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  THERMAL_TARGETS,
  detectionRangeForTarget,
  getThermalTarget,
} from "./targets";

describe("THERMAL_TARGETS", () => {
  it("has deer, boar, fox, human with expected critical + visual sizes", () => {
    const byId = Object.fromEntries(THERMAL_TARGETS.map((t) => [t.id, t]));
    assert.equal(byId.deer.criticalSizeM, 1.0);
    assert.equal(byId.deer.visualHeightM, 1.3);
    assert.equal(byId.boar.criticalSizeM, 0.7);
    assert.equal(byId.boar.visualHeightM, 1.0);
    assert.equal(byId.fox.criticalSizeM, 0.3);
    assert.equal(byId.fox.visualHeightM, 0.4);
    assert.equal(byId.human.criticalSizeM, 0.75);
    assert.equal(byId.human.visualHeightM, 1.8);
  });

  it("each target has uk/ru labels and subject path", () => {
    for (const t of THERMAL_TARGETS) {
      assert.ok(t.labelUk.length > 0);
      assert.ok(t.labelRu.length > 0);
      assert.ok(t.subjectSrc.startsWith("/thermal/"));
      assert.ok(t.visualHeightM > t.criticalSizeM * 0.5);
    }
  });

  it("default fallback is deer", () => {
    assert.equal(getThermalTarget("unknown").id, "deer");
    assert.equal(getThermalTarget("fox").id, "fox");
  });
});

describe("detectionRangeForTarget", () => {
  it("scales passport D (human 0.75 m) by target size", () => {
    const Dhuman = 1500;
    assert.equal(detectionRangeForTarget(Dhuman, 0.75), 1500);
    assert.equal(detectionRangeForTarget(Dhuman, 1.0), Math.round(1500 * 1.0 / 0.75));
    assert.equal(detectionRangeForTarget(Dhuman, 0.3), Math.round(1500 * 0.3 / 0.75));
    // fox much closer than deer
    const Ddeer = detectionRangeForTarget(Dhuman, 1.0);
    const Dfox = detectionRangeForTarget(Dhuman, 0.3);
    assert.ok(Dfox < Ddeer * 0.35);
  });

  it("floors at 80 m", () => {
    assert.equal(detectionRangeForTarget(50, 0.3), 80);
  });
});
