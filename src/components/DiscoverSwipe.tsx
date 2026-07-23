import { useState, useEffect } from "react";
import { Star, X, Heart, RefreshCw, Compass } from "lucide-react";

interface DiscoverSwipeProps {
  onSelectPlace: (placeId: string) => void;
}

interface DestinationCard {
  id: string;
  title: string;
  destination: string;
  type: string;
  category: string;
  flightTime: string;
  price: number;
  rating: number;
  description: string;
  tags: string[];
}

export default function DiscoverSwipe({ onSelectPlace }: DiscoverSwipeProps) {
  const [destinations, setDestinations] = useState<DestinationCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  const [swipeState, setSwipeState] = useState<"none" | "left" | "right" | "heart">("none");

  useEffect(() => {
    // Fetch DESTINATIONS from the mock-free database
    fetch("/api/places?type=DESTINATION")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setDestinations(data))
      .catch((err) => {
        console.warn("Using Discover fallbacks: ", err);
        setDestinations([
          { id: "dest-paris", title: "Paris", destination: "Paris", type: "DESTINATION", category: "attraction", flightTime: "9h", price: 58000, rating: 4.9, description: "Capital of romance and legendary cafes.", tags: ["Romantic", "Art", "Culture", "Food"] },
          { id: "dest-jaipur", title: "Jaipur", destination: "Jaipur", type: "DESTINATION", category: "attraction", flightTime: "1.5h", price: 4200, rating: 4.8, description: "The gorgeous Pink City of Amber Palace.", tags: ["Heritage", "Palace", "Culture", "Shopping"] },
          { id: "dest-goa", title: "Goa", destination: "Goa", type: "DESTINATION", category: "attraction", flightTime: "1h", price: 3500, rating: 4.7, description: "Pristine beaches and Portuguese heritage.", tags: ["Beach", "Nature", "Nightlife", "Relaxing"] },
          { id: "dest-london", title: "London", destination: "London", type: "DESTINATION", category: "attraction", flightTime: "8h", price: 52000, rating: 4.9, description: "Classic British charm paired with contemporary culture.", tags: ["Heritage", "City", "Parks"] }
        ]);
      });
  }, []);

  const handleSwipe = (direction: "left" | "right" | "heart") => {
    setSwipeState(direction);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % destinations.length);
      setSwipeState("none");
    }, 450);
  };

  const handleReset = () => {
    setCurrentIndex(0);
  };

  // Filter destinations based on tags
  const filtered = destinations.filter((item) => {
    if (activeFilter === "All") return true;
    return item.tags.some((tag) => tag.toLowerCase().includes(activeFilter.toLowerCase()));
  });

  const cardsLeft = filtered.length - currentIndex;
  const currentCard = filtered[currentIndex];
  const nextCard1 = filtered[(currentIndex + 1) % filtered.length];
  const nextCard2 = filtered[(currentIndex + 2) % filtered.length];

  const filters = ["All", "Beach", "Heritage", "City", "Food"];

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col justify-between overflow-y-auto pb-16">
      
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#1A1A1A]/10 shrink-0 text-left">
        <h2 className="text-xl font-serif italic font-bold text-slate-900">
          Discover ✨
        </h2>
        <p className="text-[10px] font-mono text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">
          Swipe to map vector vectors
        </p>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none bg-[#FBFBF9]">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setActiveFilter(f);
              setCurrentIndex(0);
            }}
            className={`text-[10px] uppercase tracking-wider font-bold px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
              activeFilter === f
                ? "bg-[#1A1A1A] text-white border-transparent"
                : "bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Main Swipe Stage */}
      <div className="flex-1 flex items-center justify-center p-6 relative select-none">
        {filtered.length > 0 && cardsLeft > 0 ? (
          <div className="relative w-full max-w-[290px] h-[380px] flex items-center justify-center">
            
            {/* Card 3 (Bottom - 88% scale, offset 28px↓) */}
            {filtered.length >= 3 && nextCard2 && (
              <div
                className="absolute w-full h-full bg-white rounded-3xl border border-[#1A1A1A]/5 shadow-[0_8px_20px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300"
                style={{
                  transform: "translateY(28px) scale(0.88)",
                  zIndex: 10,
                  opacity: 0.4
                }}
              >
                <div className="h-[55%] bg-slate-200" />
                <div className="p-4 h-[45%] bg-white" />
              </div>
            )}

            {/* Card 2 (Middle - 94% scale, offset 14px↓) */}
            {filtered.length >= 2 && nextCard1 && (
              <div
                className="absolute w-full h-full bg-white rounded-3xl border border-[#1A1A1A]/5 shadow-[0_10px_24px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300"
                style={{
                  transform: "translateY(14px) scale(0.94)",
                  zIndex: 20,
                  opacity: 0.75
                }}
              >
                <div className="h-[55%] bg-gradient-to-br from-[#1C2541] to-[#0B132B] p-4 flex items-end">
                  <span className="text-white font-serif italic font-bold">{nextCard1.title}</span>
                </div>
                <div className="p-4 h-[45%] bg-white" />
              </div>
            )}

            {/* Card 1 (Top Card - 100% scale, fully active & swipe animated) */}
            {currentCard && (
              <div
                onClick={() => onSelectPlace(currentCard.id)}
                className={`absolute w-full h-full bg-white rounded-3xl border border-[#1A1A1A]/10 shadow-xl overflow-hidden cursor-pointer transition-all duration-300 select-none text-left ${
                  swipeState === "left"
                    ? "translate-x-[-120%] rotate-[-15deg] opacity-0"
                    : swipeState === "right"
                    ? "translate-x-[120%] rotate-[15deg] opacity-0"
                    : swipeState === "heart"
                    ? "translate-y-[-120%] scale-90 opacity-0"
                    : "translate-x-0 rotate-0 scale-100"
                }`}
                style={{ zIndex: 30 }}
              >
                {/* Visual feedback overlays during swipes */}
                {swipeState === "left" && (
                  <div className="absolute inset-0 bg-red-500/25 z-40 flex items-center justify-center font-bold text-red-600 text-3xl font-mono border-4 border-red-500 rounded-3xl">
                    SKIP
                  </div>
                )}
                {swipeState === "right" && (
                  <div className="absolute inset-0 bg-amber-500/25 z-40 flex items-center justify-center font-bold text-amber-500 text-3xl font-mono border-4 border-amber-500 rounded-3xl">
                    SAVE
                  </div>
                )}
                {swipeState === "heart" && (
                  <div className="absolute inset-0 bg-teal-500/25 z-40 flex items-center justify-center font-bold text-teal-600 text-3xl font-mono border-4 border-teal-500 rounded-3xl">
                    LOVE
                  </div>
                )}

                {/* Top Image area (55% height) */}
                <div className="h-[52%] bg-gradient-to-br from-[#1C2541] to-[#0B132B] relative p-4 flex flex-col justify-between">
                  <div className="absolute inset-0 bg-[#F27D26]/5 mix-blend-color-burn" />
                  
                  {/* Indicators */}
                  <div className="flex justify-between items-center z-10 w-full">
                    <span className="text-[10px] font-bold text-white bg-black/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ★ {currentCard.rating}
                    </span>
                    <span className="text-[10px] font-bold text-white bg-black/40 px-2.5 py-0.5 rounded-full font-mono uppercase">
                      🛫 {currentCard.flightTime}
                    </span>
                  </div>

                  {/* Centered emoji */}
                  <div className="text-center text-5xl select-none z-10">
                    {currentCard.title === "Paris" ? "🗼" : currentCard.title === "Jaipur" ? "🏯" : currentCard.title === "Goa" ? "🏝️" : currentCard.title === "London" ? "🏰" : "🏖️"}
                  </div>

                  {/* Title & Coordinates */}
                  <div className="z-10 text-left">
                    <h3 className="text-xl font-serif italic font-extrabold text-white leading-tight">
                      {currentCard.title}
                    </h3>
                    <span className="text-[9px] font-mono text-teal-300 uppercase tracking-widest block">
                      Sector Coordinates Locked
                    </span>
                  </div>
                </div>

                {/* Bottom Body (48% height) */}
                <div className="p-4 h-[48%] flex flex-col justify-between bg-white text-left">
                  <div className="space-y-1.5">
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1">
                      {currentCard.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-[8px] font-bold font-sans uppercase tracking-wide bg-[#1A1A1A]/5 text-[#1A1A1A]/60 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#1A1A1A]/70 line-clamp-3 leading-relaxed">
                      {currentCard.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#1A1A1A]/5 pt-2">
                    <div className="text-left">
                      <span className="text-[8px] font-mono uppercase text-[#1A1A1A]/40 block">EST. JOURNEY BUDGET</span>
                      <span className="text-sm font-black text-slate-800 font-mono">₹{currentCard.price.toLocaleString()}</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#F27D26] uppercase font-bold bg-[#F27D26]/5 px-2 py-1 border border-[#F27D26]/10">
                      Tap Details ‹
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-[#1A1A1A]/5 rounded-full flex items-center justify-center text-[#1A1A1A]/30">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <p className="text-xs font-mono text-[#1A1A1A]/40 uppercase tracking-widest">
                No sectors left in directory
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-[#F27D26] font-bold underline mt-2 uppercase tracking-wider"
              >
                Reset Directory Loop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Swipe Actions Panel */}
      {filtered.length > 0 && cardsLeft > 0 && (
        <div className="px-6 py-4 border-t border-[#1A1A1A]/10 flex justify-center items-center gap-6 shrink-0 bg-white">
          {/* Skip button - left */}
          <button
            onClick={() => handleSwipe("left")}
            className="w-11 h-11 bg-rose-50 border border-rose-200 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-100 transition shadow-sm active:scale-90 cursor-pointer"
            title="Skip sector"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Heart button - center */}
          <button
            onClick={() => handleSwipe("heart")}
            className="w-14 h-14 bg-teal-50 border border-teal-200 text-teal-600 rounded-full flex items-center justify-center hover:bg-teal-100 transition shadow-md active:scale-90 cursor-pointer"
            title="Save to wishlist"
          >
            <Heart className="w-6 h-6 fill-teal-600" />
          </button>

          {/* Save button - right */}
          <button
            onClick={() => handleSwipe("right")}
            className="w-11 h-11 bg-amber-50 border border-amber-200 text-[#F27D26] rounded-full flex items-center justify-center hover:bg-amber-100 transition shadow-sm active:scale-90 cursor-pointer"
            title="Add to plan"
          >
            <Star className="w-5 h-5 fill-[#F27D26]" />
          </button>
        </div>
      )}

    </div>
  );
}
