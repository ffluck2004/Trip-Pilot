import { useState, useEffect } from "react";
import { Compass, Sparkles, Plane, Building, Map, Coins, Search, ArrowRight, Plus } from "lucide-react";
import { Trip } from "../types";
import { getPlaces } from '../api/placeApi';

interface HomeDashboardProps {
  user: { id: string; name: string; email: string };
  trips: Trip[];
  onNavigate: (screen: string) => void;
  onSelectTrip: (trip: Trip) => void;
  onSelectPlace: (placeId: string) => void;
}

interface PlaceItem {
  id: string;
  title: string;
  destination: string;
  type: string;
  category: string;
  flightTime?: string;
  price: number;
  rating: number;
  description: string;
  tags: string[];
}

export default function HomeDashboard({ user, trips, onNavigate, onSelectTrip, onSelectPlace }: HomeDashboardProps) {
  const [trendingPlaces, setTrendingPlaces] = useState<PlaceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Beach", "Mountain", "City", "Heritage"];

  useEffect(() => {
    // Fetch trending places from backend /api/places?featured=true
    getPlaces({ featured: 'true' })
      .then((data) => setTrendingPlaces(data))
      .catch((err) => {
        console.warn("Using offline trending fallbacks:", err);
        setTrendingPlaces([
          { id: "dest-paris", title: "Paris", destination: "Paris", type: "DESTINATION", category: "attraction", flightTime: "9h", price: 58000, rating: 4.9, description: "Romantic capital.", tags: ["Romantic", "Art"] },
          { id: "dest-jaipur", title: "Jaipur", destination: "Jaipur", type: "DESTINATION", category: "attraction", flightTime: "1.5h", price: 4200, rating: 4.8, description: "Pink City.", tags: ["Heritage", "Culture"] },
          { id: "dest-goa", title: "Goa", destination: "Goa", type: "DESTINATION", category: "attraction", flightTime: "1h", price: 3500, rating: 4.7, description: "Beach escape.", tags: ["Beach", "Nature"] }
        ]);
      });
  }, []);

  // Filter trending cards based on chips & search
  const filteredTrending = trendingPlaces.filter((place) => {
    const matchesQuery = place.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         place.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === "All") return matchesQuery;
    
    // Check tags or category matching
    const matchesCategory = place.tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase()) ||
                            place.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-4 py-3.5 border-b border-[#1A1A1A]/10 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <span className="text-[9px] font-bold text-[#F27D26] uppercase font-mono tracking-widest block">PILOT COMMAND CENTRE</span>
            <h2 className="text-lg font-serif italic font-bold text-slate-900 leading-tight">
              Hello, {user.name.split(" ")[0]} 🗺️
            </h2>
          </div>
          {/* Mock premium profile circular visual */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F27D26] to-[#0D9488] flex items-center justify-center p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-800">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center bg-[#1A1A1A]/5 rounded-xl border border-transparent focus-within:border-[#F27D26] transition-all">
          <span className="absolute left-3.5 text-[#1A1A1A]/40"><Search className="w-4 h-4" /></span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coordinates, flights, hotels..."
            className="w-full bg-transparent border-none outline-none py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-[#1A1A1A]/40"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Navy AI Banner */}
        <button
          onClick={() => onNavigate("chat")}
          className="w-full bg-[#0B132B] hover:bg-[#1C2541] rounded-2xl p-4 text-white text-left relative overflow-hidden transition-all duration-300 block border border-white/5 cursor-pointer shadow-lg shadow-blue-900/10"
        >
          {/* Subtle glow background */}
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#F27D26]/15 rounded-full blur-[40px]" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl opacity-40 animate-pulse">🤖</div>

          <div className="relative z-10 space-y-1 max-w-[80%]">
            <span className="text-[9px] bg-teal-400 text-[#0B132B] font-black tracking-widest uppercase px-2 py-0.5 rounded-full font-mono">
              GEMINI CO-PILOT
            </span>
            <h3 className="text-base font-serif italic font-extrabold text-white">
              Plan with AI Pilot ✨
            </h3>
            <p className="text-[10px] text-slate-350 leading-relaxed font-sans mt-1">
              Let our location intelligence engine generate optimized day-plans in under 10 seconds.
            </p>
          </div>
        </button>

        {/* 4 Quick Action Tiles */}
        <div className="grid grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigate("flights")}
            className="p-3 bg-white hover:bg-[#FBFBF9] border border-[#1A1A1A]/10 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-[#1A1A1A] cursor-pointer"
          >
            <div className="w-9 h-9 bg-[#F27D26]/10 text-[#F27D26] rounded-xl flex items-center justify-center">
              <Plane className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-sans font-bold tracking-tight">Flights</span>
          </button>
          
          <button
            onClick={() => onNavigate("hotels")}
            className="p-3 bg-white hover:bg-[#FBFBF9] border border-[#1A1A1A]/10 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-[#1A1A1A] cursor-pointer"
          >
            <div className="w-9 h-9 bg-teal-500/10 text-[#0D9488] rounded-xl flex items-center justify-center">
              <Building className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-sans font-bold tracking-tight">Hotels</span>
          </button>

          <button
            onClick={() => onNavigate("map")}
            className="p-3 bg-white hover:bg-[#FBFBF9] border border-[#1A1A1A]/10 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-[#1A1A1A] cursor-pointer"
          >
            <div className="w-9 h-9 bg-[#F27D26]/10 text-[#F27D26] rounded-xl flex items-center justify-center">
              <Map className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-sans font-bold tracking-tight">Map</span>
          </button>

          <button
            onClick={() => onNavigate("budget")}
            className="p-3 bg-white hover:bg-[#FBFBF9] border border-[#1A1A1A]/10 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-[#1A1A1A] cursor-pointer"
          >
            <div className="w-9 h-9 bg-teal-500/10 text-[#0D9488] rounded-xl flex items-center justify-center">
              <Coins className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-sans font-bold tracking-tight">Budget</span>
          </button>
        </div>

        {/* Category chips */}
        <div className="space-y-2.5">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 text-left">
            COORDINATE SECTORS
          </h4>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-4 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#1A1A1A] text-white font-bold"
                    : "bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal scroll for Trending Now */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60">
              🔥 TRENDING NOW
            </h4>
            <button
              onClick={() => onNavigate("discover")}
              className="text-[10px] text-[#F27D26] font-sans font-bold uppercase flex items-center gap-1 hover:underline"
            >
              Explore All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
            {filteredTrending.map((place) => (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place.id)}
                className="w-52 bg-white rounded-2xl border border-[#1A1A1A]/10 overflow-hidden shrink-0 snap-start cursor-pointer group hover:shadow-md transition duration-200 text-left"
              >
                <div className="h-32 bg-gradient-to-br from-[#1C2541] to-[#0B132B] relative flex items-center justify-center p-4">
                  {/* Glowing graphic overlay */}
                  <div className="absolute inset-0 bg-[#F27D26]/5 mix-blend-color-burn" />
                  <span className="text-4xl group-hover:scale-110 duration-200 select-none">
                    {place.title === "Paris" ? "🗼" : place.title === "Jaipur" ? "🏯" : "🏖️"}
                  </span>
                  
                  <span className="absolute top-2.5 right-2.5 text-[9px] bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full text-white font-mono uppercase">
                    🛫 {place.flightTime || "2h"}
                  </span>
                </div>
                
                <div className="p-3.5 space-y-1 bg-white">
                  <div className="flex items-center justify-between">
                    <h5 className="font-serif italic font-bold text-slate-800">{place.title}</h5>
                    <span className="text-[10px] font-bold text-teal-600">★ {place.rating}</span>
                  </div>
                  <p className="text-[10px] text-[#1A1A1A]/60 line-clamp-2 leading-relaxed">
                    {place.description}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-[#1A1A1A]/5">
                    <span className="text-[9px] font-mono text-[#1A1A1A]/50">STARTING COORD</span>
                    <span className="text-[10px] font-bold text-slate-900">₹{place.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTrending.length === 0 && (
              <div className="w-full text-center py-8 text-xs text-[#1A1A1A]/40 font-mono italic">
                No matching sectors active.
              </div>
            )}
          </div>
        </div>

        {/* My Trips List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60">
              ✈️ MY TRIPS
            </h4>
            <button
              onClick={() => onNavigate("planner")}
              className="text-[10px] text-teal-600 font-sans font-bold uppercase flex items-center gap-1 hover:underline"
            >
              View Grid <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => {
                  onSelectTrip(trip);
                  onNavigate("itinerary");
                }}
                className="w-56 bg-gradient-to-r from-teal-900 to-[#1C2541] rounded-2xl p-4 text-white shrink-0 snap-start cursor-pointer hover:shadow-lg transition duration-200 text-left relative"
              >
                <span className="absolute right-3.5 top-3.5 text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {trip.status}
                </span>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-serif italic font-extrabold text-sm text-white">
                      {trip.input.destination}
                    </h5>
                    <p className="text-[10px] text-slate-350 font-mono mt-0.5">
                      {trip.input.durationInDays} days • {trip.input.travelStyle}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-mono text-slate-350">
                      <span>VECTOR PROGRESS</span>
                      <span>{trip.status === "live" ? "65%" : "0%"}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-400"
                        style={{ width: trip.status === "live" ? "65%" : "5%" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Quick ➕ New Trip Card */}
            <div
              onClick={() => onNavigate("planner")}
              className="w-56 h-[126px] border-2 border-dashed border-[#1A1A1A]/15 hover:border-[#F27D26]/50 bg-white hover:bg-[#FBFBF9] rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition shrink-0 duration-200"
            >
              <div className="w-9 h-9 bg-[#1A1A1A]/5 rounded-full flex items-center justify-center text-[#1A1A1A]/60">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-sans font-bold text-[#1A1A1A]/60">Launch New Trip</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
