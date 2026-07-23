import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Plus, Calendar, ShieldAlert, Navigation, FileText, ArrowRight } from "lucide-react";

interface ReservationsScreenProps {
  userId: string;
}

interface Reservation {
  id: string;
  vendorName: string;
  type: string;
  emoji: string;
  dates: string;
  confCode: string;
  status: "Confirmed" | "Pending" | "Cancelled";
}

export default function ReservationsScreen({ userId }: ReservationsScreenProps) {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [vendor, setVendor] = useState("");
  const [type, setType] = useState("Hotel");
  const [dates, setDates] = useState("Jul 28 - Aug 02");
  const [confCode, setConfCode] = useState("P-892A8");

  useEffect(() => {
    // Fetch user reservations
    fetch(`/api/reservations/user/${userId || "guest-id"}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setReservations(data))
      .catch((err) => {
        console.warn("Using reservations fallback data:", err);
        setReservations([
          { id: "res-1", vendorName: "The Taj Mahal Palace", type: "Hotel", emoji: "🏨", dates: "Jul 28 - Aug 02", confCode: "TP-9828A", status: "Confirmed" },
          { id: "res-2", vendorName: "Indigo Flight 6E-240", type: "Flight", emoji: "✈️", dates: "Jul 28 06:15", confCode: "IND-820X", status: "Confirmed" }
        ]);
      });
  }, [userId]);

  const handleAddReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim()) return;

    const emoji = type === "Hotel" ? "🏨" : type === "Flight" ? "✈️" : "🎟️";
    const payload = {
      userId: userId || "guest-id",
      vendorName: vendor,
      type,
      emoji,
      dates,
      confCode,
      status: "Confirmed"
    };

    fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((newRes) => {
        setReservations(prev => [newRes, ...prev]);
        setShowAddForm(false);
        setVendor("");
      })
      .catch((err) => {
        console.error("Error creating reservation:", err);
        // Fallback local addition
        const localRes: Reservation = {
          id: "res-local-" + Date.now(),
          vendorName: vendor,
          type,
          emoji,
          dates,
          confCode,
          status: "Pending"
        };
        setReservations(prev => [localRes, ...prev]);
        setShowAddForm(false);
        setVendor("");
      });
  };

  const filteredReservations = reservations.filter((r) => {
    if (activeTab === "Upcoming") return r.status !== "Cancelled";
    if (activeTab === "Cancelled") return r.status === "Cancelled";
    return true; // "Past" shows all
  });

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Three-tab header */}
      <div className="bg-white border-b border-[#1A1A1A]/10 px-4 py-3.5 sticky top-0 z-30 space-y-3.5 shrink-0 text-left">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-slate-900">Reservations</h2>
          <p className="text-[9px] font-mono text-[#1A1A1A]/50 uppercase tracking-widest mt-0.5">
            Geospatial Reservation Logs
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#1A1A1A]/5 rounded-xl p-1 border border-[#1A1A1A]/5">
          {["Upcoming", "Past", "Cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setShowAddForm(false);
              }}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Reservation addition form inline */}
        {showAddForm ? (
          <form onSubmit={handleAddReservation} className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-4.5 text-left space-y-3.5 shadow-sm">
            <span className="text-[9px] font-mono font-bold text-[#F27D26] uppercase block">CREATE NEW VENDOR RECORD</span>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">Vendor/Merchant</label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Taj Palace Hotel"
                  className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">Sector type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition cursor-pointer font-sans"
                  >
                    <option value="Hotel">Hotel 🏨</option>
                    <option value="Flight">Flight ✈️</option>
                    <option value="Attraction">Attraction 🎫</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">CONFIRMATION ID</label>
                  <input
                    type="text"
                    value={confCode}
                    onChange={(e) => setConfCode(e.target.value)}
                    className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">DATES RANGE</label>
                <input
                  type="text"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  placeholder="e.g. Jul 28 - Aug 02"
                  className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition font-sans"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-[#F27D26] hover:bg-[#E06A1B] text-white py-2.5 rounded-xl text-[10px] font-sans font-black uppercase tracking-wider transition cursor-pointer text-center"
              >
                DEPLOY RESERVATION
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1A1A1A] rounded-xl text-[10px] font-sans font-black uppercase tracking-wider transition cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3.5 border-2 border-dashed border-[#1A1A1A]/15 hover:border-[#F27D26]/50 bg-white hover:bg-[#FBFBF9] rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition duration-200 text-xs font-sans font-bold text-[#1A1A1A]/50 hover:text-[#F27D26]"
          >
            <Plus className="w-4 h-4" /> Add Reservation Code
          </button>
        )}

        {/* Cards List */}
        <div className="space-y-4">
          {filteredReservations.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-[#1A1A1A]/10 overflow-hidden shadow-sm text-left relative"
            >
              <div className="p-4 flex gap-4">
                {/* Visual Icon block */}
                <div className="w-16 h-16 bg-[#1C2541]/5 border border-slate-200 rounded-2xl flex items-center justify-center text-3xl shrink-0 select-none">
                  {res.emoji}
                </div>

                {/* Reservation Details */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-serif italic font-extrabold text-sm text-slate-800 truncate leading-tight">
                      {res.vendorName}
                    </h4>
                    <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                      res.status === "Confirmed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      {res.status === "Confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-[#1A1A1A]/40 uppercase block">
                    CODE: {res.confCode}
                  </span>

                  {/* Dates grid */}
                  <div className="flex gap-4 text-[10px] text-[#1A1A1A]/60 pt-1.5 border-t border-[#1A1A1A]/5">
                    <div className="flex items-center gap-1 font-sans">
                      <Calendar className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>{res.dates}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="bg-[#FBFBF9] border-t border-[#1A1A1A]/5 px-4 py-2 flex gap-4 text-[9px] font-sans font-bold uppercase text-[#1A1A1A]/60">
                <button className="flex items-center gap-1 hover:text-[#F27D26] duration-150 cursor-pointer">
                  <FileText className="w-3.5 h-3.5" /> DETAILS
                </button>
                <button className="flex items-center gap-1 hover:text-teal-600 duration-150 cursor-pointer">
                  <Navigation className="w-3.5 h-3.5" /> DIRECTIONS
                </button>
              </div>
            </div>
          ))}

          {filteredReservations.length === 0 && (
            <div className="text-center py-12 text-xs text-[#1A1A1A]/40 font-mono italic">
              No reservation vectors active in directory.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
