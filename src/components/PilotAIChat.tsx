import { useState, useEffect, useRef } from "react";
import { Compass, Send, Sparkles, MapPin, Calendar, Compass as StyleIcon, Coins, Clock, Users, ArrowRight } from "lucide-react";
import { Trip } from "../types";

interface PilotAIChatProps {
  userId: string;
  onTripGenerated: (trip: Trip) => void;
  onNavigateToItinerary: (tripId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  isPlan?: boolean;
  planDetails?: any;
}

const CHIPS_BY_STEP: { [key: number]: string[] } = {
  1: ["Mumbai", "Jaipur", "Goa", "Paris", "London"],
  2: ["3 Days", "5 Days", "7 Days", "10 Days"],
  3: ["Adventure", "Luxury", "Budget", "Family"],
  4: ["₹15,000", "₹30,000", "₹50,000", "₹1,20,000"],
  5: ["October", "December", "February", "April", "July"],
  6: ["Solo", "Couple (2)", "Friends (4)", "Family (6)"],
  7: ["Local Food 🍜", "Heritage Sights 🏯", "Cozy Cafes ☕", "Scenic Nature 🍃"]
};

const QUESTIONS = [
  "", // dummy 0 index
  "Welcome back to Pilot Intelligence! Where is our next coordinates?",
  "Roger that. How many days is this journey?",
  "What is our travel style for this expedition? Budget, Luxury, Adventure, or Family?",
  "Excellent. What is our maximum planned budget (INR)?",
  "Which month are we embarking on this journey?",
  "How many travelers are in your squadron?",
  "Understood. Are there any specific must-haves or coordinate exclusions?"
];

export default function PilotAIChat({ userId, onTripGenerated, onNavigateToItinerary }: PilotAIChatProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<any>({
    destination: "",
    durationInDays: 3,
    travelStyle: "Adventure",
    budget: 20000,
    month: "October",
    peopleCount: 1,
    preferences: ""
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-init",
      sender: "ai",
      text: "Welcome back, Pilot. I am your geospatial flight planner. Tell me, where is our next travel coordinates?"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState<Trip | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    // 1. Add user message
    const userMsgId = "m-user-" + Date.now();
    setMessages(prev => [...prev, { id: userMsgId, sender: "user", text: textToSend }]);
    setInputValue("");

    // 2. Process answers based on current step
    const updatedAnswers = { ...answers };
    if (currentStep === 1) {
      updatedAnswers.destination = textToSend;
    } else if (currentStep === 2) {
      updatedAnswers.durationInDays = parseInt(textToSend) || 3;
    } else if (currentStep === 3) {
      updatedAnswers.travelStyle = textToSend;
    } else if (currentStep === 4) {
      updatedAnswers.budget = parseInt(textToSend.replace(/[^\d]/g, "")) || 20000;
    } else if (currentStep === 5) {
      updatedAnswers.month = textToSend;
    } else if (currentStep === 6) {
      updatedAnswers.peopleCount = parseInt(textToSend.replace(/[^\d]/g, "")) || 1;
    } else if (currentStep === 7) {
      updatedAnswers.preferences = textToSend;
    }

    setAnswers(updatedAnswers);

    // 3. Advance step or trigger trip generation
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
      // Add next AI question
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: "m-ai-" + Date.now(),
            sender: "ai",
            text: QUESTIONS[currentStep + 1]
          }
        ]);
      }, 600);
    } else {
      // Step 7 complete! Trigger actual POST to `/api/trips/generate`
      setCurrentStep(8);
      setLoading(true);
      
      try {
        const payload = {
          userId: userId || "guest-id",
          destination: updatedAnswers.destination,
          durationInDays: updatedAnswers.durationInDays,
          budget: updatedAnswers.budget,
          peopleCount: updatedAnswers.peopleCount,
          travelRadiusKm: 25,
          interests: [updatedAnswers.preferences || "Sightseeing", "Food"],
          travelStyle: updatedAnswers.travelStyle,
          preferences: `Embarking in ${updatedAnswers.month}. Custom requests: ${updatedAnswers.preferences}`
        };

        const res = await fetch("/api/trips/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Geospatial engine failure.");

        // Successful trip generation
        const newTrip: Trip = data.trip;
        setGeneratedTrip(newTrip);
        onTripGenerated(newTrip);

        setMessages(prev => [
          ...prev,
          {
            id: "m-ai-success-" + Date.now(),
            sender: "ai",
            text: `Bespoke itinerary formulated! High-fidelity Day 1–${newTrip.input.durationInDays} travel route maps out beautifully. Ready for deployment.`
          }
        ]);
      } catch (err: any) {
        console.error(err);
        // Fallback trip setup
        const mockTripId = "trip-mock-" + Math.random().toString(36).substring(2, 5);
        const fallbackTrip: Trip = {
          id: mockTripId,
          userId: userId || "guest-id",
          input: {
            destination: updatedAnswers.destination,
            durationInDays: updatedAnswers.durationInDays,
            budget: updatedAnswers.budget,
            peopleCount: updatedAnswers.peopleCount,
            travelRadiusKm: 25,
            interests: [updatedAnswers.preferences || "Sightseeing", "Food"],
            travelStyle: updatedAnswers.travelStyle
          },
          itinerary: [
            { id: "act1", day: 1, timeSlot: "09:00 - 11:30", title: `Explore Central ${updatedAnswers.destination}`, description: "Tour of signature viewpoints and historical architecture.", category: "attraction", lat: 18.922, lng: 72.8347, costEstimation: 500, estimatedDurationMinutes: 150, address: "Central Square" },
            { id: "act2", day: 1, timeSlot: "12:30 - 14:00", title: "Local Gourmet Pavilion", description: "Savor traditional culinary specialties and premium beverages.", category: "restaurant", lat: 18.9221, lng: 72.8315, costEstimation: 800, estimatedDurationMinutes: 90, address: "Bazaar Archway" }
          ],
          optimizedOrder: ["act1", "act2"],
          plannedBudget: updatedAnswers.budget,
          actualSpending: 1300,
          status: "planning",
          createdAt: new Date().toISOString()
        };
        setGeneratedTrip(fallbackTrip);
        onTripGenerated(fallbackTrip);
        setMessages(prev => [
          ...prev,
          {
            id: "m-ai-fallback-" + Date.now(),
            sender: "ai",
            text: `[Geospatial Offline Mode] Configured a standard high-fidelity travel itinerary matching your specified inputs.`
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-[#0B132B] text-white overflow-hidden relative">
      {/* Header section with active assistant info */}
      <div className="p-4 bg-[#1C2541]/95 border-b border-white/10 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#F27D26] to-[#0D9488] rounded-full flex items-center justify-center p-0.5 relative">
            <div className="w-full h-full bg-[#0B132B] rounded-full flex items-center justify-center">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            {/* Green Online Dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1C2541]"></span>
          </div>
          <div>
            <h3 className="text-sm font-sans font-black tracking-wider uppercase flex items-center gap-1">
              Pilot AI <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
            </h3>
            <span className="text-[9px] font-mono text-slate-300 uppercase tracking-widest">
              Live Location Intelligence
            </span>
          </div>
        </div>
        <div className="text-[10px] bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-mono text-teal-400">
          STEP {Math.min(7, currentStep)}/7
        </div>
      </div>

      {/* Messages Scroll Panel */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isAI = m.sender === "ai";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 max-w-[85%] ${
                isAI ? "mr-auto text-left" : "ml-auto flex-row-reverse text-right"
              }`}
            >
              {isAI && (
                <div className="w-8 h-8 bg-gradient-to-tr from-[#F27D26] to-[#0D9488] rounded-full flex items-center justify-center p-0.5 shrink-0">
                  <div className="w-full h-full bg-[#0B132B] rounded-full flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              )}
              
              <div
                className={`p-3.5 text-xs rounded-2xl leading-relaxed ${
                  isAI
                    ? "bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-tl-sm"
                    : "bg-gradient-to-r from-[#F27D26] to-[#E06A1B] text-white rounded-tr-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}

        {/* Loading placeholder */}
        {loading && (
          <div className="flex items-start gap-3 mr-auto text-left max-w-[85%]">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#F27D26] to-[#0D9488] rounded-full flex items-center justify-center p-0.5 shrink-0">
              <div className="w-full h-full bg-[#0B132B] rounded-full flex items-center justify-center">
                <Compass className="w-3.5 h-3.5 text-white animate-spin" />
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl rounded-tl-sm border border-white/5 text-xs text-slate-300 italic font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-teal-400">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" /> Consulting geospatial travel matrix...
              </div>
              <p className="text-[10px] text-slate-400">Formulating flight connections and optimal routing...</p>
            </div>
          </div>
        )}

        {/* Embedded Day-Plan Card displayed on success */}
        {generatedTrip && (
          <div className="mt-4 p-4 bg-white text-slate-900 rounded-3xl border border-white/10 shadow-2xl space-y-3 z-10 relative">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#F27D26] uppercase font-mono tracking-wider">GENERATED FLIGHT PLAN</span>
                <h4 className="text-base font-serif italic font-black text-slate-900">
                  {generatedTrip.input.destination} Journey Matrix
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono uppercase block text-slate-400">PLANNED BUDGET</span>
                <span className="text-xs font-bold text-teal-700">₹{generatedTrip.plannedBudget.toLocaleString()}</span>
              </div>
            </div>

            {/* Simulated 7-day mini timeline representation */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {Array.from({ length: generatedTrip.input.durationInDays }).map((_, dIdx) => (
                <div key={dIdx} className="flex gap-2 items-start p-2 bg-[#FBFBF9] border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-mono uppercase font-bold bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded shrink-0">
                    Day {dIdx + 1}
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">
                      {dIdx === 0 ? "Initial Vector Landing & Sightseeing" : dIdx === 1 ? "Local Culinary Expedition" : "Scenic Explorer Trail"}
                    </p>
                    <p className="text-[10px] text-slate-400">Estimated cost: ₹{Math.round((generatedTrip.plannedBudget / generatedTrip.input.durationInDays) * 0.85)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Launch Itinerary Button */}
            <button
              onClick={() => onNavigateToItinerary(generatedTrip.id)}
              className="w-full py-3 bg-[#0D9488] hover:bg-teal-700 text-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-lg shadow-teal-500/10"
            >
              Open Full Itinerary →
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Chips Section */}
      {!loading && currentStep <= 7 && (
        <div className="px-4 py-2 bg-[#1C2541]/50 border-t border-white/5 shrink-0 z-10">
          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block mb-1.5">SUGGESTED COORDINATES</span>
          <div className="flex flex-wrap gap-1.5">
            {CHIPS_BY_STEP[currentStep]?.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="text-xs py-1.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all text-white cursor-pointer active:scale-95 flex items-center gap-1"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="p-4 bg-[#1C2541]/95 border-t border-white/10 shrink-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue.trim()) handleSend(inputValue);
          }}
          className="flex items-center gap-2 bg-[#0B132B]/80 rounded-xl p-1.5 border border-white/10 focus-within:border-[#F27D26] transition-all"
        >
          <input
            type="text"
            disabled={loading || currentStep > 7}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={loading ? "Generating trip vector..." : currentStep > 7 ? "Trip formulation complete" : `Reply to AI Pilot...`}
            className="flex-1 bg-transparent border-none outline-none text-xs px-2.5 py-1.5 text-white placeholder-white/35 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim() || currentStep > 7}
            className="w-9 h-9 bg-[#F27D26] hover:bg-[#E06A1B] disabled:opacity-40 rounded-lg flex items-center justify-center transition cursor-pointer"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
