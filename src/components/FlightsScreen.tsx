import { useState } from "react";
import { Plane, ArrowLeftRight, Bell, Clock, Briefcase, Coffee, ShieldCheck, ArrowRight, RotateCcw } from "lucide-react";

interface FlightsScreenProps {
  onAddFlightToBudget: (flight: { airline: string; price: number; route: string }) => void;
  onNavigateToBudget: () => void;
}

const MOCK_FLIGHTS = [
  {
    id: "fl-1",
    airline: "Indigo Airways",
    logo: "✈️",
    from: "BOM",
    to: "PAR",
    departs: "06:15",
    arrives: "14:45",
    duration: "12h 00m (1 Stop)",
    price: 48500,
    cheapest: true,
    fastest: false,
    earliest: true,
    baggage: "15 kg",
    meal: "Pre-booked Meals included",
    refund: "Partially Refundable",
    badge: "Most Popular choice"
  },
  {
    id: "fl-2",
    airline: "Air India Elite",
    logo: "✈️",
    from: "BOM",
    to: "PAR",
    departs: "09:30",
    arrives: "18:00",
    duration: "11h 30m (Direct)",
    price: 54000,
    cheapest: false,
    fastest: true,
    earliest: false,
    baggage: "30 kg Check-in",
    meal: "Hot Meals & beverages free",
    refund: "Fully Refundable",
    badge: "Executive Comfort Choice"
  },
  {
    id: "fl-3",
    airline: "Vistara Premium",
    logo: "✈️",
    from: "BOM",
    to: "PAR",
    departs: "13:15",
    arrives: "23:55",
    duration: "13h 40m (1 Stop)",
    price: 51200,
    cheapest: false,
    fastest: false,
    earliest: false,
    baggage: "20 kg",
    meal: "Premium Multi-cuisine Meal",
    refund: "Cancellation Free within 24h",
    badge: "Premium Economy Choice"
  }
];

export default function FlightsScreen({ onAddFlightToBudget, onNavigateToBudget }: FlightsScreenProps) {
  const [fromCode, setFromCode] = useState("BOM");
  const [toCode, setToCode] = useState("PAR");
  const [selectedTab, setSelectedTab] = useState("One Way");
  const [activeSort, setActiveSort] = useState("Cheapest");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [alertActivated, setAlertActivated] = useState(false);

  const swapCodes = () => {
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
  };

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const selectFlight = (flight: typeof MOCK_FLIGHTS[0]) => {
    onAddFlightToBudget({
      airline: flight.airline,
      price: flight.price,
      route: `${fromCode} → ${toCode}`
    });
    onNavigateToBudget();
  };

  const getSortedFlights = () => {
    let sorted = [...MOCK_FLIGHTS];
    if (activeSort === "Cheapest") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (activeSort === "Fastest") {
      sorted.sort((a, b) => {
        const aNum = parseFloat(a.duration.replace(/[^\d.]/g, ""));
        const bNum = parseFloat(b.duration.replace(/[^\d.]/g, ""));
        return aNum - bNum;
      });
    } else if (activeSort === "Earliest") {
      sorted.sort((a, b) => a.departs.localeCompare(b.departs));
    }
    return sorted;
  };

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Navy Header with Frosted Search Card */}
      <div className="bg-gradient-to-b from-[#0B132B] to-[#1C2541] p-4 text-white space-y-4 shrink-0 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFFFFF 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} />
        
        <div className="text-left z-10 relative">
          <h2 className="text-lg font-serif italic font-bold">Flights ✈️</h2>
          <p className="text-[9px] font-mono text-teal-400 uppercase tracking-widest mt-0.5">
            Geospatial Air Connectors
          </p>
        </div>

        {/* Frosted search card */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3.5 z-10 relative text-left">
          {/* Segmented tabs */}
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 text-[9px] font-bold uppercase tracking-wider">
            {["One Way", "Round Trip", "Multi-City"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTab(t)}
                className={`flex-1 py-1.5 rounded-md transition ${
                  selectedTab === t ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* FROM / TO fields with Swap */}
          <div className="grid grid-cols-2 gap-2 relative">
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-[8px] font-mono text-slate-300 uppercase tracking-wide block">FROM</span>
              <input
                type="text"
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value.toUpperCase())}
                className="bg-transparent border-none outline-none font-sans font-bold text-base text-white w-full uppercase mt-0.5"
              />
            </div>

            {/* Absolute swap button */}
            <button
              onClick={swapCodes}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#F27D26] hover:bg-[#E06A1B] text-white rounded-lg flex items-center justify-center transition border-2 border-[#1C2541] cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-right">
              <span className="text-[8px] font-mono text-slate-300 uppercase tracking-wide block">TO</span>
              <input
                type="text"
                value={toCode}
                onChange={(e) => setToCode(e.target.value.toUpperCase())}
                className="bg-transparent border-none outline-none font-sans font-bold text-base text-white w-full uppercase mt-0.5 text-right"
              />
            </div>
          </div>

          {/* Date row */}
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 text-left">
            <span className="text-[8px] font-mono text-slate-300 uppercase tracking-wide block">DEPARTURE DATE</span>
            <input
              type="date"
              defaultValue="2026-07-28"
              className="bg-transparent border-none outline-none font-sans font-bold text-xs text-white w-full mt-1"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="w-full bg-[#F27D26] hover:bg-[#E06A1B] text-white py-3 rounded-xl font-sans font-black text-xs uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            Search Flights <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="px-4 pt-4 shrink-0 text-left">
        <div className={`p-3.5 rounded-xl flex items-center justify-between border transition duration-300 ${
          alertActivated 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-teal-50 border-teal-200 text-teal-800"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-600">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-[11px] font-sans font-bold tracking-tight">Price-Drop Active Alert</h4>
              <p className="text-[9px] text-[#1A1A1A]/60 leading-normal">Fares on BOM ⇄ PAR sector are currently down 8%.</p>
            </div>
          </div>
          <button
            onClick={() => setAlertActivated(!alertActivated)}
            className={`text-[9px] font-sans font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition ${
              alertActivated 
                ? "bg-emerald-600 text-white border-transparent" 
                : "bg-white text-teal-700 border-teal-300 hover:bg-teal-100"
            }`}
          >
            {alertActivated ? "🔔 Subscribed" : "Alert me"}
          </button>
        </div>
      </div>

      {/* Sort Chips */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between text-left">
        <span className="text-[9px] font-mono font-bold uppercase text-[#1A1A1A]/40 tracking-wider">
          SORT VECTORS
        </span>
        <div className="flex gap-1">
          {["Cheapest", "Fastest", "Earliest"].map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveSort(chip)}
              className={`text-[9px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                activeSort === chip
                  ? "bg-[#1A1A1A] text-white border-transparent"
                  : "bg-white text-[#1A1A1A]/50 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/35"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 px-4 space-y-4">
        {getSortedFlights().map((flight) => (
          <div
            key={flight.id}
            onClick={() => selectFlight(flight)}
            className="bg-white rounded-2xl border border-[#1A1A1A]/10 overflow-hidden shadow-sm hover:shadow-md hover:border-[#F27D26]/50 cursor-pointer transition duration-150 text-left"
          >
            {/* Top Section - Times & Route */}
            <div className="p-4 space-y-3.5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{flight.logo}</span>
                  <div>
                    <h4 className="text-xs font-sans font-bold text-slate-800">{flight.airline}</h4>
                    <span className="text-[8px] font-mono text-emerald-600 uppercase tracking-wider bg-emerald-500/10 px-1 rounded">
                      {flight.badge}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#F27D26] block font-mono">₹{flight.price.toLocaleString()}</span>
                  <span className="text-[8px] font-mono text-slate-400 block">TOTAL EXPENSE</span>
                </div>
              </div>

              {/* Times route layout */}
              <div className="grid grid-cols-3 gap-2 items-center text-center">
                <div className="text-left">
                  <span className="text-base font-black text-slate-800 font-mono block">{flight.departs}</span>
                  <span className="text-[9px] text-[#1A1A1A]/40 uppercase tracking-widest font-bold">{flight.from}</span>
                </div>
                <div className="space-y-1 relative">
                  <span className="text-[9px] text-slate-400 font-mono block">{flight.duration}</span>
                  <div className="h-0.5 bg-slate-200 w-full relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#F27D26] rounded-full" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-800 font-mono block">{flight.arrives}</span>
                  <span className="text-[9px] text-[#1A1A1A]/40 uppercase tracking-widest font-bold">{flight.to}</span>
                </div>
              </div>
            </div>

            {/* Bottom Section - Amenity grid & flight details */}
            <div className="px-4 py-3.5 bg-[#FBFBF9] border-t border-[#1A1A1A]/5 grid grid-cols-3 gap-1.5 text-[9px] text-[#1A1A1A]/60">
              <div className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-[#F27D26]" />
                <span>{flight.baggage}</span>
              </div>
              <div className="flex items-center gap-1">
                <Coffee className="w-3 h-3 text-teal-600" />
                <span className="truncate">{flight.meal}</span>
              </div>
              <div className="flex items-center gap-1 col-span-1">
                <ShieldCheck className="w-3 h-3 text-[#F27D26]" />
                <span>{flight.refund}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
