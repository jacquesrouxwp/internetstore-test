import { ParticleHero } from "@/components/ui/particle-hero";

/** Isolated demo of ParticleHero (full light-switch scene) */
export default function ParticleDemoPage() {
  return (
    <main className="min-h-screen bg-[#05060f]">
      <ParticleHero
        title="Pro-Optics"
        subtitle={
          "Професійна оптика та тепловізори — каталог брендів, доставка по Україні"
        }
        ctaLabel="Каталог тепловізорів"
        secondaryLabel="Консультація"
      />
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-slate-400">
        <p>
          Клікніть на приціл зверху по центру — gold / light mode.
          Demo: <code className="text-sky-300">/demo/particle</code>
        </p>
      </div>
    </main>
  );
}
