import { Compass, Sparkles, LogOut, ChevronRight, Settings, Award, Shield, Heart } from "lucide-react";

interface ProfileScreenProps {
  user: { id: string; name: string; email: string };
  onSignOut: () => void;
  onNavigate: (screen: string) => void;
}

export default function ProfileScreen({ user, onSignOut, onNavigate }: ProfileScreenProps) {
  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Navy Header with Avatar */}
      <div className="bg-gradient-to-b from-[#0B132B] to-[#1C2541] p-6 text-white text-center shrink-0 relative flex flex-col items-center">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFFFFF 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} />
        
        {/* Settings wheel absolute */}
        <button className="absolute top-4 right-4 text-white/60 hover:text-white transition duration-150 cursor-pointer">
          <Settings className="w-5 h-5" />
        </button>

        {/* 68px coral↔teal circle avatar */}
        <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-tr from-[#F27D26] to-[#0D9488] flex items-center justify-center p-0.5 shadow-xl shadow-black/25 mb-3">
          <div className="w-full h-full bg-[#0B132B] rounded-full flex items-center justify-center text-lg font-black text-white">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Name, Handle, Location */}
        <h3 className="text-lg font-serif italic font-extrabold text-white leading-tight">
          {user.name}
        </h3>
        <p className="text-[10px] text-teal-400 font-mono tracking-wider mt-1 uppercase">
          @amelia_pilot • Mumbai Vector
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 w-full max-w-xs mt-6 border-t border-white/10 pt-4 text-center">
          <div>
            <span className="text-sm font-black font-mono text-white block">3</span>
            <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wide">Trips</span>
          </div>
          <div>
            <span className="text-sm font-black font-mono text-white block">2</span>
            <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wide">Countries</span>
          </div>
          <div>
            <span className="text-sm font-black font-mono text-white block">4.9</span>
            <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wide">Rating</span>
          </div>
          <div>
            <span className="text-sm font-black font-mono text-white block">12</span>
            <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wide">Reviews</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* AI History Teal Banner */}
        <button
          onClick={() => onNavigate("chat")}
          className="w-full bg-teal-950/80 hover:bg-teal-900 border border-teal-500/20 rounded-2xl p-4 text-white text-left flex items-center justify-between transition duration-200 cursor-pointer"
        >
          <div className="space-y-1.5 max-w-[80%]">
            <span className="text-[8px] bg-teal-400 text-slate-900 font-bold uppercase font-mono px-2 py-0.5 rounded-full tracking-wider">
              AI SCHEDULER HISTORY
            </span>
            <p className="text-xs font-sans text-slate-250 leading-relaxed font-semibold">
              3 bespoke trips planned with Pilot AI this month. Explore coordinates list.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-teal-400 shrink-0" />
        </button>

        {/* Account settings section */}
        <div className="space-y-3 text-left">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/50">
            ACCOUNT COMMANDS
          </h4>

          <div className="bg-white border border-[#1A1A1A]/10 rounded-2xl divide-y divide-[#1A1A1A]/5 overflow-hidden shadow-sm">
            {[
              { label: "Personal Information", desc: "Modify email, phone, and metadata records", icon: "👤" },
              { label: "Payment Methods", desc: "Saved credit cards & UPI credentials", icon: "💳" },
              { label: "Security Settings", desc: "Secret passcode & face recognition locks", icon: "🔒" }
            ].map((item) => (
              <div
                key={item.label}
                className="p-4.5 flex justify-between items-center hover:bg-[#FBFBF9] transition duration-150 cursor-pointer"
              >
                <div className="flex gap-3.5 items-start">
                  <span className="text-xl select-none">{item.icon}</span>
                  <div className="text-left">
                    <h5 className="text-xs font-sans font-bold text-slate-800 leading-tight">{item.label}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-3 text-left">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/50">
            TRAVELER STYLE PREFERENCES
          </h4>

          <div className="bg-white border border-[#1A1A1A]/10 rounded-2xl divide-y divide-[#1A1A1A]/5 overflow-hidden shadow-sm">
            {[
              { label: "Travel Style Matrix", desc: "Currently: Adventure, Nature, Heritage", icon: "🗺️" },
              { label: "Budget & Local Currency", desc: "Currently: INR (₹)", icon: "💰" },
              { label: "Geospatial Notifications", desc: "Active alerts: Enabled on price drops", icon: "🔔" }
            ].map((item) => (
              <div
                key={item.label}
                className="p-4.5 flex justify-between items-center hover:bg-[#FBFBF9] transition duration-150 cursor-pointer"
              >
                <div className="flex gap-3.5 items-start">
                  <span className="text-xl select-none">{item.icon}</span>
                  <div className="text-left">
                    <h5 className="text-xs font-sans font-bold text-slate-800 leading-tight">{item.label}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Red Sign Out CTA */}
        <div className="pt-2">
          <button
            onClick={onSignOut}
            className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 py-3.5 rounded-2xl font-sans font-black text-xs uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out from Command Loop
          </button>
        </div>

      </div>
    </div>
  );
}
