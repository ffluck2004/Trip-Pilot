import { useState } from "react";

interface OnboardingSlidesProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    step: "STEP 01",
    headline: "Map Your Universe",
    description: "Incorporate location intelligence. Pinpoint hidden local secrets, premium accommodations, and direct flights seamlessly.",
    emoji: "🗺️",
    gradient: "from-[#0F2027] via-[#203A43] to-[#2C5364]", // slide 1 unique dark gradient
  },
  {
    step: "STEP 02",
    headline: "Pristine Routing",
    description: "Unlock optimized geospatial TSP routes. Minimize backtracking, track distances, and cruise through custom schedules.",
    emoji: "📍",
    gradient: "from-[#141E30] to-[#243B55]", // slide 2 unique dark gradient
  },
  {
    step: "STEP 03",
    headline: "Budget Autonomy",
    description: "Organize expenditures down to the single rupee. Check off active reservations and monitor live calculations in real time.",
    emoji: "💰",
    gradient: "from-[#2C3E50] to-[#000000]", // slide 3 unique dark gradient
  }
];

export default function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-white overflow-hidden relative">
      {/* Top 56% - Dark Gradient + Floating Emoji */}
      <div className={`h-[56%] w-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center relative transition-all duration-500 p-6`}>
        {/* Floating grid design lines */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFFFFF 0.8px, transparent 0.8px)", backgroundSize: "20px 20px" }} />
        
        {/* Glowing floating emoji */}
        <div className="flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-pulse relative">
          <span className="text-6xl sm:text-7xl select-none">{slide.emoji}</span>
          <div className="absolute -inset-1 rounded-full bg-white/5 blur-sm" />
        </div>
      </div>

      {/* Bottom 44% - White Container */}
      <div className="h-[44%] w-full bg-white px-6 py-6 flex flex-col justify-between border-t border-[#1A1A1A]/5">
        <div className="space-y-2">
          {/* Step label in coral */}
          <span className="text-[10px] font-bold text-[#F27D26] uppercase tracking-[0.2em] font-mono block">
            {slide.step}
          </span>
          {/* Playfair headline */}
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] leading-tight">
            {slide.headline}
          </h2>
          {/* Description */}
          <p className="text-xs sm:text-sm text-[#1A1A1A]/70 leading-relaxed font-sans mt-2">
            {slide.description}
          </p>
        </div>

        {/* Footer controls: dot indicators, Continue button, Skip link */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? "w-6 bg-[#F27D26]" : "w-2.5 bg-[#1A1A1A]/15 hover:bg-[#1A1A1A]/35"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Continue button */}
            <button
              onClick={handleNext}
              className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white py-2.5 px-6 rounded-full font-sans font-bold text-xs uppercase tracking-widest transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg"
            >
              {currentSlide === SLIDES.length - 1 ? "Get Started" : "Continue"} →
            </button>
          </div>

          {/* Skip text link */}
          <div className="text-center">
            <button
              onClick={handleSkip}
              className="text-[10px] text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition uppercase tracking-widest font-bold underline decoration-dotted"
            >
              Skip Onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
