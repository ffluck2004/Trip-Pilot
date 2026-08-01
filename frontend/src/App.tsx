import { useState, useEffect } from "react";
import { Compass, LogOut, ShieldAlert, LayoutDashboard, Database } from "lucide-react";
import { Trip } from "./types";

// Import original high-fidelity subcomponents
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import AiAssistant from "./components/AiAssistant";

export default function App() {
  // Authenticated user state — start signed out so visitors always see the login page
  const [user, setUser] = useState<any>(null);

  // Track active trip for the floating AI assistant context
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Switch between "dashboard" and "admin" panels (if user is an admin)
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin">("dashboard");

  // Handle Logout
  const handleLogOut = () => {
    localStorage.removeItem("trippilot_user");
    localStorage.removeItem("temp_user");
    setUser(null);
    setActiveTrip(null);
    setActiveTab("dashboard");
  };

  // If user is not logged in, show the editorial onboarding and login system
  if (!user) {
    return (
      <Onboarding
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          localStorage.setItem("trippilot_user", JSON.stringify(loggedUser));
        }}
      />
    );
  }

  const isAdmin = user.role?.toLowerCase() === "admin";

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#F27D26]/20">
      
      {/* Editorial Navigation Top Bar */}
      <header className="bg-white border-b border-[#1A1A1A]/10 sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1A1A1A] text-white flex items-center justify-center border border-[#1A1A1A]">
            <Compass className="w-5 h-5 text-[#F27D26]" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-serif italic font-black tracking-tight text-[#1A1A1A] leading-none">
              TripPilot
            </h1>
            <span className="text-[9px] font-mono text-[#1A1A1A]/55 uppercase tracking-widest font-bold block mt-0.5">
              Location Intelligence Platform
            </span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          
          {/* Admin Toggle Options */}
          {isAdmin && (
            <div className="flex bg-[#1A1A1A]/5 p-0.5 border border-[#1A1A1A]/10 rounded-sm">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                  activeTab === "dashboard"
                    ? "bg-[#1A1A1A] text-white"
                    : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Traveler Core
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                  activeTab === "admin"
                    ? "bg-[#F27D26] text-white"
                    : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            </div>
          )}

          {/* User profile brief & sign out button */}
          <div className="flex items-center gap-3.5 border-l border-[#1A1A1A]/15 pl-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <p className="text-[10px] font-mono text-[#1A1A1A]/50">{user.email}</p>
            </div>

            {isAdmin && (
              <span className="bg-red-50 text-red-600 border border-red-200 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm">
                System Admin
              </span>
            )}

            <button
              onClick={handleLogOut}
              title="Sign Out"
              className="p-2 hover:bg-[#1A1A1A]/5 hover:text-red-600 transition border border-[#1A1A1A]/10 rounded-none cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </header>

      {/* Main Panel stage */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6">
        {activeTab === "admin" && isAdmin ? (
          <AdminPanel adminUserId={user.id} />
        ) : (
          <Dashboard
            user={user}
            onLogOut={handleLogOut}
            onTripChange={(trip) => setActiveTrip(trip)}
          />
        )}
      </main>

      {/* Floating Smart AI assistant (always available at the bottom-right for conversation) */}
      <AiAssistant activeTrip={activeTrip} />

    </div>
  );
}
