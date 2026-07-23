import { GradientDots } from "@/components/ui/gradient-dots";

export default function GradientDotsDemoPage() {
  return (
    <main className="relative flex size-full min-h-screen w-full items-center justify-center overflow-hidden">
      <GradientDots duration={20} />
      <h1 className="z-10 text-center text-4xl font-extrabold text-primary sm:text-6xl">
        Gradient Dots
      </h1>
    </main>
  );
}
