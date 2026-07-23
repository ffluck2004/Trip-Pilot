import { useState, useEffect } from "react";
import { ArrowLeft, Share2, Heart, Clock, MapPin, CheckCircle, Navigation, ExternalLink, ShieldCheck } from "lucide-react";

interface PlaceDetailScreenProps {
  placeId: string;
  onNavigateBack: () => void;
  onOpenTripSelector: (placeId: string) => void;
}

interface PlaceDetail {
  id: string;
  title: string;
  destination: string;
  type: string;
  category: string;
  price: number;
  rating: number;
  description: string;
  tags: string[];
  address: string;
  lat: number;
  lng: number;
  hours?: string;
  metro?: string;
  gallery?: string[];
}

export default function PlaceDetailScreen({ placeId, onNavigateBack, onOpenTripSelector }: PlaceDetailScreenProps) {
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch individual place from the backend
    fetch(`/api/places/${placeId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setPlace(data))
      .catch((err) => {
        console.warn("Using Detail fallbacks:", err);
        // Fallback matched on ID
        setPlace({
          id: placeId,
          title: placeId.includes("taj") ? "The Taj Mahal Palace" : "Gateway of India",
          destination: "Mumbai",
          type: "DESTINATION",
          category: "attraction",
          price: placeId.includes("taj") ? 24500 : 500,
          rating: 4.9,
          description: "Stately architectural structure designed with breathtaking premium finishes, localized historical vectors, and scenic waterfront ocean access.",
          tags: ["Heritage", "Signature", "Culture"],
          address: "Colaba Waterfront, South Mumbai",
          lat: 18.9220,
          lng: 72.8347,
          hours: "09:00 - 18:00 DAILY",
          metro: "Colaba Station (3 min walk)",
          gallery: ["🌊 Ocean Gateway View", "🏛️ Historical Vault", "✨ Twilight Skyline"]
        });
      });
  }, [placeId]);

  const handleShare = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!place) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center p-8 text-center bg-[#FBFBF9]">
        <div className="animate-pulse space-y-1 text-slate-400 font-mono text-xs">
          <div>🛰️ SCANNING COORDINATES...</div>
          <div>Formulating detailed spatial matrix...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col justify-between overflow-y-auto pb-16 relative">
      
      {/* Hero background (250px) with overlay */}
      <div className="h-[250px] bg-gradient-to-br from-[#1C2541] to-[#0B132B] relative p-4 flex flex-col justify-between text-white shrink-0">
        <div className="absolute inset-0 bg-[#F27D26]/5 mix-blend-color-burn" />
        
        {/* Navigation row */}
        <div className="flex justify-between items-center z-10 w-full relative">
          <button
            onClick={onNavigateBack}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer relative"
            >
              <Share2 className="w-4.5 h-4.5" />
              {copied && (
                <span className="absolute bottom-11 bg-black text-white text-[8px] font-mono py-1 px-1.5 rounded uppercase">Copied</span>
              )}
            </button>
            <button
              onClick={() => setLiked(!liked)}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer"
            >
              <Heart className={`w-4.5 h-4.5 ${liked ? "text-rose-500 fill-rose-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Big emoji placeholder floating */}
        <div className="text-center text-6xl select-none z-10 animate-bounce">
          {place.title.toLowerCase().includes("taj") ? "🏨" : "🏯"}
        </div>

        {/* Overlay Title */}
        <div className="z-10 text-left bg-gradient-to-t from-black/80 via-black/40 to-transparent -mx-4 -mb-4 p-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-teal-400">★ {place.rating} EXCEPTIONAL</span>
            <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 rounded font-mono font-bold">OPEN</span>
          </div>
          <h2 className="text-xl font-serif italic font-extrabold text-white mt-1 leading-tight">{place.title}</h2>
          <p className="text-[9px] text-slate-300 font-mono mt-0.5">📍 {place.address}</p>
        </div>
      </div>

      {/* Content body - slides up over hero */}
      <div className="flex-1 px-4 py-6 bg-white rounded-t-3xl -mt-4 relative z-20 shadow-md text-left space-y-6">
        
        {/* Action Button Grid */}
        <div className="grid grid-cols-4 gap-2">
          <button className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 duration-150 cursor-pointer">
            <Navigation className="w-5 h-5 text-[#F27D26]" />
            <span className="text-[9px] font-sans font-bold">Directions</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 duration-150 cursor-pointer">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            <span className="text-[9px] font-sans font-bold">Reserve</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 duration-150 cursor-pointer">
            <Share2 className="w-5 h-5 text-purple-600" />
            <span className="text-[9px] font-sans font-bold">Share</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 duration-150 cursor-pointer">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span className="text-[9px] font-sans font-bold">Verified</span>
          </button>
        </div>

        {/* About section */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/50">
            About Coordinate
          </h4>
          <p className="text-xs sm:text-sm text-[#1A1A1A]/70 leading-relaxed font-sans">
            {place.description}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 text-left space-y-0.5">
            <span className="text-[8px] font-mono uppercase text-[#1A1A1A]/40 block">HOURS VECTOR</span>
            <span className="text-[9px] font-bold text-slate-800 leading-tight block truncate">
              {place.hours || "09:00 - 18:00 DAILY"}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 text-left space-y-0.5">
            <span className="text-[8px] font-mono uppercase text-[#1A1A1A]/40 block">ENTRY FARE</span>
            <span className="text-[9px] font-bold text-teal-700 leading-tight block">
              ₹{place.price.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 text-left space-y-0.5">
            <span className="text-[8px] font-mono uppercase text-[#1A1A1A]/40 block">TRANSIT METRO</span>
            <span className="text-[9px] font-bold text-slate-800 leading-tight block truncate">
              {place.metro || "Nearby Station"}
            </span>
          </div>
        </div>

        {/* Gallery row */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/50">
            PHOTO RECONNAISSANCE
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {(place.gallery || ["🌊 Ocean Gateway View", "🏛️ Historical Vault", "✨ Twilight Skyline"]).map((photo, pIdx) => (
              <div
                key={pIdx}
                className="w-40 h-24 bg-[#1C2541]/5 border border-slate-200 rounded-2xl flex items-center justify-center text-xs font-sans font-bold text-slate-600 shrink-0"
              >
                {photo}
              </div>
            ))}
          </div>
        </div>

        {/* CTA - Add to Trip Itinerary */}
        <div className="pt-2">
          <button
            onClick={() => onOpenTripSelector(place.id)}
            className="w-full bg-[#F27D26] hover:bg-[#E06A1B] text-white py-4 rounded-2xl font-sans font-black text-xs uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F27D26]/20"
          >
            Add to Trip Itinerary ✈️
          </button>
        </div>
      </div>

    </div>
  );
}
