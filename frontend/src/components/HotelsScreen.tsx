import React, { useState, useEffect } from "react";
import { Search, Heart, Shield, Plus, Building, Star } from "lucide-react";
import { getPlaces } from '../api/placeApi';

interface HotelsScreenProps {
  onAddHotelToBudget: (hotel: { title: string; price: number; destination: string }) => void;
  onNavigateToBudget: () => void;
}

interface HotelItem {
  id: string;
  title: string;
  destination: string;
  type: string;
  category: string;
  price: number;
  rating: number;
  ratingBadge: string;
  description: string;
  tags: string[];
  address: string;
  amenities: string[];
}

export default function HotelsScreen({ onAddHotelToBudget, onNavigateToBudget }: HotelsScreenProps) {
  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    // Fetch HOTELS from our active backend!
    getPlaces({ category: 'HOTEL' })
      .then((data) => setHotels(data))
      .catch((err) => {
        console.warn("Using hotels fallback state:", err);
        setHotels([
          { id: "hotel-taj", title: "The Taj Mahal Palace", destination: "Mumbai", type: "HOTEL", category: "HOTEL", price: 24500, rating: 4.9, ratingBadge: "9.9 Exceptional", description: "Iconic luxury.", tags: ["5★", "Luxury", "Pool"], address: "Colaba, Mumbai", amenities: ["Infinity Pool", "Ocean Lounge"] },
          { id: "hotel-rambagh", title: "Rambagh Palace", destination: "Jaipur", type: "HOTEL", category: "HOTEL", price: 32000, rating: 4.9, ratingBadge: "9.9 Exceptional", description: "Heritage palace residence.", tags: ["5★", "Luxury", "Heritage"], address: "Jaipur", amenities: ["Heritage Spa", "Peacock Gardens"] },
          { id: "hotel-wgoa", title: "W Goa Beach Resort", destination: "Goa", type: "HOTEL", category: "HOTEL", price: 18500, rating: 4.7, ratingBadge: "9.5 Exceptional", description: "Vagator beach resort.", tags: ["5★", "Beachfront", "Pool"], address: "Vagator, Goa", amenities: ["Private Beach Access", "DJ Lounge"] }
        ]);
      });
  }, []);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addHotel = (hotel: HotelItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddHotelToBudget({
      title: hotel.title,
      price: hotel.price,
      destination: hotel.destination
    });
    onNavigateToBudget();
  };

  // Filters: All, 5★, Airbnb, Budget, Pool
  const filteredHotels = hotels.filter((hotel) => {
    const matchesSearch = hotel.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          hotel.destination.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "All") return matchesSearch;
    
    // Check specific filter conditions
    if (activeFilter === "5★") {
      return matchesSearch && hotel.tags.includes("5★");
    }
    if (activeFilter === "Airbnb") {
      return matchesSearch && hotel.tags.includes("Airbnb");
    }
    if (activeFilter === "Budget") {
      return matchesSearch && (hotel.tags.includes("Budget") || hotel.price < 5000);
    }
    if (activeFilter === "Pool") {
      return matchesSearch && (hotel.tags.includes("Pool") || hotel.amenities.some(a => a.toLowerCase().includes("pool")));
    }
    return matchesSearch;
  });

  const filterChips = ["All", "5★", "Airbnb", "Budget", "Pool"];

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-4 py-3.5 border-b border-[#1A1A1A]/10 space-y-3 shrink-0 text-left">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-slate-900">Hotels 🏨</h2>
          <p className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">
            Geospatial Accommodations
          </p>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center bg-[#1A1A1A]/5 rounded-xl border border-transparent focus-within:border-[#F27D26] transition-all">
          <span className="absolute left-3.5 text-[#1A1A1A]/40"><Search className="w-4 h-4" /></span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hotel name or city..."
            className="w-full bg-transparent border-none outline-none py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-[#1A1A1A]/40"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterChips.map((c) => (
            <button
              key={c}
              onClick={() => setActiveFilter(c)}
              className={`text-[10px] uppercase tracking-wider font-bold px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                activeFilter === c
                  ? "bg-[#1A1A1A] text-white border-transparent"
                  : "bg-white text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/35"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Hotel Cards List */}
      <div className="flex-1 p-4 space-y-6">
        {filteredHotels.map((hotel) => (
          <div
            key={hotel.id}
            className="bg-white rounded-2xl border border-[#1A1A1A]/10 overflow-hidden shadow-sm hover:shadow-md transition duration-200 text-left relative group"
          >
            {/* Top Image block (180px height) */}
            <div className="h-[180px] bg-gradient-to-br from-[#1C2541] to-[#0B132B] relative p-4 flex flex-col justify-between">
              <div className="absolute inset-0 bg-[#F27D26]/5 mix-blend-color-burn" />
              
              {/* Star Rating Badge (Top-left) */}
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white rounded-full px-2.5 py-1 z-10 w-fit">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-mono font-bold">{hotel.rating}</span>
              </div>

              {/* Heart Button (Top-right) */}
              <button
                onClick={(e) => toggleWishlist(hotel.id, e)}
                className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/35 backdrop-blur-md rounded-full flex items-center justify-center text-white transition cursor-pointer"
              >
                <Heart
                  className={`w-4.5 h-4.5 ${
                    wishlist.includes(hotel.id) ? "text-rose-500 fill-rose-500" : "text-white"
                  }`}
                />
              </button>

              {/* Centered building icon */}
              <div className="text-center text-4xl select-none z-10 group-hover:scale-110 duration-200">
                {hotel.tags.includes("Airbnb") ? "🏡" : "🏨"}
              </div>

              {/* Badges block: Airbnb badge if applicable */}
              <div className="z-10 flex gap-1.5">
                {hotel.tags.includes("Airbnb") && (
                  <span className="text-[8px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    ★ Airbnb Verified
                  </span>
                )}
                {hotel.tags.includes("5★") && (
                  <span className="text-[8px] font-bold text-white bg-[#0D9488] px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                    ★ Premium 5 Star
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 bg-white">
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-serif italic font-extrabold text-base text-slate-800">{hotel.title}</h3>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                    {hotel.ratingBadge}
                  </span>
                </div>
                <p className="text-[10px] text-[#1A1A1A]/50 font-mono">📍 {hotel.address}</p>
              </div>

              <p className="text-xs text-[#1A1A1A]/70 leading-relaxed font-sans">
                {hotel.description}
              </p>

              {/* Amenity Chips */}
              <div className="flex flex-wrap gap-1">
                {hotel.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="text-[8px] font-bold font-mono text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md"
                  >
                    {amenity}
                  </span>
                ))}
              </div>

              {/* Footer pricing & Add to Budget */}
              <div className="flex items-center justify-between border-t border-[#1A1A1A]/5 pt-3.5 mt-2">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-slate-900 font-mono">₹{hotel.price.toLocaleString()}</span>
                  <span className="text-[8px] font-mono text-slate-400 block">PER NIGHT VECT</span>
                </div>

                <button
                  onClick={(e) => addHotel(hotel, e)}
                  className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white py-2 px-4 rounded-xl text-[10px] font-sans font-black uppercase tracking-widest transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> + Budget
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredHotels.length === 0 && (
          <div className="text-center py-12 text-xs text-[#1A1A1A]/40 font-mono italic">
            No active accommodations found.
          </div>
        )}
      </div>

    </div>
  );
}
