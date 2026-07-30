"use client";

/**
 * 3D thermal simulator — DEER ONLY.
 * Perspective FOV from optics; deer on real Z distance; cold forest backdrop;
 * thermal emissive materials + grain pixelation + seeded noise + digi zoom.
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
import { useGLTF, useTexture } from "@react-three/drei";
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
  angularFrameHeightFrac,
  cameraFovVerticalDeg,
  computeDetectStatusVisual,
  deerDetectionRangeM,
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

// ─── Thermal emissive material (hot core / cooler legs) ───────────────────

function makeThermalDeerMaterial(
  localYMin: number,
  localYMax: number
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.02, 0.02, 0.03),
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: 1.35,
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
         // Heat: belly/chest brightest; legs & antler tips cooler
         float h = clamp(vBodyY, 0.0, 1.0);
         float core = smoothstep(0.12, 0.55, h) * (1.0 - 0.35 * smoothstep(0.75, 1.0, h));
         float legs = mix(0.28, 0.55, smoothstep(0.0, 0.2, h));
         float heat = max(legs, core);
         totalEmissiveRadiance *= heat;`
      );
    mat.userData.shader = shader;
  };

  return mat;
}

// ─── Deer model ───────────────────────────────────────────────────────────

function DeerModel({
  distanceM,
  visible,
  scaleBoost = 1,
}: {
  distanceM: number;
  visible: boolean;
  /** Detect-floor boost when FOV projects &lt;2 grain px but still in band */
  scaleBoost?: number;
}) {
  const group = useRef<THREE.Group>(null);
  // Draco decoder (CDN) — GLB still uses KHR_draco_mesh_compression
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
      // Strip any remaining maps; pure thermal emissive
      mesh.material = makeThermalDeerMaterial(geoBox.min.y, geoBox.max.y);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });

    root.scale.setScalar(s);
    root.position.set(
      -((box.min.x + box.max.x) / 2) * s,
      -y0 * s,
      -((box.min.z + box.max.z) / 2) * s
    );
    // Side profile toward camera
    root.rotation.y = Math.PI * 0.5;

    return { root, baseScale: s };
  }, [scene]);

  useEffect(() => {
    if (!group.current) return;
    group.current.visible = visible;
    // Real meters on −Z. Camera at z=0 → deer at −d (perspective size ∝ 1/d)
    group.current.position.set(0, 0, -Math.max(1, distanceM));
    group.current.scale.setScalar(Math.max(0.01, scaleBoost));
  }, [distanceM, visible, scaleBoost]);

  return (
    <group
      ref={group}
      position={[0, 0, -Math.max(1, distanceM)]}
      scale={Math.max(0.01, scaleBoost)}
      visible={visible}
    >
      <primitive object={prepared.root} />
    </group>
  );
}

useGLTF.preload(DEER_GLB_URL, true);

// ─── Cold forest backdrop ─────────────────────────────────────────────────

function ForestBackdrop({
  maxRangeM,
  palette,
}: {
  maxRangeM: number;
  palette: Palette;
}) {
  const tex = useTexture(FOREST_BACKDROP_URL);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  }, [tex]);

  // Plane far enough to always fill FOV; scale ~ tan(fov/2)*2*depth * aspect
  const depth = Math.max(400, maxRangeM * 1.35);
  const halfH = Math.tan((12 * Math.PI) / 360) * depth * 2.2;
  const halfW = halfH * (LOGIC_W / LOGIC_H) * 1.15;

  const color =
    palette === "ironhot"
      ? new THREE.Color(0.08, 0.06, 0.18)
      : new THREE.Color(0.12, 0.13, 0.15);

  return (
    <mesh position={[0, CAMERA_EYE_HEIGHT_M * 0.35, -depth]} renderOrder={-1}>
      <planeGeometry args={[halfW * 2, halfH * 2]} />
      <meshBasicMaterial
        map={tex}
        color={color}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Ground plane (cold litter) ───────────────────────────────────────────

function ColdGround() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, -200]}
      receiveShadow={false}
    >
      <planeGeometry args={[800, 800]} />
      <meshBasicMaterial color="#05060a" toneMapped={false} />
    </mesh>
  );
}

// ─── Post: grain + digi crop + LUT + noise on 2D canvas ───────────────────

function PostCapture({
  grainW,
  grainH,
  digiZoom,
  palette,
  netdMk,
  fog,
  distanceM,
  rangeD,
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
  onFrame: (canvas: HTMLCanvasElement) => void;
}) {
  const { gl, scene, camera, size } = useThree();
  const rt = useRef<THREE.WebGLRenderTarget | null>(null);
  const outCanvas = useRef<HTMLCanvasElement | null>(null);
  const grainCanvas = useRef<HTMLCanvasElement | null>(null);
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
    if (!grainCanvas.current) grainCanvas.current = document.createElement("canvas");
    outCanvas.current.width = LOGIC_W;
    outCanvas.current.height = LOGIC_H;
    grainCanvas.current.width = grainW;
    grainCanvas.current.height = grainH;
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
      !grainCanvas.current
    )
      return;
    const target = rt.current;

    // 1) Render scene into grain RT (pixelation = low-res render)
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.setClearColor("#05060a", 1);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.readRenderTargetPixels(
      target,
      0,
      0,
      grainW,
      grainH,
      // three r170 typings expect ArrayBufferView
      readBuf.current as unknown as THREE.TypedArray
    );
    gl.setRenderTarget(prev);

    // Flip Y (WebGL read is bottom-up)
    const src = readBuf.current;
    const flipped = flipBuf.current;
    const rowBytes = grainW * 4;
    for (let y = 0; y < grainH; y++) {
      const srcOff = y * rowBytes;
      const dstOff = (grainH - 1 - y) * rowBytes;
      flipped.set(src.subarray(srcOff, srcOff + rowBytes), dstOff);
    }

    // 2) Digi-zoom crop on grain
    const crop = digitalZoomCrop(grainW, grainH, digiZoom, 0.5, 0.52);
    const tmp = grainCanvas.current;
    const tctx = tmp.getContext("2d")!;
    const img = tctx.createImageData(grainW, grainH);
    img.data.set(flipped);
    tctx.putImageData(img, 0, 0);

    // 3) Upscale crop → logic canvas + LUT + noise
    const octx = outCanvas.current.getContext("2d", {
      willReadFrequently: true,
    })!;
    octx.imageSmoothingEnabled = false;
    octx.fillStyle = "#05060a";
    octx.fillRect(0, 0, LOGIC_W, LOGIC_H);
    octx.drawImage(
      tmp,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      LOGIC_W,
      LOGIC_H
    );

    const id = octx.getImageData(0, 0, LOGIC_W, LOGIC_H);
    const d = id.data;
    const seed = hashSeed(
      "3d-deer",
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
      // Luma of rendered thermal scene
      let y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Soft contrast
      y = (y - 128) * (0.9 + 0.1 * contrast) + 128 + fogLift;
      const n = (rand() - 0.5) * noiseAmp * 0.9;
      y = Math.max(0, Math.min(255, y + n));
      const t = y / 255;

      if (palette === "whitehot") {
        d[i] = d[i + 1] = d[i + 2] = y;
      } else {
        // Iron / red-hot LUT
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

    // Soft circular vignette (ocular feel)
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
    grd.addColorStop(1, "rgba(0,0,0,0.55)");
    octx.fillStyle = grd;
    octx.fillRect(0, 0, LOGIC_W, LOGIC_H);

    // HUD distances
    octx.font = "600 11px Manrope, system-ui, sans-serif";
    octx.fillStyle = "rgba(225,29,42,0.95)";
    octx.fillText(`${grainW}×${grainH} 3D`, 10, 16);
    octx.fillStyle = "rgba(245,246,247,0.85)";
    octx.fillText(`${Math.round(distanceM)} m`, 10, 32);
    if (digiZoom > 1) {
      octx.fillStyle = "rgba(225,29,42,0.95)";
      octx.textAlign = "right";
      octx.fillText(`DIGI ×${digiZoom}`, LOGIC_W - 10, 16);
      octx.textAlign = "left";
    }

    onFrame(outCanvas.current);
    // Prevent default r3f present of raw scene (we show 2D canvas)
    gl.setRenderTarget(null);
    gl.clear();
  }, 1);

  // Keep camera FOV / zoom updated
  void size;
  return null;
}

function CameraRig({
  fovDeg,
  digiZoom,
}: {
  fovDeg: number;
  digiZoom: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fovDeg;
    cam.zoom = Math.max(1, digiZoom);
    cam.near = 0.05;
    cam.far = 8000;
    cam.position.set(0, CAMERA_EYE_HEIGHT_M, 0);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, CAMERA_EYE_HEIGHT_M * 0.55, -100);
    cam.updateProjectionMatrix();
  }, [camera, fovDeg, digiZoom]);
  return null;
}

// ─── Scene shell ──────────────────────────────────────────────────────────

function SceneContent({
  distanceM,
  rangeD,
  maxRangeM,
  palette,
  fog,
  netdMk,
  digiZoom,
  matrix,
  deerVisible,
  fovDeg,
  fovRad,
  onFrame,
}: {
  distanceM: number;
  rangeD: number;
  maxRangeM: number;
  palette: Palette;
  fog: boolean;
  netdMk: number;
  digiZoom: number;
  matrix: ThermalMatrix;
  deerVisible: boolean;
  fovDeg: number;
  fovRad: number;
  onFrame: (c: HTMLCanvasElement) => void;
}) {
  const grainW = matrixPixelWidth(matrix);
  const grainH = matrixPixelHeight(matrix);

  // Detect floor: if still in band but FOV projects &lt;2 grain on critical, boost scale
  const passPx = (2 * rangeD) / Math.max(1, distanceM);
  const frac = angularFrameHeightFrac(
    DEER_VISUAL_HEIGHT_M,
    distanceM,
    fovRad
  );
  const critGrain =
    frac * grainH * (DEER_CRITICAL_SIZE_M / DEER_VISUAL_HEIGHT_M);
  let scaleBoost = 1;
  if (passPx >= 2 && critGrain < 2 && critGrain > 0) {
    scaleBoost = Math.min(8, 2.5 / critGrain);
  }

  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <ambientLight intensity={0.15} />
      {/* Fill light so emissive-only still reads if tone mapping sneaks in */}
      <directionalLight position={[2, 6, 4]} intensity={0.05} />
      <CameraRig fovDeg={fovDeg} digiZoom={1} />
      <ColdGround />
      <Suspense fallback={null}>
        <ForestBackdrop maxRangeM={maxRangeM} palette={palette} />
        <DeerModel
          distanceM={distanceM}
          visible={deerVisible}
          scaleBoost={scaleBoost}
        />
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
  const displayRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef({ t: 0, n: 0 });

  useEffect(() => {
    setMatrix(params.matrix);
  }, [params.matrix]);

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

  // Past D: hide deer (status none ⇔ no hot mark) — same as 2D fade
  const showDeer = targetSubjectVisibility(distance, rangeD, fog) > 0.02;

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
      setFps(Math.round((fpsRef.current.n * 1000) / (now - fpsRef.current.t)));
      fpsRef.current = { t: now, n: 0 };
    }
  }, []);

  const statusLabel = isRu ? STATUS_RU[status] : STATUS_UK[status];
  const statusHint = isRu ? STATUS_HINT_RU[status] : STATUS_HINT_UK[status];
  const ocular =
    deviceType === "scope" ||
    deviceType === "binocular" ||
    deviceType === "clipon";

  return (
    <section
      className={cn(
        "thermal-sim rounded-[var(--radius-card)] border border-white/[0.1] p-5 sm:p-6",
        className
      )}
      style={{ background: "var(--surface)" }}
      aria-label={isRu ? "3D симулятор тепловизора" : "3D симулятор тепловізора"}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-primary sm:text-xl">
            {isRu ? "3D-симулятор (олень)" : "3D-симулятор (олень)"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-secondary">
            {isRu
              ? "Реальная перспектива: FOV из объектива, олень на дистанции Z. Лес холодный, цель горячая. Остальные цели временно скрыты."
              : "Реальна перспектива: FOV з об'єктива, олень на дистанції Z. Ліс холодний, ціль гаряча. Інші цілі тимчасово приховані."}
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
            {frameFrac * 100 < 10
              ? `${(frameFrac * 100).toFixed(1)}%`
              : `${Math.round(frameFrac * 100)}%`}{" "}
            {isRu ? "кадра" : "кадру"}
            {fps > 0 ? ` · ${fps} fps` : ""}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-zinc-700/80 bg-black",
          ocular && "rounded-full sm:rounded-xl"
        )}
        style={{
          boxShadow:
            "0 0 0 3px #1a1d24, 0 12px 40px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Hidden WebGL canvas (scene) + visible 2D post canvas */}
        <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
          <div className="pointer-events-none absolute inset-0 opacity-0">
            <Canvas
              dpr={1}
              gl={{
                antialias: false,
                alpha: false,
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
            >
              <SceneContent
                distanceM={distance}
                rangeD={rangeD}
                maxRangeM={sliderMax}
                palette={palette}
                fog={fog}
                netdMk={simParams.netdMk}
                digiZoom={digiZoom}
                matrix={simParams.matrix}
                deerVisible={showDeer}
                fovDeg={fovDeg}
                fovRad={fovRad}
                onFrame={onFrame}
              />
            </Canvas>
          </div>
          <canvas
            ref={displayRef}
            width={LOGIC_W}
            height={LOGIC_H}
            className="block h-auto w-full"
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
                ? "Кабан / лиса / человек — скоро (3D). Сейчас только олень."
                : "Кабан / лисиця / людина — скоро (3D). Зараз лише олень."}
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
              {isRu
                ? `Z = −${distance} m · доля кадра ≈ ${(frameFrac * 100).toFixed(1)}% (FOV↓ ${fovDeg.toFixed(1)}°). Туман/палитра не двигают оленя.`
                : `Z = −${distance} m · частка кадру ≈ ${(frameFrac * 100).toFixed(1)}% (FOV↓ ${fovDeg.toFixed(1)}°). Туман/палітра не рухають оленя.`}
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
                ["clear", isRu ? "Ясно" : "Ясно"],
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
        {isRu
          ? `3D: deer.glb (~47 KB без текстур) · Z=−d м · FOV_верт из f/pitch/матрицы · статус Johnson по grain · NETD→шум · digi×1…32. Модель: ${simParams.label} · NETD ${simParams.netdMk} mK · D_олень≈${rangeD} м.`
          : `3D: deer.glb (~47 KB без текстур) · Z=−d м · FOV_верт з f/pitch/матриці · статус Johnson по grain · NETD→шум · digi×1…32. Модель: ${simParams.label} · NETD ${simParams.netdMk} mK · D_олень≈${rangeD} м.`}
      </p>
    </section>
  );
}

export default ThermalSimulator3D;
