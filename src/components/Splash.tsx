import { useEffect } from "react";
import { Compass, Sparkles, MapPin, Plane, DollarSign } from "lucide-react";

interface SplashProps {
  onGetStarted: () => void;
  onAlreadyHaveAccount: () => void;
  onSkipToHome: () => void;
}

export default function Splash({ onGetStarted, onAlreadyHaveAccount, onSkipToHome }: SplashProps) {
  useEffect(() => {
    // Check JWT on mount - if valid, skip straight to Home
    const jwt = localStorage.getItem("trippilot_jwt");
    if (jwt) {
      onSkipToHome();
    }
  }, [onSkipToHome]);

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col justify-between bg-gradient-to-b from-[#0B132B] to-[#1C2541] p-6 text-white overflow-y-auto relative">
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#F27D26]/20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-36 h-36 bg-[#0D9488]/15 rounded-full blur-[50px] pointer-events-none" />

      {/* Header section with brand */}
      <div className="flex flex-col items-center justify-center pt-16 pb-6 text-center z-10">
        <div className="w-16 h-16 bg-gradient-to-tr from-[#F27D26] to-[#0D9488] rounded-full flex items-center justify-center p-0.5 shadow-[0_0_24px_rgba(242,125,38,0.45)] mb-4 animate-bounce">
          <div className="w-full h-full bg-[#0B132B] rounded-full flex items-center justify-center">
            <Compass className="w-8 h-8 text-white rotate-[24deg] animate-pulse" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif italic font-bold tracking-tight text-white select-none">
          TripPilot
        </h1>
        <p className="text-[10px] text-teal-400 uppercase tracking-[0.25em] font-mono font-bold mt-2">
          GPS Location Intelligence
        </p>
      </div>

      {/* Features summary row */}
      <div className="w-full max-w-sm mx-auto my-auto py-8 z-10">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[#F27D26] hover:bg-white/10 duration-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono text-slate-350 uppercase tracking-wider mt-2">Pilot AI</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-teal-400 hover:bg-white/10 duration-200">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono text-slate-350 uppercase tracking-wider mt-2">GPS Map</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[#F27D26] hover:bg-white/10 duration-200">
              <Plane className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono text-slate-350 uppercase tracking-wider mt-2">Flights</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-teal-400 hover:bg-white/10 duration-200">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-mono text-slate-350 uppercase tracking-wider mt-2">Budget</span>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-xs mx-auto flex flex-col gap-4 pb-12 text-center z-10">
        <button
          onClick={onGetStarted}
          className="w-full bg-[#F27D26] hover:bg-[#E06A1B] text-white py-3.5 px-6 rounded-full font-sans font-bold text-xs uppercase tracking-widest transition duration-200 shadow-[0_4px_14px_rgba(242,125,38,0.35)] cursor-pointer"
        >
          Get Started ✨
        </button>
        <button
          onClick={onAlreadyHaveAccount}
          className="text-[11px] text-slate-400 hover:text-white transition font-sans underline decoration-dotted underline-offset-4"
        >
          Already have an account?
        </button>
      </div>
    </div>
  );
}
