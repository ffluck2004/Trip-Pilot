import { useState, useEffect } from "react";
import { Search, Compass, MapPin, Plus, Filter, Navigation, Star } from "lucide-react";

interface InteractiveMapProps {
  onSelectPlace: (placeId: string) => void;
  onOpenTripSelector: (placeId: string) => void;
}

interface NearbyPlace {
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
}

export default function InteractiveMap({ onSelectPlace, onOpenTripSelector }: InteractiveMapProps) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePlace, setActivePlace] = useState<NearbyPlace | null>(null);
  const [radarPulse, setRadarPulse] = useState(true);

  // Default coordinate location (Mumbai coordinates as reference vector)
  const defaultLat = 18.922;
  const defaultLng = 72.8347;

  useEffect(() => {
    // Call GET /api/places/nearby?lat=&lng=&radius=5000
    const catParam = selectedCategory !== "All" ? `&category=${selectedCategory}` : "";
    fetch(`/api/places/nearby?lat=${defaultLat}&lng=${defaultLng}&radius=5000${catParam}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setPlaces(data);
        if (data.length > 0) {
          setActivePlace(data[0]);
        }
      })
      .catch((err) => {
        console.warn("Using nearby places map fallback:", err);
        setPlaces([
          { id: "dest-taj", title: "The Taj Mahal Palace", destination: "Mumbai", type: "HOTEL", category: "HOTEL", price: 24500, rating: 4.9, description: "Luxurious accommodation.", tags: ["Hotel", "Pool"], address: "Colaba, Mumbai", lat: 18.9218, lng: 72.8333 },
          { id: "act-gate", title: "Gateway of India", destination: "Mumbai", type: "ATTRACTION", category: "attraction", price: 0, rating: 4.8, description: "Historical monument.", tags: ["Heritage"], address: "Apollo Bandar, Colaba", lat: 18.9220, lng: 72.8347 },
          { id: "act-cafe", title: "Cafe Leopold", destination: "Mumbai", type: "CAFE", category: "cafe", price: 1200, rating: 4.6, description: "Iconic Colaba cafe.", tags: ["Food", "Bustling"], address: "Colaba Causeway", lat: 18.9231, lng: 72.8315 }
        ]);
      });
  }, [selectedCategory]);

  const categories = ["All", "HOTEL", "attraction", "cafe", "restaurant"];

  const getMarkerStyle = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "hotel":
        return { bg: "bg-[#F27D26]", border: "border-[#F27D26]/30", emoji: "🏨" };
      case "restaurant":
        return { bg: "bg-teal-500", border: "border-teal-500/30", emoji: "🍜" };
      case "attraction":
        return { bg: "bg-purple-500", border: "border-purple-500/30", emoji: "🎭" };
      case "shopping":
        return { bg: "bg-amber-500", border: "border-amber-500/30", emoji: "🛍️" };
      case "cafe":
        return { bg: "bg-pink-500", border: "border-pink-500/30", emoji: "☕" };
      default:
        return { bg: "bg-slate-500", border: "border-slate-500/30", emoji: "📍" };
    }
  };

  const filteredPlaces = places.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col justify-between overflow-hidden relative bg-[#111827]">
      {/* Floating Header Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 space-y-2.5">
        
        {/* Frosted search card */}
        <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex items-center shadow-lg">
          <Search className="w-4 h-4 text-slate-400 mx-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nearby coordinates..."
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 py-1.5"
          />
          <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded-md text-teal-400 uppercase tracking-widest shrink-0 mr-1.5">
            GPS LOCK
          </span>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-[9px] uppercase tracking-wider font-bold px-3.5 py-1.5 rounded-full border backdrop-blur-md transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-teal-500 text-white border-transparent"
                  : "bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-900/80"
              }`}
            >
              {cat === "All" ? "All Sectors" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Radar Stage */}
      <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden">
        
        {/* Mock Geospatial Topo map vectors inside a nice canvas frame */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0D9488 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }} />
        
        {/* Radial Radar lines */}
        <div className="absolute w-[450px] h-[450px] border border-teal-500/10 rounded-full flex items-center justify-center">
          <div className="w-[300px] h-[300px] border border-teal-500/15 rounded-full flex items-center justify-center">
            <div className="w-[150px] h-[150px] border border-teal-500/20 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-teal-500/20 rounded-full flex items-center justify-center animate-ping" />
            </div>
          </div>
        </div>

        {/* Radar Sweeping Hand */}
        <div className="absolute w-[220px] h-0.5 bg-gradient-to-r from-transparent to-teal-500/50 origin-left left-1/2 top-1/2 -translate-y-1/2 rotate-12 animate-spin-slow pointer-events-none" />

        {/* User Geolocation Marker Center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(20,184,166,0.5)] border-2 border-white animate-bounce">
            <Navigation className="w-4.5 h-4.5 text-slate-900 fill-slate-900" />
          </div>
          <span className="text-[8px] font-mono uppercase bg-slate-900/80 text-teal-400 px-1.5 rounded-full border border-white/10 mt-1">My Position</span>
        </div>

        {/* Interactive Hotspot Marker Pins on Radar */}
        {filteredPlaces.map((place, pIdx) => {
          const style = getMarkerStyle(place.category);
          
          // Formulate mock offset positions around the radar circle center
          const angle = (pIdx * 360) / filteredPlaces.length + 35;
          const radius = pIdx === 0 ? 55 : pIdx === 1 ? 100 : 80;
          const rad = (angle * Math.PI) / 180;
          const xOffset = Math.cos(rad) * radius;
          const yOffset = Math.sin(rad) * radius;

          const isActive = activePlace?.id === place.id;

          return (
            <button
              key={place.id}
              onClick={() => setActivePlace(place)}
              className="absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{
                left: `calc(50% + ${xOffset}px)`,
                top: `calc(50% + ${yOffset}px)`,
                zIndex: isActive ? 40 : 25
              }}
            >
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-lg ${
                isActive 
                  ? "bg-[#F27D26] text-white border-white scale-110 shadow-[#F27D26]/40" 
                  : `${style.bg} text-white border-transparent hover:scale-105`
              }`}>
                <span className="text-sm select-none">{style.emoji}</span>
                <span className="text-[10px] font-sans font-bold whitespace-nowrap">
                  {place.title.split(" ")[0]}
                </span>
              </div>
              <div className={`absolute -inset-1 rounded-full ${style.border} border-2 opacity-50 blur-sm scale-110 pointer-events-none group-hover:block hidden`} />
            </button>
          );
        })}
      </div>

      {/* Floating ➕ FAB Bottom Right */}
      {activePlace && (
        <button
          onClick={() => onOpenTripSelector(activePlace.id)}
          className="absolute right-4 bottom-[170px] w-12 h-12 bg-[#F27D26] hover:bg-[#E06A1B] text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transform hover:scale-110 transition z-20"
          title="Inject to Trip"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Horizontally Scrollable Bottom sheet places cards (185px wide) */}
      <div className="bg-slate-950/90 border-t border-white/10 p-4 shrink-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
            NEARBY COORDINATES ({filteredPlaces.length})
          </h4>
          <span className="text-[8px] font-mono bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/20 px-2 rounded">
            GeoRadius: 5.0 km
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
          {filteredPlaces.map((place) => {
            const isActive = activePlace?.id === place.id;
            return (
              <div
                key={place.id}
                onClick={() => {
                  setActivePlace(place);
                  onSelectPlace(place.id);
                }}
                className={`w-[185px] bg-slate-900 border rounded-xl p-3 shrink-0 snap-start cursor-pointer hover:bg-slate-850 transition duration-150 text-left space-y-1.5 ${
                  isActive ? "border-teal-400 shadow-lg" : "border-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-serif italic font-bold text-white text-xs truncate max-w-[70%]">
                    {place.title}
                  </h5>
                  <span className="text-[9px] font-mono text-amber-400 font-bold">★ {place.rating}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {place.description}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono text-slate-500">
                  <span>₹{place.price.toLocaleString()}</span>
                  <span className="text-teal-400">SELECT ✈️</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
