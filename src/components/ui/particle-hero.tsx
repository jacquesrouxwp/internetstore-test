"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { ArrowRight } from "lucide-react";
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
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export interface ParticleHeroProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  secondaryLabel?: string;
  className?: string;
}

const STORAGE_KEY = "optics_light_mode";

export function ParticleHero({
  title = "OpticsShop",
  subtitle = "The world's best platform for thermal optics, powered by professionals",
  ctaLabel = "Каталог",
  secondaryLabel = "Консультація",
  className,
}: ParticleHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isGoldMode, setIsGoldMode] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  const createParticle = (canvas: HTMLCanvasElement): Particle => {
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
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(${255 - (Math.random() * 255) / 2}, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, 0.4, Math.random() * 2 + 1);
      },
    };

    particle.reset();
    particle.y = Math.random() * canvas.height;
    particle.fadeDelay = Math.random() * 600 + 100;
    particle.fadeStart = Date.now() + particle.fadeDelay;
    particle.fadingOut = false;
    return particle;
  };

  const calculateParticleCount = (canvas: HTMLCanvasElement) => {
    return Math.floor((canvas.width * canvas.height) / 6000);
  };

  const initParticles = (canvas: HTMLCanvasElement) => {
    const particleCount = calculateParticleCount(canvas);
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(canvas));
    }
  };

  const animate = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current.forEach((particle) => {
      particle.update();
      particle.draw(ctx);
    });
    animationRef.current = requestAnimationFrame(() => animate(canvas, ctx));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const rect = root.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
      initParticles(canvas);
    };

    handleResize();
    animate(canvas, ctx);
    window.addEventListener("resize", handleResize);

    // restore / sync light mode
    try {
      const saved = localStorage.getItem(STORAGE_KEY) === "1";
      if (saved) setIsGoldMode(true);
    } catch {
      /* ignore */
    }

    const onGlobal = (e: Event) => {
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      if (detail && typeof detail.on === "boolean") {
        setIsGoldMode(detail.on);
      }
    };
    window.addEventListener("optics-light", onGlobal);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("optics-light", onGlobal);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGoldMode = () => {
    setIsGoldMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
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

  // Split title for large display — use first line / rest if long
  const titleLines = title.length > 28 ? title.split(" ").reduce<string[]>((acc, word, i, arr) => {
    if (i < Math.ceil(arr.length / 2)) {
      acc[0] = (acc[0] ? acc[0] + " " : "") + word;
    } else {
      acc[1] = (acc[1] ? acc[1] + " " : "") + word;
    }
    return acc;
  }, ["", ""]) : [title];

  return (
    <div
      ref={rootRef}
      className={cn(
        "particle-hero relative h-[640px] w-full overflow-hidden sm:h-[700px] lg:h-[760px]",
        isGoldMode && "gold-mode",
        className
      )}
      style={{
        background: "#05060f",
        backgroundImage:
          "linear-gradient(0deg,rgba(216,236,248,.06),rgba(152,192,239,.06))",
        fontSize: "max(calc(min(600px, 80vh) * 0.03), 10px)",
        WebkitFontSmoothing: "antialiased",
        textRendering: "optimizeLegibility",
      }}
    >
      <style jsx global>{`
        .particle-hero.gold-mode .header h2,
        .particle-hero.gold-mode .heroT h2,
        .particle-hero.gold-mode .heroP,
        .particle-hero.gold-mode .hero-cta-secondary {
          filter: invert(1) brightness(4.7);
        }
        .particle-hero.gold-mode canvas {
          filter: drop-shadow(2em 4em 0px #d8bd10)
            drop-shadow(-8em -14em 0px #d8bd10);
        }
        .particle-hero.gold-mode .header .spotlight {
          filter: invert(1) brightness(4.7) opacity(0.5);
        }
        .particle-hero.gold-mode .mountains > div {
          box-shadow:
            -1em -0.2em 0.4em -1.1em #c2ccff,
            inset 0em 0em 0em 2px #d8a910,
            inset 0.2em 0.3em 0.2em -0.2em #c2ccff,
            inset 10.2em 10.3em 2em -10em #d4e6ff2f;
        }
        .particle-hero.gold-mode .content-section,
        .particle-hero.gold-mode .content-section::before,
        .particle-hero.gold-mode .content-section::after {
          filter: invert(1) brightness(4.4) opacity(1);
        }
        .particle-hero.gold-mode .header > div.mid-spot {
          box-shadow: 0 0 1em 0 #d8bd10;
        }
        .particle-hero.gold-mode .header > div.mid-spot:hover {
          box-shadow: -0.3em 0.1em 0.2em 0 #98c0ef;
        }
        .particle-hero.gold-mode .accent-lines > div > div {
          filter: invert(1) brightness(3.5);
        }
        .particle-hero.gold-mode .hero-cta-primary {
          background: #d8bd10 !important;
          color: #1a1408 !important;
        }

        @keyframes ph-load {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes ph-up {
          100% {
            transform: translateY(0);
          }
        }
        @keyframes ph-load3 {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 0.7;
          }
        }
        @keyframes ph-pulse {
          0% {
            --p: 0%;
          }
          50% {
            --p: 300%;
          }
          100% {
            --p: 300%;
          }
        }
        @keyframes ph-colorize {
          0% {
            filter: hue-rotate(0deg);
          }
          100% {
            filter: hue-rotate(-380deg);
          }
        }
        @keyframes ph-spotlight {
          0% {
            transform: rotateZ(0deg) scale(1);
            filter: blur(15px) opacity(0.5);
          }
          20% {
            transform: rotateZ(-1deg) scale(1.2);
            filter: blur(16px) opacity(0.6);
          }
          40% {
            transform: rotateZ(2deg) scale(1.3);
            filter: blur(14px) opacity(0.4);
          }
          60% {
            transform: rotateZ(-2deg) scale(1.2);
            filter: blur(15px) opacity(0.6);
          }
          80% {
            transform: rotateZ(1deg) scale(1.1);
            filter: blur(13px) opacity(0.4);
          }
          100% {
            transform: rotateZ(0deg) scale(1);
            filter: blur(15px) opacity(0.5);
          }
        }
        @keyframes ph-loadrot {
          0% {
            transform: rotate(0deg) scale(0);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes ph-accentload {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes ph-accentload2 {
          0% {
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
          50% {
            transform: scale(0);
          }
          100% {
            opacity: 0.12;
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes ph-accentload3 {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-360deg);
          }
          50% {
            transform: scale(0);
          }
          100% {
            opacity: 0.12;
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes ph-mountainload1 {
          0% {
            bottom: -240%;
          }
          100% {
            bottom: -40%;
          }
        }
        @keyframes ph-mountainload2 {
          0% {
            bottom: -240%;
          }
          100% {
            bottom: -20%;
          }
        }
        @property --p {
          syntax: "<percentage>";
          inherits: false;
          initial-value: 0%;
        }
      `}</style>

      {/* Header + light mid-spot + spotlight cones */}
      <div
        className="header"
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "center",
          color: "#bad6f7",
          padding: "2em",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          margin: "0 auto",
          opacity: 0,
          transform: "translateY(-1em)",
          animation:
            "ph-load 2s ease-in 0.4s forwards, ph-up 1.4s ease-out 0.4s forwards",
          zIndex: 5,
        }}
      >
        <div
          className="mid-spot"
          role="button"
          tabIndex={0}
          aria-label={isGoldMode ? "Turn light off" : "Turn light on"}
          aria-pressed={isGoldMode}
          title={isGoldMode ? "Вимкнути світло" : "Увімкнути світло"}
          onClick={toggleGoldMode}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleGoldMode();
            }
          }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            margin: "0 auto",
            width: "1.8em",
            height: "1.8em",
            borderRadius: "50%",
            background: "black",
            boxShadow: isGoldMode ? "0 0 1em 0 #d8bd10" : "0 0 1em 0 #98c0ef",
            cursor: "pointer",
            transition: "box-shadow 1s ease-in-out",
            zIndex: 6,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = isGoldMode
              ? "-0.3em 0.1em 0.2em 0 #98c0ef"
              : "-0.3em 0.1em 0.2em 0 #d8bd10";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isGoldMode
              ? "0 0 1em 0 #d8bd10"
              : "0 0 1em 0 #98c0ef";
          }}
        />

        <div
          className="spotlight"
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            margin: "0 auto",
            transition: "filter 1s ease-in-out",
            height: "42em",
            width: "100%",
            overflow: "hidden",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: "0 0 50% 50%",
                position: "absolute",
                left: 0,
                right: 0,
                margin: "0 auto",
                top: "3em",
                width: "min(30em, 90vw)",
                height: "max(42em, 86vh)",
                backgroundImage:
                  "conic-gradient(from 0deg at 50% -5%, transparent 45%, rgba(124, 145, 182, .3) 49%, rgba(124, 145, 182, .5) 50%, rgba(124, 145, 182, .3) 51%, transparent 55%)",
                transformOrigin: "50% 0",
                filter: "blur(15px) opacity(0.5)",
                zIndex: -1,
                transform:
                  i === 0
                    ? "rotate(20deg)"
                    : i === 1
                      ? "rotate(-20deg)"
                      : "rotate(0deg)",
                animation:
                  i === 0
                    ? "ph-load 2s ease-in-out forwards, ph-loadrot 2s ease-in-out forwards, ph-spotlight 17s ease-in-out infinite"
                    : i === 1
                      ? "ph-load 2s ease-in-out forwards, ph-loadrot 2s ease-in-out forwards, ph-spotlight 14s ease-in-out infinite"
                      : "ph-load 2s ease-in-out forwards, ph-loadrot 2s ease-in-out forwards, ph-spotlight 21s ease-in-out infinite reverse",
              }}
            />
          ))}
        </div>
      </div>

      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        id="particleCanvas"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          animation: "ph-load 0.4s ease-in-out forwards",
          zIndex: 1,
          width: "100%",
          height: "100%",
          transition: "filter 1s ease-in-out",
        }}
      />

      {/* Accent lines */}
      <div
        className="accent-lines"
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: "42em",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            left: 0,
            margin: "auto",
            height: "100%",
            width: "100%",
          }}
        >
          {[6, 11, 16, 24, 29].map((top, i) => (
            <div
              key={`h-${i}`}
              style={{
                position: "absolute",
                top: `${top}em`,
                right: 0,
                left: 0,
                margin: "auto",
                width: "100%",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(186, 215, 247, .18), transparent)",
                opacity: 0,
                transform: "scale(0)",
                animation: "ph-accentload 2s ease-out 1.2s forwards",
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            left: 0,
            margin: "auto",
            height: "100%",
            width: "100%",
          }}
        >
          {[24, 34, -24, -34].map((left, i) => (
            <div
              key={`v-${i}`}
              style={{
                position: "absolute",
                top: 0,
                left: left > 0 ? `${left}em` : "auto",
                right: left < 0 ? `${Math.abs(left)}em` : "auto",
                margin: "auto",
                width: "1px",
                height: "100%",
                background: "rgba(186, 215, 247, .18)",
                opacity: 0,
                transform: "scale(0)",
                animation: "ph-accentload 2s ease-out 1s forwards",
              }}
            />
          ))}
        </div>
      </div>

      {/* Mountains silhouette */}
      <div
        className="mountains"
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          zIndex: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "-10%",
            width: "55%",
            height: "55%",
            bottom: "-40%",
            borderRadius: "50% 50% 0 0",
            background:
              "linear-gradient(180deg, rgba(80,100,140,0.25), rgba(5,6,15,0.9))",
            animation: "ph-mountainload1 2.2s ease-out 0.8s both",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-8%",
            left: "30%",
            width: "70%",
            height: "48%",
            bottom: "-20%",
            borderRadius: "50% 50% 0 0",
            background:
              "linear-gradient(180deg, rgba(90,110,150,0.2), rgba(5,6,15,0.95))",
            animation: "ph-mountainload2 2.4s ease-out 1s both",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "15%",
            width: "40%",
            height: "35%",
            bottom: "-15%",
            borderRadius: "50% 50% 0 0",
            background:
              "linear-gradient(180deg, rgba(70,90,130,0.3), rgba(5,6,15,1))",
            animation: "ph-mountainload1 2s ease-out 1.1s both",
          }}
        />
      </div>

      {/* Hero title */}
      <div
        className="hero relative z-10 mx-auto flex h-[220px] max-w-4xl justify-center border-0 sm:mt-28 sm:h-[280px] lg:mt-32"
        style={{ marginTop: "7em" }}
      >
        <div
          className="heroT"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            margin: "auto",
            height: "20em",
            paddingTop: "1em",
            transform: "translateY(-1.6em)",
            opacity: 0,
            animation: "ph-load 2s ease-in-out 0.6s forwards",
          }}
        >
          {/* Main title */}
          <h2
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              margin: "auto",
              width: "min(96%, 18em)",
              fontSize: "clamp(1.75rem, 5.5vw, 4.5rem)",
              fontWeight: 600,
              lineHeight: 1.1,
              textAlign: "center",
              color: "#9dc3f7",
              background: `
                radial-gradient(2em 2em at 50% 50%,
                  transparent calc(var(--p, 0%) - 2em),
                  #fff calc(var(--p, 0%) - 1em),
                  #fff calc(var(--p, 0%) - 0.4em),
                  transparent var(--p, 0%)
                ),
                linear-gradient(0deg, #bad1f1 30%, #9dc3f7 100%)
              `,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 2px 16px rgba(174,207,242,.24)",
              transition: "--p 3s linear",
              animation: "ph-pulse 10s linear 1.2s infinite",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            {titleLines[0]}
            {titleLines[1] ? (
              <>
                <br />
                {titleLines[1]}
              </>
            ) : null}
          </h2>
          {/* Blur glow twin */}
          <h2
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              margin: "auto",
              width: "min(96%, 18em)",
              fontSize: "clamp(1.75rem, 5.5vw, 4.5rem)",
              fontWeight: 600,
              lineHeight: 1.1,
              textAlign: "center",
              background: `
                radial-gradient(2em 2em at 50% 50%,
                  transparent calc(var(--p, 0%) - 2em),
                  transparent calc(var(--p, 0%) - 1em),
                  #fff calc(var(--p, 0%) - 1em),
                  #fff calc(var(--p, 0%) - 0.4em),
                  transparent calc(var(--p, 0%) - 0.4em),
                  transparent var(--p, 0%)
                )
              `,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "blur(16px) opacity(0.4)",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            {titleLines[0]}
            {titleLines[1] ? (
              <>
                <br />
                {titleLines[1]}
              </>
            ) : null}
          </h2>
        </div>
      </div>

      {/* Subtitle */}
      <p
        className="heroP"
        style={{
          fontSize: "clamp(0.95rem, 2vw, 1.2em)",
          position: "absolute",
          left: "1rem",
          right: "1rem",
          top: "min(22em, 58%)",
          margin: "auto",
          height: "fit-content",
          maxWidth: "28em",
          width: "fit-content",
          textAlign: "center",
          opacity: 0,
          transform: "translateY(1em)",
          animation:
            "ph-load 2s ease-out 1.4s forwards, ph-up 1.4s ease-out 1.4s forwards",
          color: "#d8ecf8",
          background: "linear-gradient(0deg, #d8ecf8 0, #98c0ef 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          zIndex: 10,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </p>

      {/* CTAs */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "2.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.75rem",
          zIndex: 10,
          opacity: 0,
          transform: "translateY(1em)",
          animation:
            "ph-load 1.6s ease-out 1.8s forwards, ph-up 1.2s ease-out 1.8s forwards",
          padding: "0 1rem",
        }}
      >
        <NextLink
          href="/catalog/teplovizori"
          className="hero-cta-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98]"
          style={{
            background: "#c1121f",
            color: "#fff",
          }}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </NextLink>
        <a
          href="tel:+380501112233"
          className="hero-cta-secondary inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition"
          style={{
            borderColor: "rgba(186, 215, 247, 0.35)",
            color: "#d8ecf8",
          }}
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  );
}

export default ParticleHero;
