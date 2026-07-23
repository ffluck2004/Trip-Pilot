import { useState } from "react";
import { ArrowLeft, Clock, MapPin, DollarSign, Plus, Eye, Navigation } from "lucide-react";
import { Trip } from "../types";

interface ItineraryScreenProps {
  activeTrip: Trip | null;
  onNavigateBack: () => void;
  onNavigateToMap: () => void;
}

export default function ItineraryScreen({ activeTrip, onNavigateBack, onNavigateToMap }: ItineraryScreenProps) {
  const [activeDay, setActiveDay] = useState(1);

  if (!activeTrip) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center p-8 text-center bg-[#FBFBF9]">
        <span className="text-4xl animate-bounce">✈️</span>
        <h3 className="font-serif italic font-bold text-slate-800 text-lg mt-2">No active expedition selected</h3>
        <p className="text-xs text-slate-400 font-mono mt-1">Please select an expedition from the Trip Planner list.</p>
        <button
          onClick={onNavigateBack}
          className="mt-4 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-xs uppercase font-mono tracking-widest"
        >
          Return to Planner
        </button>
      </div>
    );
  }

  // Get active day itinerary events
  const dayEvents = activeTrip.itinerary?.filter((item) => item.day === activeDay) || [];

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Navy Gradient Header */}
      <div className="bg-gradient-to-b from-[#0B132B] to-[#1C2541] p-4 text-white shrink-0 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFFFFF 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} />
        
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={onNavigateBack}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <span className="text-[8px] font-mono text-teal-400 uppercase tracking-widest font-bold">ACTIVE EXPEDITION LOCK</span>
            <h2 className="text-base font-serif italic font-extrabold tracking-tight">
              {activeTrip.input.destination} Flight Route
            </h2>
          </div>
        </div>

        {/* Day 1-N scrollable tab chips */}
        <div className="flex gap-2 overflow-x-auto pt-4 pb-1 relative z-10 scrollbar-none">
          {Array.from({ length: activeTrip.input.durationInDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const isSelected = activeDay === dayNum;
            return (
              <button
                key={dayNum}
                onClick={() => setActiveDay(dayNum)}
                className={`text-xs px-4.5 py-2 rounded-full transition-all shrink-0 font-bold tracking-wider cursor-pointer ${
                  isSelected
                    ? "bg-[#F27D26] text-white shadow-md shadow-[#F27D26]/10"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                DAY {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day label in all-caps muted */}
      <div className="px-4 py-3 bg-white/65 border-b border-[#1A1A1A]/10 sticky top-0 z-20 text-left">
        <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-[0.2em] font-mono">
          EXPEDITION TIMELINE VECTOR FOR DAY {activeDay}
        </span>
      </div>

      {/* Itinerary Timeline */}
      <div className="flex-1 p-4">
        {dayEvents.length > 0 ? (
          <div className="relative border-l-2 border-[#1A1A1A]/10 ml-16 space-y-8 py-2">
            {dayEvents.map((event, evIdx) => {
              const isEven = evIdx % 2 === 0;
              return (
                <div key={event.id} className="relative text-left">
                  
                  {/* Left aligned Time Column */}
                  <div className="absolute -left-16 top-1.5 w-12 text-right">
                    <span className="text-[10px] font-bold font-mono text-slate-800 tracking-tighter">
                      {event.timeSlot?.split(" ")[0] || "09:00"}
                    </span>
                    <span className="text-[8px] font-mono text-[#1A1A1A]/40 uppercase tracking-wider block">
                      AM
                    </span>
                  </div>

                  {/* Timeline node dot */}
                  <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full bg-[#F27D26] border border-white ring-4 ring-[#F27D26]/20" />

                  {/* Timeline Event Card */}
                  <div className="ml-5 bg-white border border-[#1A1A1A]/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-150 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl select-none" role="img" aria-label="category icon">
                          {event.category === "hotel" ? "🏨" : event.category === "restaurant" ? "🍜" : "🏯"}
                        </span>
                        <h4 className="text-xs font-serif font-black text-slate-900 leading-tight">
                          {event.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-[#F27D26] font-mono shrink-0">
                        ₹{event.costEstimation}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#1A1A1A]/70 leading-relaxed font-sans">
                      {event.description}
                    </p>

                    <div className="flex items-center justify-between text-[9px] font-mono text-[#1A1A1A]/40 pt-1.5 border-t border-[#1A1A1A]/5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{event.estimatedDurationMinutes} mins</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#F27D26]" />
                        <span className="truncate max-w-[80px]">{event.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Between events: Transport indicator */}
                  {evIdx < dayEvents.length - 1 && (
                    <div className="my-4 ml-5 p-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] text-[#1A1A1A]/50 font-mono flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-teal-600 rotate-45" />
                      <span>{isEven ? "🚶 10 min stroll down heritage corridor" : "🚇 Metro 3 coordinates • ₹25"}</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-[#1A1A1A]/40 font-mono italic space-y-1">
            <p>No active flight coordinates listed for Day {activeDay}.</p>
            <p className="text-[10px]">Click the activity vector trigger to add coordinates.</p>
          </div>
        )}

        {/* ➕ "Add Activity" dashed card */}
        <div className="mt-6">
          <button
            onClick={onNavigateToMap}
            className="w-full py-4 border-2 border-dashed border-[#1A1A1A]/15 hover:border-[#F27D26]/50 bg-white hover:bg-[#FBFBF9] rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition duration-200 text-xs font-sans font-bold text-[#1A1A1A]/50 hover:text-[#F27D26]"
          >
            <Plus className="w-4 h-4" /> Add Activity Coordinate on Radar
          </button>
        </div>
      </div>

    </div>
  );
}
