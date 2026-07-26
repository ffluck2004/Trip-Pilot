import React, { useState, useEffect } from "react";
import { Coins, Plus, CheckSquare, Square, Search, RefreshCw, Landmark, ArrowRight } from "lucide-react";
import { Trip } from "../types";
import { getExpensesByTrip, createExpense } from '../api/expenseApi';

interface BudgetCalculatorProps {
  userId: string;
  trips: Trip[];
  activeTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  onNavigate: (screen: string) => void;
  cartFlights: { airline: string; price: number; route: string }[];
  cartHotels: { title: string; price: number; destination: string }[];
}

interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  category: "Flights" | "Hotels" | "Food" | "Activities" | "Shopping";
  date: string;
}

export default function BudgetCalculator({
  userId,
  trips,
  activeTrip,
  onSelectTrip,
  onNavigate,
  cartFlights,
  cartHotels
}: BudgetCalculatorProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Form states
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<"Flights" | "Hotels" | "Food" | "Activities" | "Shopping">("Food");

  // Checklist toggles
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    "flight-base": true,
    "hotel-base": true,
    "activity-food": true,
    "activity-tours": true
  });

  const selectedTrip = activeTrip || trips[0];

  useEffect(() => {
    if (!selectedTrip) return;
    // Fetch expenses for the selected trip
    getExpensesByTrip(selectedTrip.id)
      .then((data) => setExpenses(data))
      .catch((err) => {
        console.warn("Using budget expense fallback details:", err);
        // Fallback calculations using items
        setExpenses([
          { id: "exp-1", tripId: selectedTrip.id, title: "Initial flight reservation reference", amount: 15400, category: "Flights", date: "Jul 28" },
          { id: "exp-2", tripId: selectedTrip.id, title: "The Taj Mahal Suite deposit", amount: 24500, category: "Hotels", date: "Jul 28" },
          { id: "exp-3", tripId: selectedTrip.id, title: "Leopold Cafe Breakfast lunch", amount: 1200, category: "Food", date: "Jul 29" },
          { id: "exp-4", tripId: selectedTrip.id, title: "Gateway Tour Guide activity", amount: 500, category: "Activities", date: "Jul 29" }
        ]);
      });
  }, [selectedTrip]);

  // Handle local checkbox toggle
  const toggleChecklist = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Add customized cart flight and hotel expenses to list
  const flightCartTotal = cartFlights.reduce((acc, f) => acc + f.price, 0);
  const hotelCartTotal = cartHotels.reduce((acc, h) => acc + h.price, 0);

  // Calculate live dynamic checklists and expense total summation
  const calculatedTotalBudget = selectedTrip ? selectedTrip.plannedBudget : 50000;

  let currentLiveSpentSum = 0;
  // Apply checklist items
  if (checklist["flight-base"]) currentLiveSpentSum += 15400 + flightCartTotal;
  if (checklist["hotel-base"]) currentLiveSpentSum += 24500 + hotelCartTotal;
  if (checklist["activity-food"]) currentLiveSpentSum += 1200;
  if (checklist["activity-tours"]) currentLiveSpentSum += 500;

  // Add custom typed expense additions
  const typedExpensesTotal = expenses
    .filter(e => e.id.startsWith("exp-custom-"))
    .reduce((acc, e) => acc + e.amount, 0);
  
  currentLiveSpentSum += typedExpensesTotal;

  const currentRemainingSum = Math.max(0, calculatedTotalBudget - currentLiveSpentSum);
  const budgetRatio = Math.min(100, (currentLiveSpentSum / calculatedTotalBudget) * 100);

  // Add expense form trigger
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount.trim()) return;

    const amountNum = parseInt(expenseAmount.replace(/[^\d]/g, "")) || 0;
    const payload = {
      tripId: selectedTrip.id,
      title: expenseTitle,
      amount: amountNum,
      category: expenseCategory,
      date: "Jul 29"
    };

    createExpense(payload)
      .then(newExp => {
        setExpenses(prev => [newExp, ...prev]);
        setShowAddExpense(false);
        setExpenseTitle("");
        setExpenseAmount("");
      })
      .catch(err => {
        console.error(err);
        // Fallback local
        const localExp: Expense = {
          id: "exp-custom-" + Date.now(),
          tripId: selectedTrip.id,
          title: expenseTitle,
          amount: amountNum,
          category: expenseCategory,
          date: "Jul 29"
        };
        setExpenses(prev => [localExp, ...prev]);
        setShowAddExpense(false);
        setExpenseTitle("");
        setExpenseAmount("");
      });
  };

  // Get totals by category for breakdown lists
  const getCategoryTotal = (cat: string) => {
    let sum = 0;
    if (cat === "Flights" && checklist["flight-base"]) sum += 15400 + flightCartTotal;
    if (cat === "Hotels" && checklist["hotel-base"]) sum += 24500 + hotelCartTotal;
    if (cat === "Food" && checklist["activity-food"]) sum += 1200;
    if (cat === "Activities" && checklist["activity-tours"]) sum += 500;

    // Add custom added ones
    sum += expenses
      .filter(e => e.category === cat && e.id.startsWith("exp-custom-"))
      .reduce((acc, e) => acc + e.amount, 0);

    return sum;
  };

  return (
    <div className="w-full h-full min-h-[600px] bg-[#FBFBF9] text-[#1A1A1A] flex flex-col overflow-y-auto pb-16">
      
      {/* Navy Header & dropdown selector */}
      <div className="bg-gradient-to-b from-[#0B132B] to-[#1C2541] p-4 text-white space-y-4 shrink-0 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(#FFFFFF 0.8px, transparent 0.8px)", backgroundSize: "16px 16px" }} />
        
        <div className="flex items-center justify-between z-10 relative">
          <div className="text-left">
            <h2 className="text-lg font-serif italic font-bold">Budget Calculator</h2>
            <p className="text-[9px] font-mono text-teal-400 uppercase tracking-widest mt-0.5">
              Live Expense Vectors
            </p>
          </div>

          {/* Active Trip Selector Dropdown */}
          <select
            value={selectedTrip?.id || ""}
            onChange={(e) => {
              const tripObj = trips.find(t => t.id === e.target.value);
              if (tripObj) onSelectTrip(tripObj);
            }}
            className="bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase py-2 px-3 focus:outline-none transition shrink-0 cursor-pointer max-w-[130px] font-sans"
          >
            {trips.map(t => (
              <option key={t.id} value={t.id} className="text-slate-900 bg-white">
                {t.input.destination}
              </option>
            ))}
          </select>
        </div>

        {/* Total budget card (frosted glass) */}
        {selectedTrip && (
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-left z-10 relative space-y-3.5">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div>
                <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wider block">TOTAL ALLOCATED BUDGET</span>
                <span className="text-2xl font-black font-mono text-white">₹{calculatedTotalBudget.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-mono text-slate-350 uppercase tracking-wider block">REMAINING RESERVE</span>
                <span className="text-sm font-bold text-teal-350 font-mono">₹{currentRemainingSum.toLocaleString()}</span>
              </div>
            </div>

            {/* Spent details indicator */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-200">
              <span>LIVE TOTAL SPENT: <span className="text-[#F27D26] font-bold">₹{currentLiveSpentSum.toLocaleString()}</span></span>
              <span>{Math.round(budgetRatio)}%</span>
            </div>

            {/* Auto progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${budgetRatio > 90 ? "bg-red-500" : budgetRatio > 70 ? "bg-amber-400" : "bg-teal-400"}`}
                style={{ width: `${budgetRatio}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Budget content */}
      <div className="p-4 space-y-6">
        
        {/* Smart Calculator Checklist (Checkboxes) */}
        <div className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-4.5 text-left space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1A1A1A]/5">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/50">
              SMART CALCULATOR CHECKLIST
            </h4>
            <span className="text-[8px] font-mono uppercase bg-[#F27D26]/10 text-[#F27D26] px-1.5 rounded font-bold">LIVE SYNC</span>
          </div>

          <div className="space-y-3">
            {/* 1. Base Flights checkbox */}
            <div
              onClick={() => toggleChecklist("flight-base")}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div className="mt-0.5 text-slate-500 hover:text-[#F27D26] shrink-0">
                {checklist["flight-base"] ? (
                  <CheckSquare className="w-4.5 h-4.5 text-[#F27D26]" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between text-xs font-sans font-bold text-slate-800 leading-tight">
                  <span className="truncate">Initial flight booking reference</span>
                  <span className="font-mono text-[#F27D26]">₹{(15400 + flightCartTotal).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-normal">Sector route transport connectivity.</p>
              </div>
            </div>

            {/* 2. Base Hotel checkbox */}
            <div
              onClick={() => toggleChecklist("hotel-base")}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div className="mt-0.5 text-slate-500 hover:text-[#F27D26] shrink-0">
                {checklist["hotel-base"] ? (
                  <CheckSquare className="w-4.5 h-4.5 text-[#F27D26]" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between text-xs font-sans font-bold text-slate-800 leading-tight">
                  <span className="truncate">The Taj Palace suite accommodation</span>
                  <span className="font-mono text-[#F27D26]">₹{(24500 + hotelCartTotal).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-normal">Premium room sector security deposit.</p>
              </div>
            </div>

            {/* 3. Food activity checklist */}
            <div
              onClick={() => toggleChecklist("activity-food")}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div className="mt-0.5 text-slate-500 hover:text-[#F27D26] shrink-0">
                {checklist["activity-food"] ? (
                  <CheckSquare className="w-4.5 h-4.5 text-[#F27D26]" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between text-xs font-sans font-bold text-slate-800 leading-tight">
                  <span>Culinary budget (Leopold Cafe + Local treats)</span>
                  <span className="font-mono text-[#F27D26]">₹1,200</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-normal">Gourmet hospitality allowances.</p>
              </div>
            </div>

            {/* 4. Attractions checklist */}
            <div
              onClick={() => toggleChecklist("activity-tours")}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div className="mt-0.5 text-slate-500 hover:text-[#F27D26] shrink-0">
                {checklist["activity-tours"] ? (
                  <CheckSquare className="w-4.5 h-4.5 text-[#F27D26]" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-300" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between text-xs font-sans font-bold text-slate-800 leading-tight">
                  <span>Gateway historic guided tour activity</span>
                  <span className="font-mono text-[#F27D26]">₹500</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-normal">Entrance fares & spatial guide fee.</p>
              </div>
            </div>
          </div>

          {/* Connective shortcuts button */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1A1A1A]/5">
            <button
              onClick={() => onNavigate("flights")}
              className="py-2 px-3 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] text-[9px] font-sans font-black uppercase tracking-wider rounded-xl transition duration-150 text-center"
            >
              Find Cheaper Flights
            </button>
            <button
              onClick={() => onNavigate("hotels")}
              className="py-2 px-3 bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] text-[9px] font-sans font-black uppercase tracking-wider rounded-xl transition duration-150 text-center"
            >
              Compare Hotels
            </button>
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 text-left">
            CATEGORY EXPENDITURE MATRIX
          </h4>

          <div className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-4.5 space-y-3.5 text-left shadow-sm">
            {[
              { name: "Flights", icon: "✈️", total: getCategoryTotal("Flights"), percentage: selectedTrip ? Math.round((getCategoryTotal("Flights") / calculatedTotalBudget) * 100) : 35 },
              { name: "Hotels", icon: "🏨", total: getCategoryTotal("Hotels"), percentage: selectedTrip ? Math.round((getCategoryTotal("Hotels") / calculatedTotalBudget) * 100) : 48 },
              { name: "Food", icon: "🍜", total: getCategoryTotal("Food"), percentage: 2 },
              { name: "Activities", icon: "🎭", total: getCategoryTotal("Activities"), percentage: 1 },
              { name: "Shopping", icon: "🛍️", total: getCategoryTotal("Shopping"), percentage: 0 }
            ].map((catObj) => (
              <div key={catObj.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-sans font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span>{catObj.icon}</span>
                    <span>{catObj.name}</span>
                  </div>
                  <span className="font-mono text-[#F27D26]">₹{catObj.total.toLocaleString()}</span>
                </div>
                {/* Visual Category Sub-percentage bar */}
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${catObj.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add customized expense form inline */}
        {showAddExpense ? (
          <form onSubmit={handleAddExpense} className="bg-white border border-[#1A1A1A]/10 rounded-2xl p-4.5 text-left space-y-3.5 shadow-sm">
            <span className="text-[9px] font-mono font-bold text-[#F27D26] uppercase block">LOG NEW CUSTOM EXPENDITURE</span>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Traditional Souvenir Shop"
                  className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e: any) => setExpenseCategory(e.target.value)}
                    className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition cursor-pointer font-sans text-slate-850"
                  >
                    <option value="Food">Food 🍜</option>
                    <option value="Flights">Flights ✈️</option>
                    <option value="Hotels">Hotels 🏨</option>
                    <option value="Activities">Activities 🎭</option>
                    <option value="Shopping">Shopping 🛍️</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[#1A1A1A]/50 uppercase font-mono mb-1">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full bg-[#1A1A1A]/5 rounded-xl border border-transparent focus:border-[#F27D26] outline-none text-xs p-2.5 transition font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1.5">
              <button
                type="submit"
                className="flex-1 bg-[#0D9488] hover:bg-teal-700 text-white py-2.5 rounded-xl text-[10px] font-sans font-black uppercase tracking-wider transition cursor-pointer text-center"
              >
                LOG EXPENSE
              </button>
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#1A1A1A] rounded-xl text-[10px] font-sans font-black uppercase tracking-wider transition cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddExpense(true)}
            className="w-full py-3.5 border-2 border-dashed border-[#1A1A1A]/15 hover:border-[#F27D26]/50 bg-white hover:bg-[#FBFBF9] rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition duration-200 text-xs font-sans font-bold text-[#1A1A1A]/50 hover:text-[#F27D26]"
          >
            <Plus className="w-4 h-4" /> Add Expense Log
          </button>
        )}

      </div>
    </div>
  );
}
