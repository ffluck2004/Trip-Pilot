import { Compass, Sparkles, Calendar, TrendingUp, Archive, Plus } from "lucide-react";
import { Trip } from "../types";

interface TripPlannerProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onNavigate: (screen: string) => void;
}

export default function TripPlanner({ trips, onSelectTrip, onNavigate }: TripPlannerProps) {
  const activeTrip = trips.find(t => t.status === "live" || t.status === "planning") || trips[0];

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "planning":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "upcoming":
        return "bg-amber-100 text-[#F27D26] border-amber-200";
      case "live":
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "completed":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-4 py-3.5 border-b border-[#1A1A1A]/10 space-y-3.5 shrink-0 text-left">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-slate-900">Trip Planner</h2>
          <p className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">
            Geospatial Journey Director
          </p>
        </div>

        {/* 🤖 Plan with AI button */}
        <button
          onClick={() => onNavigate("chat")}
          className="w-full bg-[#0B132B] hover:bg-[#1C2541] rounded-xl py-3 text-white font-sans text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#F27D26]" /> 🤖 Plan with AI Pilot
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Active/Principal Trip Card */}
        {activeTrip && (
          <div
            onClick={() => {
              onSelectTrip(activeTrip);
              onNavigate("itinerary");
            }}
            className="w-full bg-gradient-to-r from-[#1C2541] to-[#0B132B] rounded-2xl p-4.5 text-white text-left cursor-pointer hover:shadow-lg transition relative overflow-hidden group"
          >
            {/* Glowing pattern background overlay */}
            <div className="absolute inset-0 bg-[#F27D26]/5 mix-blend-color-burn" />
            <div className="absolute right-4 top-4 text-4xl opacity-15 select-none group-hover:scale-110 duration-200">✈️</div>

            <span className="text-[8px] font-mono uppercase bg-[#F27D26] text-white px-2 py-0.5 rounded-full tracking-wider font-bold">
              ★ PRIMARY SECTOR LOCK
            </span>

            <div className="space-y-4 mt-2">
              <div>
                <h3 className="font-serif italic font-extrabold text-lg text-white">
                  {activeTrip.input.destination} Expedition
                </h3>
                <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                  Style: {activeTrip.input.travelStyle} • Size: {activeTrip.input.peopleCount} Pilots
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                <div>
                  <span className="text-[8px] font-mono text-slate-450 block">BUDGET EXP</span>
                  <span className="text-[11px] font-bold text-[#F27D26] font-mono">₹{activeTrip.plannedBudget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-slate-450 block">PLACES PILED</span>
                  <span className="text-[11px] font-bold text-white font-mono">{activeTrip.itinerary?.length || 2} Spots</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-slate-450 block">DUR STATE</span>
                  <span className="text-[11px] font-bold text-teal-400 font-mono">{activeTrip.input.durationInDays} Days</span>
                </div>
              </div>

              {/* Vector progress bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-350">
                  <span>VECTOR COORD STAGE</span>
                  <span>{activeTrip.status === "live" ? "ACTIVE" : "READY"}</span>
                </div>
                <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-400"
                    style={{ width: activeTrip.status === "live" ? "100%" : "25%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trips List Grid */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 text-left">
            ALL EXPEDITIONS ({trips.length})
          </h4>

          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => {
                  onSelectTrip(trip);
                  onNavigate("itinerary");
                }}
                className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:border-[#F27D26]/40 transition hover:shadow-sm text-left"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-serif italic font-extrabold text-sm text-slate-800">
                      {trip.input.destination}
                    </h5>
                    <span className={`text-[8px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${getStatusStyle(trip.status)}`}>
                      {trip.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#1A1A1A]/60">
                    {trip.input.durationInDays} Days • Planned budget: ₹{trip.plannedBudget.toLocaleString()}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/5 flex items-center justify-center text-slate-500 font-mono text-xs">
                  {trip.input.destination.substring(0, 2).toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
