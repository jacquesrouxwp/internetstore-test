import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_F_NUMBER,
  blurRadiusOnCanvasPx,
  diffractionSigmaUm,
  ifovMrad,
  noiseAmpFromSnr,
  opticalBlurSigmaPx,
  renderedRowsOnSubject,
  sensorGridForWindow,
  targetSnr,
} from "./optics-render";
import { pixelsOnTargetOptics } from "./sandbox-physics";
import { DISPLAY_SIZE_BOOST, SIM_FOV_VERT_DEG, subjectHeightFrac } from "./zoom";

const WINDOW = SIM_FOV_VERT_DEG;
const ASPECT = 480 / 360;

/** Grid with generous caps so pure optics behaviour is observable. */
function grid(opts: {
  pitchUm: number;
  focalMm: number;
  matrixH?: number;
  digitalZoom?: number;
  maxRows?: number;
}) {
  return sensorGridForWindow({
    pitchUm: opts.pitchUm,
    focalMm: opts.focalMm,
    matrixH: opts.matrixH ?? 100000,
    windowFovVertDeg: WINDOW,
    aspect: ASPECT,
    boost: DISPLAY_SIZE_BOOST,
    maxRows: opts.maxRows ?? 100000,
    digitalZoom: opts.digitalZoom,
  });
}

describe("IFOV — the angle one detector sees", () => {
  it("ifov = pitch / focal (mrad)", () => {
    assert.ok(Math.abs(ifovMrad(12, 35) - 12 / 35) < 1e-9);
    assert.ok(Math.abs(ifovMrad(17, 50) - 0.34) < 1e-9);
  });

  it("longer lens and finer pitch both shrink it", () => {
    assert.ok(ifovMrad(12, 75) < ifovMrad(12, 35));
    assert.ok(ifovMrad(8, 35) < ifovMrad(12, 35));
  });
});

describe("sampling grid — what the objective actually changes", () => {
  it("a longer objective puts MORE detector rows in the same window", () => {
    const short = grid({ pitchUm: 12, focalMm: 19 });
    const long = grid({ pitchUm: 12, focalMm: 75 });
    assert.ok(
      long.rows > short.rows * 3,
      `75mm (${long.rows}) should far out-sample 19mm (${short.rows})`
    );
  });

  it("rows scale linearly with focal length", () => {
    const a = grid({ pitchUm: 12, focalMm: 25 });
    const b = grid({ pitchUm: 12, focalMm: 50 });
    assert.ok(Math.abs(b.rows / a.rows - 2) < 0.02);
  });

  it("a finer pitch also raises sampling", () => {
    const coarse = grid({ pitchUm: 17, focalMm: 35 });
    const fine = grid({ pitchUm: 8, focalMm: 35 });
    assert.ok(fine.rows > coarse.rows);
    assert.ok(Math.abs(fine.rows / coarse.rows - 17 / 8) < 0.03);
  });

  it("distance does NOT change the grid (only the target shrinks in it)", () => {
    // Grid is a property of the optics alone — no distance argument exists.
    const g = grid({ pitchUm: 12, focalMm: 35 });
    assert.ok(g.rows > 0);
  });

  it("saturates at the array when the detectors run out", () => {
    const g = grid({ pitchUm: 12, focalMm: 100, matrixH: 120 });
    // min() is taken at true scale, then the display magnification applies.
    assert.equal(g.sensorRows, 120);
    assert.equal(g.rows, Math.round(120 / DISPLAY_SIZE_BOOST));
    assert.equal(g.matrixLimited, true);
    assert.equal(g.opticsLimited, false);
  });

  it("a bigger matrix resolves more when the array is the limit", () => {
    const small = grid({ pitchUm: 12, focalMm: 100, matrixH: 120 });
    const big = grid({ pitchUm: 12, focalMm: 100, matrixH: 1024 });
    assert.ok(big.rows > small.rows);
  });

  it("names the real bottleneck", () => {
    // Short lens in a wide window: plenty of detectors, the lens is the wall.
    const lensBound = grid({ pitchUm: 12, focalMm: 19, matrixH: 1024 });
    assert.equal(lensBound.opticsLimited, true);
    assert.equal(lensBound.matrixLimited, false);
    // Long lens on a small array: the array is the wall.
    const arrayBound = grid({ pitchUm: 12, focalMm: 100, matrixH: 288 });
    assert.equal(arrayBound.matrixLimited, true);
  });
});

describe("high-resolution matrices must actually pay off", () => {
  // The regression this suite exists for: 640×512, 1024×768 and 1280×1024 all
  // rendered identically because the display magnification was folded in
  // before the array cap, hiding the array completely.
  const LADDER: [string, number][] = [
    ["640×512", 512],
    ["1024×768", 768],
    ["1280×1024", 1024],
  ];

  for (const focalMm of [50, 75, 100]) {
    it(`each step up the ladder adds detail at ${focalMm} mm`, () => {
      const rows = LADDER.map(([, h]) =>
        grid({ pitchUm: 12, focalMm, matrixH: h }).rows
      );
      for (let i = 1; i < rows.length; i++) {
        assert.ok(
          rows[i] > rows[i - 1],
          `${LADDER[i][0]} (${rows[i]}) must beat ${LADDER[i - 1][0]} (${rows[i - 1]}) at ${focalMm}mm`
        );
      }
    });
  }

  it("1280×1024 is a large, visible gain over 640×512 at 75 mm", () => {
    const small = grid({ pitchUm: 12, focalMm: 75, matrixH: 512 });
    const large = grid({ pitchUm: 12, focalMm: 75, matrixH: 1024 });
    assert.ok(
      large.rows / small.rows > 1.9,
      `expected ~2× more rows, got ${small.rows} → ${large.rows}`
    );
  });

  it("a fine pitch lets big arrays pay off even on a short lens", () => {
    const at12 = LADDER.map(([, h]) =>
      grid({ pitchUm: 12, focalMm: 35, matrixH: h }).rows
    );
    const at8 = LADDER.map(([, h]) =>
      grid({ pitchUm: 8, focalMm: 35, matrixH: h }).rows
    );
    // 12 µm / 35 mm cannot feed 1024 rows, so the top two tie…
    assert.equal(at12[1], at12[2]);
    // …while a finer pitch pushes the optical ceiling past the array.
    assert.ok(at8[2] > at8[1]);
  });

  it("stays honest: no array beats what the lens can deliver", () => {
    const huge = grid({ pitchUm: 17, focalMm: 13, matrixH: 4096 });
    const modest = grid({ pitchUm: 17, focalMm: 13, matrixH: 512 });
    assert.equal(huge.rows, modest.rows);
    assert.equal(huge.opticsLimited, true);
  });

  it("flags display-limited when the device out-resolves the canvas", () => {
    const g = grid({ pitchUm: 8, focalMm: 100, maxRows: 360 });
    assert.equal(g.displayLimited, true);
    assert.equal(g.rows, 360);
  });

  it("digital zoom crops the grid — magnification without new detail", () => {
    const z1 = grid({ pitchUm: 12, focalMm: 35, digitalZoom: 1 });
    const z4 = grid({ pitchUm: 12, focalMm: 35, digitalZoom: 4 });
    assert.ok(Math.abs(z1.rows / z4.rows - 4) < 0.05);
  });

  it("keeps detectors square via the frame aspect", () => {
    const g = grid({ pitchUm: 12, focalMm: 35 });
    assert.ok(Math.abs(g.cols / g.rows - ASPECT) < 0.02);
  });
});

describe("picture must agree with the Johnson numbers", () => {
  const H = 1.3; // deer visual height (m)

  for (const focalMm of [19, 35, 75]) {
    for (const distanceM of [100, 300, 800]) {
      it(`rendered rows on subject = optics px  (f=${focalMm}mm, d=${distanceM}m)`, () => {
        const g = grid({ pitchUm: 12, focalMm });
        const frac = subjectHeightFrac(H, distanceM, 50, WINDOW);
        const rendered = renderedRowsOnSubject(frac, g);
        const physics = pixelsOnTargetOptics(H, focalMm, 12, distanceM);
        // Same quantity derived two independent ways — must match closely.
        assert.ok(
          Math.abs(rendered / physics - 1) < 0.02,
          `rendered ${rendered.toFixed(2)} vs physics ${physics.toFixed(2)}`
        );
      });
    }
  }

  it("target detail falls as 1/distance while the grid stays put", () => {
    const g = grid({ pitchUm: 12, focalMm: 35 });
    const near = renderedRowsOnSubject(subjectHeightFrac(H, 200, 50, WINDOW), g);
    const far = renderedRowsOnSubject(subjectHeightFrac(H, 800, 50, WINDOW), g);
    assert.ok(Math.abs(near / far - 4) < 0.1);
  });
});

describe("diffraction — why ultra-fine pitch stops paying off", () => {
  it("σ ≈ 0.42·λ·N (≈4.2 µm at λ=10, f/1.0)", () => {
    assert.ok(Math.abs(diffractionSigmaUm(1.0, 10) - 4.2) < 1e-9);
    assert.ok(diffractionSigmaUm(1.4) > diffractionSigmaUm(1.0));
  });

  it("blur measured in detectors GROWS as the pitch shrinks", () => {
    const coarse = opticalBlurSigmaPx({ pitchUm: 17 });
    const fine = opticalBlurSigmaPx({ pitchUm: 8 });
    assert.ok(
      fine > coarse,
      "an 8 µm detector is closer to the diffraction limit than a 17 µm one"
    );
  });

  it("stays sub-pixel for realistic fast optics (still a usable image)", () => {
    for (const pitchUm of [17, 12, 10, 8]) {
      const s = opticalBlurSigmaPx({ pitchUm, fNumber: DEFAULT_F_NUMBER });
      assert.ok(s > 0.3 && s < 1.2, `pitch ${pitchUm} → σ ${s.toFixed(2)}`);
    }
  });

  it("canvas blur scales with detector footprint on screen", () => {
    const coarseGrid = blurRadiusOnCanvasPx({
      pitchUm: 12,
      canvasRows: 360,
      gridRows: 60,
    });
    const fineGrid = blurRadiusOnCanvasPx({
      pitchUm: 12,
      canvasRows: 360,
      gridRows: 360,
    });
    assert.ok(coarseGrid > fineGrid);
  });
});

describe("SNR / NETD noise", () => {
  it("SNR = ΔT·transmission / NETD", () => {
    assert.ok(Math.abs(targetSnr({ netdMk: 40, transmission: 1 }) - 200) < 1e-6);
    assert.ok(targetSnr({ netdMk: 20, transmission: 1 }) > targetSnr({ netdMk: 40, transmission: 1 }));
  });

  it("haze at range collapses SNR", () => {
    assert.ok(
      targetSnr({ netdMk: 35, transmission: 0.3 }) <
        targetSnr({ netdMk: 35, transmission: 1 })
    );
  });

  it("noise grows with NETD and with fog", () => {
    const clean = noiseAmpFromSnr({ netdMk: 15, transmission: 1 });
    const noisy = noiseAmpFromSnr({ netdMk: 55, transmission: 1 });
    assert.ok(noisy > clean);
    assert.ok(
      noiseAmpFromSnr({ netdMk: 35, transmission: 0.5, fog: true }) >
        noiseAmpFromSnr({ netdMk: 35, transmission: 0.5, fog: false })
    );
  });

  it("stays bounded so the frame never turns into pure static", () => {
    const worst = noiseAmpFromSnr({
      netdMk: 60,
      transmission: 0.01,
      fog: true,
    });
    assert.ok(worst < 120, `noise ${worst} must stay under half scale`);
  });
});
