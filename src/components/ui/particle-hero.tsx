"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { ArrowRight, Lightbulb, LightbulbOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  fadeDelay: number;
  fadeStart: number;
  fadingOut: boolean;
  reset: () => void;
  update: () => void;
  draw: (ctx: CanvasRenderingContext2D, gold: boolean) => void;
}

interface ParticleHeroProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  secondaryLabel: string;
  className?: string;
}

export function ParticleHero({
  title,
  subtitle,
  ctaLabel,
  secondaryLabel,
  className,
}: ParticleHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLightOn, setIsLightOn] = useState(false);
  const lightRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const particle: Particle = {
      x: 0,
      y: 0,
      speed: 0,
      opacity: 1,
      fadeDelay: 0,
      fadeStart: 0,
      fadingOut: false,
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speed = Math.random() / 5 + 0.1;
        this.opacity = 1;
        this.fadeDelay = Math.random() * 600 + 100;
        this.fadeStart = Date.now() + this.fadeDelay;
        this.fadingOut = false;
      },
      update() {
        this.y -= this.speed;
        if (this.y < 0) {
          this.reset();
        }
        if (!this.fadingOut && Date.now() > this.fadeStart) {
          this.fadingOut = true;
        }
        if (this.fadingOut) {
          this.opacity -= 0.008;
          if (this.opacity <= 0) {
            this.reset();
          }
        }
      },
      draw(ctx: CanvasRenderingContext2D, gold: boolean) {
        if (gold) {
          const g = 180 + Math.random() * 60;
          ctx.fillStyle = `rgba(255, ${g}, 40, ${this.opacity * 0.9})`;
        } else {
          const r = 200 + Math.random() * 55;
          ctx.fillStyle = `rgba(${r}, 230, 255, ${this.opacity})`;
        }
        ctx.fillRect(this.x, this.y, 0.6, Math.random() * 2.5 + 1);
      },
    };

    particle.reset();
    particle.y = Math.random() * canvas.height;
    particle.fadeDelay = Math.random() * 600 + 100;
    particle.fadeStart = Date.now() + particle.fadeDelay;
    particle.fadingOut = false;
    return particle;
  }, []);

  const initParticles = useCallback(
    (canvas: HTMLCanvasElement) => {
      const count = Math.floor((canvas.width * canvas.height) / 6000);
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(canvas));
      }
    },
    [createParticle]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      initParticles(canvas);
    };

    resize();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gold = lightRef.current;
      particlesRef.current.forEach((p) => {
        p.update();
        p.draw(ctx, gold);
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Sync with site-wide LightSwitch
    const onGlobal = (e: Event) => {
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      if (detail && typeof detail.on === "boolean") {
        lightRef.current = detail.on;
        setIsLightOn(detail.on);
      }
    };
    window.addEventListener("optics-light", onGlobal);
    try {
      const saved = localStorage.getItem("optics_light_mode") === "1";
      if (saved) {
        lightRef.current = true;
        setIsLightOn(true);
      }
    } catch {
      /* ignore */
    }

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("optics-light", onGlobal);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [initParticles]);

  const toggleLight = () => {
    setIsLightOn((v) => {
      const next = !v;
      lightRef.current = next;
      try {
        localStorage.setItem("optics_light_mode", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      document.documentElement.dataset.light = next ? "on" : "off";
      window.dispatchEvent(
        new CustomEvent("optics-light", { detail: { on: next } })
      );
      return next;
    });
  };

  return (
    <section
      ref={containerRef}
      className={cn(
        "particle-hero relative isolate min-h-[560px] w-full overflow-hidden sm:min-h-[640px] lg:min-h-[700px]",
        isLightOn && "particle-hero--light",
        className
      )}
    >
      {/* Atmosphere layers */}
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-700",
          isLightOn
            ? "bg-[#1a1408]"
            : "bg-[#05060f]"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          isLightOn
            ? "bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,189,16,0.22),transparent_55%)]"
            : "bg-[linear-gradient(0deg,rgba(216,236,248,0.06),rgba(152,192,239,0.06))]"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-700",
          isLightOn
            ? "bg-gradient-to-t from-amber-900/30 to-transparent"
            : "bg-gradient-to-t from-[#05060f] to-transparent"
        )}
      />

      <canvas
        ref={canvasRef}
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full transition-[filter] duration-700",
          isLightOn &&
            "drop-shadow-[0_0_12px_rgba(216,189,16,0.45)]"
        )}
        aria-hidden
      />

      {/* Soft mountain silhouettes */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] opacity-40">
        <div
          className={cn(
            "absolute bottom-0 left-[-5%] h-full w-[40%] rounded-t-[100%] transition-shadow duration-700",
            isLightOn
              ? "bg-gradient-to-t from-amber-950/80 to-amber-800/20 shadow-[inset_0_2px_0_0_rgba(216,169,16,0.35)]"
              : "bg-gradient-to-t from-slate-900/90 to-slate-700/20"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-[25%] h-[85%] w-[45%] rounded-t-[100%] transition-shadow duration-700",
            isLightOn
              ? "bg-gradient-to-t from-amber-950/70 to-amber-700/15 shadow-[inset_0_2px_0_0_rgba(216,169,16,0.25)]"
              : "bg-gradient-to-t from-slate-900/80 to-indigo-900/20"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 right-[-8%] h-[95%] w-[50%] rounded-t-[100%]",
            isLightOn
              ? "bg-gradient-to-t from-amber-950/80 to-amber-800/10"
              : "bg-gradient-to-t from-slate-950/90 to-slate-800/15"
          )}
        />
      </div>

      {/* Content */}
      <div className="container-shop relative z-10 flex min-h-[560px] flex-col justify-center py-16 sm:min-h-[640px] lg:min-h-[700px]">
        <div className="max-w-2xl">
          <p
            className={cn(
              "mb-3 text-xs font-semibold uppercase tracking-[0.22em] transition-colors duration-500",
              isLightOn ? "text-amber-200/80" : "text-sky-200/60"
            )}
          >
            Professional Optics · Ukraine
          </p>
          <h1
            className={cn(
              "font-display text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl xl:text-[3.25rem] transition-colors duration-500",
              isLightOn ? "text-amber-50" : "text-white"
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              "mt-5 max-w-lg text-base leading-relaxed sm:text-lg transition-colors duration-500",
              isLightOn ? "text-amber-100/75" : "text-slate-300"
            )}
          >
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalog/teplovizori"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98]",
                isLightOn
                  ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                  : "bg-accent text-white hover:bg-accent-hover"
              )}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="tel:+380501112233"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition",
                isLightOn
                  ? "border-amber-400/40 text-amber-50 hover:bg-amber-400/10"
                  : "border-white/20 text-white hover:bg-white/5"
              )}
            >
              {secondaryLabel}
            </a>
          </div>
        </div>
      </div>

      {/* Light switch */}
      <button
        type="button"
        onClick={toggleLight}
        className={cn(
          "absolute bottom-6 right-6 z-20 flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider shadow-lift backdrop-blur-md transition-all duration-300 sm:bottom-8 sm:right-8",
          isLightOn
            ? "border-amber-400/50 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25"
            : "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
        )}
        aria-pressed={isLightOn}
        aria-label={isLightOn ? "Turn light off" : "Turn light on"}
        title={isLightOn ? "Вимкнути світло" : "Увімкнути світло"}
      >
        {isLightOn ? (
          <Lightbulb className="h-4 w-4 fill-amber-300 text-amber-300" />
        ) : (
          <LightbulbOff className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isLightOn ? "Light ON" : "Light OFF"}
        </span>
      </button>

      {/* Mid spotlight (decorative) */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl transition-all duration-700",
          isLightOn
            ? "bg-amber-400/40 opacity-100"
            : "bg-sky-300/10 opacity-60"
        )}
      />
    </section>
  );
}
