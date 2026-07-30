"use client";

/**
 * Hybrid thermal simulator — DEER ONLY:
 *  - Full-frame 2D cold forest (screen-space, always 100% coverage)
 *  - 3D deer only, Z = −distance, NO scaleBoost
 *  - Camera fixed eye height + pitch so geometric horizon = HORIZON_FRAC (0.73)
 *  - Feet on y=0 ground plane → stay on litter band at all distances
 *  - Post: grain + digi crop + LUT + NETD noise
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/types";
import {
  CAMERA_EYE_HEIGHT_M,
  DEER_CRITICAL_SIZE_M,
  DEER_GLB_URL,
  DEER_VISUAL_HEIGHT_M,
  DIST_MIN_M,
  DIGI_ZOOM_STEPS,
  FOREST_BACKDROP_URL,
  HORIZON_FRAC,
  angularFrameHeightFrac,
  cameraFovVerticalDeg,
  computeDetectStatusVisual,
  deerDetectionRangeM,
  deerFeetYFrac,
  defaultSimDistanceM,
  digitalZoomCrop,
  hashSeed,
  inspectDigiZoom,
  matrixPixelHeight,
  matrixPixelWidth,
  mulberry32,
  netdContrast,
  netdNoiseAmp,
  nextDigiZoom,
  renderedCriticalGrainPx,
  resolveFovVerticalRad,
  targetSubjectVisibility,
  type DetectStatus,
  type ThermalCompareOption,
  type ThermalMatrix,
  type ThermalSimParams,
} from "@/lib/thermal/thermal-math";

type Palette = "whitehot" | "ironhot";
type Weather = "clear" | "fog";

const LOGIC_W = 480;
const LOGIC_H = 360;

const STATUS_UK: Record<DetectStatus, string> = {
  identify: "Ідентифікація",
  recognize: "Розпізнавання",
  detect: "Виявлення",
  none: "Не видно",
};
const STATUS_RU: Record<DetectStatus, string> = {
  identify: "Идентификация",
  recognize: "Распознавание",
  detect: "Обнаружение",
  none: "Не видно",
};
const STATUS_HINT_UK: Record<DetectStatus, string> = {
  identify: "видно деталі (≥13 px)",
  recognize: "зрозуміло, що тварина (≥8 px)",
  detect: "видно, що щось є (≥2 px)",
  none: "менше 2 px / за D — ціль зникає",
};
const STATUS_HINT_RU: Record<DetectStatus, string> = {
  identify: "видны детали (≥13 px)",
  recognize: "понятно, что животное (≥8 px)",
  detect: "видно, что что-то есть (≥2 px)",
  none: "меньше 2 px / за D — цель исчезает",
};
const STATUS_COLOR: Record<DetectStatus, string> = {
  identify: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  recognize: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  detect: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  none: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
};

type Props = {
  params: ThermalSimParams;
  locale?: string;
  compareOptions?: ThermalCompareOption[];
  currentProductId?: string;
  allowMatrixPick?: boolean;
  className?: string;
  deviceType?: DeviceType | string | null;
};

// ─── Thermal emissive material ────────────────────────────────────────────

function makeThermalDeerMaterial(
  localYMin: number,
  localYMax: number
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.02, 0.02, 0.03),
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 1.4,
    metalness: 0,
    roughness: 1,
    toneMapped: false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uYMin = { value: localYMin };
    shader.uniforms.uYMax = { value: localYMax };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         varying float vBodyY;
         uniform float uYMin;
         uniform float uYMax;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vBodyY = (position.y - uYMin) / max(0.0001, uYMax - uYMin);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         varying float vBodyY;`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float h = clamp(vBodyY, 0.0, 1.0);
         float core = smoothstep(0.12, 0.55, h) * (1.0 - 0.35 * smoothstep(0.75, 1.0, h));
         float legs = mix(0.28, 0.55, smoothstep(0.0, 0.2, h));
         totalEmissiveRadiance *= max(legs, core);`
      );
  };

  return mat;
}

// ─── Deer (perspective only — NO scaleBoost) ──────────────────────────────

function DeerModel({
  distanceM,
  visible,
}: {
  distanceM: number;
  visible: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(DEER_GLB_URL, true);

  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const y0 = box.min.y;
    const h = Math.max(0.001, size.y);
    const s = DEER_VISUAL_HEIGHT_M / h;

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry = mesh.geometry.clone();
      const geoBox = new THREE.Box3().setFromBufferAttribute(
        mesh.geometry.attributes.position as THREE.BufferAttribute
      );
      mesh.material = makeThermalDeerMaterial(geoBox.min.y, geoBox.max.y);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
    });

    // Normalize: feet at local y=0, height = 1.3 m, centered XZ
    root.scale.setScalar(s);
    root.position.set(
      -((box.min.x + box.max.x) / 2) * s,
      -y0 * s,
      -((box.min.z + box.max.z) / 2) * s
    );
    root.rotation.y = Math.PI * 0.5; // side profile

    return root;
  }, [scene]);

  useEffect(() => {
    if (!group.current) return;
    group.current.visible = visible;
    // ONLY real distance on −Z. Scale = 1 (no boost). Feet world y = 0.
    group.current.position.set(0, 0, -Math.max(1, distanceM));
    group.current.scale.set(1, 1, 1);
  }, [distanceM, visible]);

  return (
    <group
      ref={group}
      position={[0, 0, -Math.max(1, distanceM)]}
      visible={visible}
    >
      <primitive object={prepared} />
    </group>
  );
}

useGLTF.preload(DEER_GLB_URL, true);

// ─── Camera: fixed eye + pitch so ground horizon = HORIZON_FRAC ───────────

function CameraRig({ fovDeg }: { fovDeg: number }) {
  const { camera } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fovDeg;
    cam.zoom = 1; // digi-zoom is post crop only
    cam.near = 0.05;
    cam.far = 8000;
    cam.position.set(0, CAMERA_EYE_HEIGHT_M, 0);
    cam.up.set(0, 1, 0);

    /**
     * Level camera → geometric horizon of y=0 at vertical center (frac 0.5).
     * Backdrop tree-bases sit at HORIZON_FRAC (0.73 from top).
     * Pitch up so horizon moves down to HORIZON_FRAC.
     * three.js: +rotation.x looks down → use negative for look up.
     */
    const halfFov = (fovDeg * Math.PI) / 360;
    const horizonOffsetFromCenter = (HORIZON_FRAC - 0.5) * 2; // +0.46
    // Look UP by this angle so horizon NDC matches texture
    const pitchUp = Math.atan(Math.tan(halfFov) * horizonOffsetFromCenter);
    cam.rotation.order = "YXZ";
    cam.rotation.y = 0;
    cam.rotation.z = 0;
    cam.rotation.x = -pitchUp; // look up
    cam.updateProjectionMatrix();
  }, [camera, fovDeg]);

  return null;
}

// ─── Post: composite 2D forest + transparent deer RT ──────────────────────

function PostCapture({
  grainW,
  grainH,
  digiZoom,
  palette,
  netdMk,
  fog,
  distanceM,
  rangeD,
  forestImg,
  onFrame,
}: {
  grainW: number;
  grainH: number;
  digiZoom: number;
  palette: Palette;
  netdMk: number;
  fog: boolean;
  distanceM: number;
  rangeD: number;
  forestImg: HTMLImageElement | null;
  onFrame: (canvas: HTMLCanvasElement) => void;
}) {
  const { gl, scene, camera } = useThree();
  const rt = useRef<THREE.WebGLRenderTarget | null>(null);
  const outCanvas = useRef<HTMLCanvasElement | null>(null);
  const grainCanvas = useRef<HTMLCanvasElement | null>(null);
  const deerCanvas = useRef<HTMLCanvasElement | null>(null);
  const readBuf = useRef<Uint8Array | null>(null);
  const flipBuf = useRef<Uint8ClampedArray | null>(null);

  useEffect(() => {
    rt.current?.dispose();
    rt.current = new THREE.WebGLRenderTarget(grainW, grainH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    readBuf.current = new Uint8Array(grainW * grainH * 4);
    flipBuf.current = new Uint8ClampedArray(grainW * grainH * 4);
    if (!outCanvas.current) outCanvas.current = document.createElement("canvas");
    if (!grainCanvas.current)
      grainCanvas.current = document.createElement("canvas");
    if (!deerCanvas.current) deerCanvas.current = document.createElement("canvas");
    outCanvas.current.width = LOGIC_W;
    outCanvas.current.height = LOGIC_H;
    grainCanvas.current.width = grainW;
    grainCanvas.current.height = grainH;
    deerCanvas.current.width = grainW;
    deerCanvas.current.height = grainH;
    return () => {
      rt.current?.dispose();
      rt.current = null;
    };
  }, [grainW, grainH]);

  useFrame(() => {
    if (
      !rt.current ||
      !readBuf.current ||
      !flipBuf.current ||
      !outCanvas.current ||
      !grainCanvas.current ||
      !deerCanvas.current
    )
      return;

    const target = rt.current;
    const prev = gl.getRenderTarget();

    // 1) Deer only → transparent RT (forest is 2D, never a 3D plane)
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0); // fully transparent — no black void
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.readRenderTargetPixels(
      target,
      0,
      0,
      grainW,
      grainH,
      readBuf.current as unknown as THREE.TypedArray
    );
    gl.setRenderTarget(prev);

    // Flip Y
    const src = readBuf.current;
    const flipped = flipBuf.current;
    const rowBytes = grainW * 4;
    for (let y = 0; y < grainH; y++) {
      flipped.set(
        src.subarray(y * rowBytes, (y + 1) * rowBytes),
        (grainH - 1 - y) * rowBytes
      );
    }

    const gctx = grainCanvas.current.getContext("2d")!;
    gctx.imageSmoothingEnabled = false;

    // 2) Full-frame forest first (100% coverage — no black zones)
    if (forestImg && forestImg.complete && forestImg.naturalWidth > 0) {
      // Cover-style draw (like CSS object-fit: cover)
      const iw = forestImg.naturalWidth;
      const ih = forestImg.naturalHeight;
      const scale = Math.max(grainW / iw, grainH / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (grainW - dw) / 2;
      const dy = (grainH - dh) / 2;
      gctx.fillStyle = "#0a0b10";
      gctx.fillRect(0, 0, grainW, grainH);
      gctx.drawImage(forestImg, dx, dy, dw, dh);
      // Cold dim of forest plate (keep detail)
      gctx.fillStyle =
        palette === "ironhot"
          ? "rgba(20, 12, 40, 0.35)"
          : "rgba(0, 0, 0, 0.28)";
      gctx.fillRect(0, 0, grainW, grainH);
    } else {
      gctx.fillStyle = "#0a0b10";
      gctx.fillRect(0, 0, grainW, grainH);
    }

    // 3) Composite deer over forest (alpha from clear RT)
    const dctx = deerCanvas.current.getContext("2d")!;
    const deerImg = dctx.createImageData(grainW, grainH);
    deerImg.data.set(flipped);
    dctx.putImageData(deerImg, 0, 0);
    gctx.drawImage(deerCanvas.current, 0, 0);

    // 4) Digi-zoom crop — focus near frame center / body
    const feetY = deerFeetYFrac(distanceM);
    const focusY = Math.min(0.72, Math.max(0.45, feetY - 0.12));
    const crop = digitalZoomCrop(grainW, grainH, digiZoom, 0.5, focusY);

    const octx = outCanvas.current.getContext("2d", {
      willReadFrequently: true,
    })!;
    octx.imageSmoothingEnabled = false;
    // Never leave black: always paint forest base first at logic size too
    if (forestImg && forestImg.complete && forestImg.naturalWidth > 0) {
      const iw = forestImg.naturalWidth;
      const ih = forestImg.naturalHeight;
      const scale = Math.max(LOGIC_W / iw, LOGIC_H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      octx.drawImage(
        forestImg,
        (LOGIC_W - dw) / 2,
        (LOGIC_H - dh) / 2,
        dw,
        dh
      );
    } else {
      octx.fillStyle = "#0a0b10";
      octx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    }
    octx.drawImage(
      grainCanvas.current,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      LOGIC_W,
      LOGIC_H
    );

    // 5) LUT + seeded NETD noise
    const id = octx.getImageData(0, 0, LOGIC_W, LOGIC_H);
    const d = id.data;
    const seed = hashSeed(
      "3d-hybrid",
      netdMk,
      distanceM,
      fog,
      palette,
      digiZoom,
      grainW
    );
    const rand = mulberry32(seed);
    const noiseAmp = netdNoiseAmp(netdMk, fog, distanceM, rangeD);
    const contrast = netdContrast(netdMk, fog);
    const fogLift = fog ? 10 : 0;

    for (let i = 0; i < d.length; i += 4) {
      let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      y = (y - 128) * (0.9 + 0.1 * contrast) + 128 + fogLift;
      const n = (rand() - 0.5) * noiseAmp * 0.9;
      y = Math.max(0, Math.min(255, y + n));
      const t = y / 255;

      if (palette === "whitehot") {
        d[i] = d[i + 1] = d[i + 2] = y;
      } else {
        let r: number, g: number, b: number;
        if (t < 0.25) {
          const k = t / 0.25;
          r = 20 + k * 40;
          g = 10 + k * 20;
          b = 40 + k * 120;
        } else if (t < 0.5) {
          const k = (t - 0.25) / 0.25;
          r = 60 + k * 140;
          g = 30 + k * 40;
          b = 160 - k * 100;
        } else if (t < 0.75) {
          const k = (t - 0.5) / 0.25;
          r = 200 + k * 55;
          g = 70 + k * 120;
          b = 60 - k * 40;
        } else {
          const k = (t - 0.75) / 0.25;
          r = 255;
          g = 190 + k * 65;
          b = 20 + k * 200;
        }
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
      d[i + 3] = 255;
    }
    octx.putImageData(id, 0, 0);

    // Vignette
    const cx = LOGIC_W / 2;
    const cy = LOGIC_H / 2;
    const grd = octx.createRadialGradient(
      cx,
      cy,
      LOGIC_H * 0.28,
      cx,
      cy,
      LOGIC_H * 0.72
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.5)");
    octx.fillStyle = grd;
    octx.fillRect(0, 0, LOGIC_W, LOGIC_H);

    octx.font = "600 11px Manrope, system-ui, sans-serif";
    octx.fillStyle = "rgba(225,29,42,0.95)";
    octx.fillText(`${grainW}×${grainH} hybrid`, 10, 16);
    octx.fillStyle = "rgba(245,246,247,0.85)";
    octx.fillText(`${Math.round(distanceM)} m`, 10, 32);
    if (digiZoom > 1) {
      octx.fillStyle = "rgba(225,29,42,0.95)";
      octx.textAlign = "right";
      octx.fillText(`DIGI ×${digiZoom}`, LOGIC_W - 10, 16);
      octx.textAlign = "left";
    }

    onFrame(outCanvas.current);
    gl.setRenderTarget(null);
    gl.clear();
  }, 1);

  return null;
}

function SceneContent({
  distanceM,
  rangeD,
  palette,
  fog,
  netdMk,
  digiZoom,
  matrix,
  deerVisible,
  fovDeg,
  forestImg,
  onFrame,
}: {
  distanceM: number;
  rangeD: number;
  palette: Palette;
  fog: boolean;
  netdMk: number;
  digiZoom: number;
  matrix: ThermalMatrix;
  deerVisible: boolean;
  fovDeg: number;
  forestImg: HTMLImageElement | null;
  onFrame: (c: HTMLCanvasElement) => void;
}) {
  const grainW = matrixPixelWidth(matrix);
  const grainH = matrixPixelHeight(matrix);

  return (
    <>
      {/* Transparent clear — forest is 2D full-frame behind/under composite */}
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[2, 6, 4]} intensity={0.04} />
      <CameraRig fovDeg={fovDeg} />
      <Suspense fallback={null}>
        <DeerModel distanceM={distanceM} visible={deerVisible} />
      </Suspense>
      <PostCapture
        grainW={grainW}
        grainH={grainH}
        digiZoom={digiZoom}
        palette={palette}
        netdMk={netdMk}
        fog={fog}
        distanceM={distanceM}
        rangeD={rangeD}
        forestImg={forestImg}
        onFrame={onFrame}
      />
    </>
  );
}

// ─── Main UI ──────────────────────────────────────────────────────────────

export function ThermalSimulator3D({
  params,
  locale = "uk",
  allowMatrixPick = false,
  className,
  deviceType = "mono",
}: Props) {
  const isRu = locale === "ru";
  const [matrix, setMatrix] = useState<ThermalMatrix>(params.matrix);
  const [distance, setDistance] = useState(() =>
    defaultSimDistanceM(params.detectionRangeM || 1200)
  );
  const [digiZoom, setDigiZoom] = useState(1);
  const [weather, setWeather] = useState<Weather>("clear");
  const [palette, setPalette] = useState<Palette>("whitehot");
  const [fps, setFps] = useState(0);
  const [forestImg, setForestImg] = useState<HTMLImageElement | null>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef({ t: 0, n: 0 });

  useEffect(() => {
    setMatrix(params.matrix);
  }, [params.matrix]);

  // Preload full-frame forest (2D) — never a 3D plane
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setForestImg(img);
    img.onerror = () => setForestImg(null);
    img.src = FOREST_BACKDROP_URL;
  }, []);

  const simParams: ThermalSimParams = useMemo(
    () => ({
      ...params,
      matrix: allowMatrixPick ? matrix : params.matrix,
      focalMm: params.focalMm ?? null,
      pitchUm: params.pitchUm ?? null,
      label: params.label || (isRu ? "Этот прибор" : "Цей прилад"),
    }),
    [params, matrix, allowMatrixPick, isRu]
  );

  const rangeD = useMemo(
    () => deerDetectionRangeM(simParams.detectionRangeM),
    [simParams.detectionRangeM]
  );
  const sliderMax = Math.max(300, rangeD);

  useEffect(() => {
    setDistance((d) => Math.min(d, sliderMax));
  }, [sliderMax]);

  const fog = weather === "fog";
  const fovRad = resolveFovVerticalRad({
    matrix: simParams.matrix,
    focalMm: simParams.focalMm,
    pitchUm: simParams.pitchUm,
  });
  const fovDeg = cameraFovVerticalDeg({
    matrix: simParams.matrix,
    focalMm: simParams.focalMm,
    pitchUm: simParams.pitchUm,
  });

  const status = computeDetectStatusVisual({
    visualHeightM: DEER_VISUAL_HEIGHT_M,
    criticalSizeM: DEER_CRITICAL_SIZE_M,
    distanceM: distance,
    detectionRangeM: rangeD,
    matrix: simParams.matrix,
    focalMm: simParams.focalMm,
    pitchUm: simParams.pitchUm,
    fog,
  });

  const critPx = renderedCriticalGrainPx(
    DEER_VISUAL_HEIGHT_M,
    DEER_CRITICAL_SIZE_M,
    distance,
    rangeD,
    simParams,
    fog
  );

  const frameFrac = angularFrameHeightFrac(
    DEER_VISUAL_HEIGHT_M,
    distance,
    fovRad
  );

  // Past D: hide deer only (forest stays full-frame)
  const showDeer = targetSubjectVisibility(distance, rangeD, fog) > 0.02;
  const feetFrac = deerFeetYFrac(distance);

  const onFrame = useCallback((src: HTMLCanvasElement) => {
    const dst = displayRef.current;
    if (!dst) return;
    if (dst.width !== LOGIC_W || dst.height !== LOGIC_H) {
      dst.width = LOGIC_W;
      dst.height = LOGIC_H;
    }
    const ctx = dst.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    const now = performance.now();
    fpsRef.current.n += 1;
    if (now - fpsRef.current.t > 500) {
      setFps(
        Math.round((fpsRef.current.n * 1000) / (now - fpsRef.current.t))
      );
      fpsRef.current = { t: now, n: 0 };
    }
  }, []);

  const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
  const statusHint = isRu ? STATUS_HINT_RU[status] : STATUS_HINT_UK[status];

  return (
    <section
      className={cn(
        "thermal-sim rounded-[var(--radius-card)] border border-white/[0.1] p-5 sm:p-6",
        className
      )}
      style={{ background: "var(--surface)" }}
      aria-label={
        isRu ? "3D симулятор тепловизора (гибрид)" : "3D симулятор тепловізора (гібрид)"
      }
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-primary sm:text-xl">
            {isRu
              ? "Симулятор (гібрид: 2D ліс + 3D олень)"
              : "Симулятор (гібрид: 2D ліс + 3D олень)"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-secondary">
            {isRu
              ? "Лес — full-frame 2D. Олень — 3D на Z=−d, без scaleBoost. Ноги на земле (horizon 0.73)."
              : "Ліс — full-frame 2D. Олень — 3D на Z=−d, без scaleBoost. Ноги на землі (horizon 0.73)."}
          </p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              STATUS_COLOR[status]
            )}
          >
            {statusLabel}
          </span>
          <p className="mt-0.5 text-[10px] text-faint">{statusHint}</p>
          <p className="mt-0.5 text-[10px] tabular-nums text-faint">
            Johnson ≈ {critPx.toFixed(1)} px · FOV↓ {fovDeg.toFixed(1)}° ·{" "}
            {(frameFrac * 100).toFixed(1)}% · feetY {(feetFrac * 100).toFixed(0)}%
            {fps > 0 ? ` · ${fps} fps` : ""}
          </p>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black"
        style={{
          boxShadow:
            "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* CSS full-frame forest underlay (always 100% — never a 3D plane hole) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${FOREST_BACKDROP_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter:
              palette === "ironhot"
                ? "sepia(0.35) hue-rotate(-20deg) brightness(0.85)"
                : "brightness(0.9)",
          }}
          aria-hidden
        />

        <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
          {/* Hidden WebGL: deer only, transparent clear */}
          <div className="pointer-events-none absolute inset-0 opacity-0">
            <Canvas
              dpr={1}
              gl={{
                antialias: false,
                alpha: true,
                premultipliedAlpha: false,
                powerPreference: "high-performance",
                preserveDrawingBuffer: true,
              }}
              camera={{
                fov: fovDeg,
                near: 0.05,
                far: 8000,
                position: [0, CAMERA_EYE_HEIGHT_M, 0],
              }}
              style={{ width: LOGIC_W, height: LOGIC_H }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
              }}
            >
              <SceneContent
                distanceM={distance}
                rangeD={rangeD}
                palette={palette}
                fog={fog}
                netdMk={simParams.netdMk}
                digiZoom={digiZoom}
                matrix={simParams.matrix}
                deerVisible={showDeer}
                fovDeg={fovDeg}
                forestImg={forestImg}
                onFrame={onFrame}
              />
            </Canvas>
          </div>

          {/* Visible composite (forest + deer + post) */}
          <canvas
            ref={displayRef}
            width={LOGIC_W}
            height={LOGIC_H}
            className="relative block h-auto w-full"
            style={{ aspectRatio: "4 / 3", imageRendering: "pixelated" }}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                disabled={digiZoom <= 1}
                onClick={() => setDigiZoom(nextDigiZoom(digiZoom, -1))}
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-[11px] font-semibold text-white">
                ×{digiZoom}
              </span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-black/70 text-sm font-bold text-white disabled:opacity-35"
                disabled={digiZoom >= 32}
                onClick={() => setDigiZoom(nextDigiZoom(digiZoom, 1))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="pointer-events-auto rounded-md border border-[var(--accent)]/80 bg-[rgba(225,29,42,0.85)] px-2.5 py-1.5 text-[11px] font-bold uppercase text-white"
              onClick={() => {
                const z = inspectDigiZoom(distance, DIST_MIN_M, frameFrac);
                setDigiZoom(digiZoom >= z && digiZoom > 1 ? 1 : z);
              }}
            >
              {digiZoom > 1
                ? isRu
                  ? "Сброс ×1"
                  : "Скинути ×1"
                : isRu
                  ? "Увеличить цель"
                  : "Збільшити ціль"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <fieldset className="sm:col-span-2 lg:col-span-3">
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Цель" : "Ціль"}
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--accent)] bg-[rgba(225,29,42,0.15)] px-3 py-2 text-sm font-medium text-primary"
            >
              {isRu ? "Олень" : "Олень"}
              <span className="ml-1.5 text-[10px] text-faint">
                {DEER_VISUAL_HEIGHT_M} m · crit {DEER_CRITICAL_SIZE_M} m
              </span>
            </button>
            <span className="self-center text-[10px] text-faint">
              {isRu
                ? "Только олень (3D). Без scaleBoost."
                : "Лише олень (3D). Без scaleBoost."}
            </span>
          </div>
        </fieldset>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium text-muted-ui">
              <span>{isRu ? "Дистанция" : "Дистанція"}</span>
              <span className="tabular-nums text-primary">
                {distance} м · D≈{rangeD} м
              </span>
            </span>
            <input
              type="range"
              min={DIST_MIN_M}
              max={sliderMax}
              step={10}
              value={Math.min(distance, sliderMax)}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="thermal-range w-full"
            />
            <span className="mt-1 block text-[10px] text-faint">
              Z=−{distance} m · FOV↓ {fovDeg.toFixed(1)}° · frame ≈{" "}
              {(frameFrac * 100).toFixed(1)}% · feetY≈{(feetFrac * 100).toFixed(0)}%
              (horizon {(HORIZON_FRAC * 100).toFixed(0)}%) · no scaleBoost
            </span>
          </label>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Погода" : "Погода"}
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["clear", "Ясно"],
                ["fog", isRu ? "Туман" : "Туман"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setWeather(k)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-2 text-xs font-medium",
                  weather === k
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary"
                )}
              >
                {lab}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            {isRu ? "Палитра" : "Палітра"}
          </legend>
          <div className="flex gap-2">
            {(
              [
                ["whitehot", "White-hot"],
                ["ironhot", "Red-hot"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPalette(k)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-2 text-xs font-medium",
                  palette === k
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary"
                )}
              >
                {lab}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-ui">
            Digi-zoom
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {DIGI_ZOOM_STEPS.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setDigiZoom(z)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-semibold",
                  digiZoom === z
                    ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                    : "border-white/10 text-secondary"
                )}
              >
                ×{z}
              </button>
            ))}
          </div>
        </fieldset>

        {allowMatrixPick && (
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-ui">
              Matrix
            </legend>
            <div className="flex gap-2">
              {([256, 384, 640] as ThermalMatrix[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMatrix(m)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-xs font-medium",
                    matrix === m
                      ? "border-[var(--accent)] bg-[rgba(225,29,42,0.15)] text-primary"
                      : "border-white/10 text-secondary"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-faint">
        Hybrid: full-frame 2D forest + 3D deer Z=−d · eye {CAMERA_EYE_HEIGHT_M} m ·
        horizon {HORIZON_FRAC} · no scaleBoost · {simParams.label} · NETD{" "}
        {simParams.netdMk} mK · D≈{rangeD} m
        {deviceType ? ` · ${deviceType}` : ""}
      </p>
    </section>
  );
}

export default ThermalSimulator3D;
