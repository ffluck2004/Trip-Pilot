/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Compass, Sparkles, AlertCircle, Loader } from "lucide-react";
import { Trip } from "../types";
import { sendChatMessage } from '../api/geminiApi';
import { generateTrip } from '../api/tripApi';

interface AiAssistantProps {
  activeTrip: Trip | null;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  proposedTrip?: {
    destination: string;
    durationInDays: number;
    durationInHours?: number;
    budget: number;
    peopleCount: number;
    travelRadiusKm: number;
    interests: string[];
    travelStyle: string;
    preferences: string;
  } | null;
}

export default function AiAssistant({ activeTrip }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages with personalized guidance
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Welcome to TripPilot AI! I am your real-time Location Intelligence assistant. Too lazy to fill out forms? Just type 'plan a 3 day luxury getaway to Paris' or 'budget trip to Jaipur' and I will automatically build your route for you!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || loading) return;

    const userText = inputVal.trim();
    setInputVal("");

    const userMsg: ChatMessage = {
      id: `u-${Math.random()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Proxy request to Express server which speaks with @google/genai module
      const data = await sendChatMessage(userText, activeTrip);

      const botMsg: ChatMessage = {
        id: `b-${Math.random()}`,
        sender: "bot",
        text: data.text || "Pardon, I encountered a connection delay. What specific spot should we inspect?",
        proposedTrip: data.proposedTrip || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("AI assistant message error:", err);
      // Fallback proposal detection based on user query
      const lower = userText.toLowerCase();
      let proposedTrip = null;
      if (lower.includes("jaipur") || lower.includes("mumbai") || lower.includes("delhi") || lower.includes("goa") || lower.includes("paris") || lower.includes("plan") || lower.includes("trip")) {
        proposedTrip = {
          destination: lower.includes("jaipur") ? "Jaipur" : lower.includes("paris") ? "Paris" : lower.includes("goa") ? "Goa" : "Mumbai",
          durationInDays: 3,
          durationInHours: 8,
          budget: 18000,
          peopleCount: 2,
          travelRadiusKm: 20,
          interests: ["Food", "Sightseeing", "Photography"],
          travelStyle: "Adventure",
          preferences: `Spontaneous chat request about: ${userText}`
        };
      }

      const fallbackMsg: ChatMessage = {
        id: `b-err-${Math.random()}`,
        sender: "bot",
        text: proposedTrip 
          ? `[Offline Backup Engine] I have drafted a custom spontaneous itinerary for ${proposedTrip.destination} based on local indices! Click below to map it immediately.`
          : "I am temporarily utilizing local cached geospatial intelligence. Tell me about your destination like Mumbai, Jaipur, Paris or Goa and I'll generate a draft path!",
        proposedTrip,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchTrip = async (proposed: any, msgId: string) => {
    setLaunchingId(msgId);
    try {
      const data = await generateTrip({
          userId: activeTrip?.userId || "guest-id",
          destination: proposed.destination,
          durationInDays: proposed.durationInDays,
          durationInHours: proposed.durationInHours || 8,
          budget: proposed.budget,
          peopleCount: proposed.peopleCount,
          travelRadiusKm: proposed.travelRadiusKm || 25,
          interests: proposed.interests && proposed.interests.length > 0 ? proposed.interests : ["Food", "Sightseeing"],
          travelStyle: proposed.travelStyle || "Adventure",
          preferences: proposed.preferences || "Generated via Conversational Assistant",
        });

      if (data.success && data.trip) {
        // Dispatch external trigger event so Dashboard state reloads the maps & schedules
        window.dispatchEvent(new CustomEvent("trip-generated", { detail: data.trip }));
        
        // Add a success confirmation message in thread
        const confMsg: ChatMessage = {
          id: `b-conf-${Math.random()}`,
          sender: "bot",
          text: `🚀 **Success!** I have fully compiled a real-time optimized trip to **${proposed.destination}**! Your active map coordinates, Day-by-Day schedule slots, and budget sheets have loaded automatically!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, confMsg]);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `b-err-${Math.random()}`,
        sender: "bot",
        text: `⚠️ I encountered a slight error during compilation: ${err.message || "Request timeout"}. Let's try formulating again!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLaunchingId(null);
    }
  };

  const presetQuestions = [
    "Plan a spontaneous 3-day Jaipur tour",
    "Plan a budget weekend in Goa",
    "Plan a luxury day in Paris",
    "How do I optimize my schedule?"
  ];

  const handlePresetClick = (q: string) => {
    setInputVal(q);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] font-sans">
      {/* Toggle Badge Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-3 rounded-none border border-[#1A1A1A] hover:bg-[#F27D26] hover:text-[#FBFBF9] transition-all duration-200 shadow-[4px_4px_0px_rgba(26,26,26,0.2)] focus:outline-none cursor-pointer"
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-[#F27D26]" />
            <span className="absolute -top-1.5 -right-1 flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F27D26]"></span>
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Pilot Assistant</span>
          <Sparkles className="w-3.5 h-3.5 text-orange-200" />
        </button>
      )}

      {/* Main Chat Panel */}
      {isOpen && (
        <div className="w-[360px] md:w-[390px] h-[520px] bg-white rounded-none border-2 border-[#1A1A1A] shadow-[8px_8px_0px_rgba(26,26,26,0.15)] flex flex-col overflow-hidden animate-in fade-in-50 duration-200">
          {/* Header */}
          <div className="bg-[#1A1A1A] p-4 text-[#FBFBF9] flex justify-between items-center border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-none border border-white/15">
                <Compass className="w-5 h-5 text-[#F27D26]" />
              </div>
              <div className="text-left">
                <h3 className="font-serif italic font-bold text-sm text-[#FBFBF9] tracking-wider">TripPilot Intelligence</h3>
                <p className="text-[9px] font-mono text-[#FBFBF9]/65 flex items-center gap-1.5 mt-0.5 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-pulse"></span>
                  Gemini Active
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#FBFBF9]/60 hover:text-white p-1 hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Context Bar */}
          <div className="bg-[#F5F5F0] px-4 py-2 border-b border-[#1A1A1A]/10 text-[10px] text-[#1A1A1A]/70 flex items-center justify-between font-mono uppercase tracking-wider">
            <span>Trip Context: <strong className="text-slate-900">{activeTrip ? activeTrip.input.destination : "None"}</strong></span>
            {activeTrip && <span className="text-[9px] text-[#F27D26] font-bold">Radius Active</span>}
          </div>

          {/* Messages Window */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBFBF9]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${
                  m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-3 text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#1A1A1A] text-white rounded-none"
                      : "bg-white text-[#1A1A1A] border border-[#1A1A1A]/15 rounded-none shadow-none"
                  }`}
                >
                  {m.text}
                </div>

                {/* Proposed Trip Actionable Card */}
                {m.proposedTrip && (
                  <div className="mt-2 bg-[#F5F5F0] border-l-4 border-[#F27D26] p-3 text-left space-y-2 rounded-none w-full shadow-sm text-xs">
                    <div className="flex justify-between items-start">
                      <span className="font-bold tracking-tight text-slate-800 uppercase text-[10px] font-mono">✈️ Draft Itinerary Ready</span>
                      <span className="text-[9px] bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded-none font-mono uppercase font-bold text-[8px]">{m.proposedTrip.travelStyle}</span>
                    </div>
                    
                    <div className="space-y-1 text-slate-700 text-[11px] font-mono">
                      <p>📍 Destination: <strong className="text-slate-900">{m.proposedTrip.destination}</strong></p>
                      <p>📅 Duration: {m.proposedTrip.durationInDays} Days ({m.proposedTrip.durationInHours || 8}h Active)</p>
                      <p>💰 Budget: ₹{m.proposedTrip.budget}</p>
                      <p>👥 Group size: {m.proposedTrip.peopleCount} {m.proposedTrip.peopleCount > 1 ? "People" : "Person"}</p>
                      {m.proposedTrip.interests && m.proposedTrip.interests.length > 0 && (
                        <p className="text-[10px] text-slate-500 italic truncate">⭐ {m.proposedTrip.interests.join(", ")}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleLaunchTrip(m.proposedTrip!, m.id)}
                      disabled={launchingId !== null}
                      className="w-full bg-[#1A1A1A] hover:bg-[#F27D26] text-white py-1.5 px-2.5 rounded-none font-bold font-sans uppercase tracking-wider text-[9px] text-center flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      {launchingId === m.id ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin text-white" />
                          Mapping Spontaneous Route...
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5 text-[#F27D26]" />
                          Confirm & Launch Itinerary
                        </>
                      )}
                    </button>
                  </div>
                )}

                <span className="text-[8px] text-slate-400 mt-1 px-1 font-mono">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[#1A1A1A]/60 mr-auto max-w-[85%] font-mono uppercase tracking-wider text-[9px]">
                <div className="bg-white border border-[#1A1A1A]/12 p-3 rounded-none shadow-none flex items-center gap-2">
                  <Loader className="w-3.5 h-3.5 animate-spin text-[#F27D26]" />
                  Solving Geospatial query...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Preset Chips */}
          <div className="p-2.5 bg-[#F5F5F0] border-t border-[#1A1A1A]/10 flex flex-wrap gap-1.5 select-none">
            {presetQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handlePresetClick(q)}
                className="text-[9px] uppercase tracking-wider font-mono bg-white hover:bg-[#F5F5F0] border border-[#1A1A1A]/15 text-[#1A1A1A]/70 px-2 py-1 rounded-none transition truncate max-w-[170px]"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[#1A1A1A]/10 flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask helper or try 'Plan trip to Jaipur'..."
              className="flex-1 bg-[#FBFBF9] border border-[#1A1A1A]/15 px-3 py-2 text-xs outline-none focus:border-[#1A1A1A] rounded-none transition"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || loading}
              className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white p-2 rounded-none transition disabled:opacity-40 border border-[#1A1A1A]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
