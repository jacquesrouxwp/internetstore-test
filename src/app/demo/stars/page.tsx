import { StarsBackground } from "@/components/ui/stars";

export default function StarsBackgroundDemoPage() {
  return (
    <StarsBackground className="flex h-screen w-full items-center justify-center">
      <div className="flex h-screen w-full items-center justify-center">
        <h1 className="text-center font-sans text-5xl font-bold text-[#888] sm:text-7xl">
          Stars
        </h1>
      </div>
    </StarsBackground>
  );
}
