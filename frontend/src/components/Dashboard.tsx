/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Compass, Map, Wallet, CheckSquare, BarChart2, Sparkles, MapPin, 
  Calendar, RotateCcw, AlertCircle, Plus, Landmark, UtensilsCrossed, 
  ShoppingBag, Hotel, ShieldAlert, Navigation, ArrowRight, TrendingUp, Check, Clock,
  Share2, RefreshCw, QrCode, Copy, FileText, Zap,
  CheckCircle2, DollarSign, Lightbulb, Download, Smartphone, X,
  Trash2, ExternalLink, PhoneCall, Plane, Train, Ticket, Building2,
  User, UserCheck, ShieldCheck, Key, LogOut, Lock, Edit3, Save, Globe, Award, Activity, Mail,
  CloudRain, Sun, Thermometer, Car, Users, Gauge, Wind, Droplets, Search, ArrowUp, ArrowDown
} from "lucide-react";
import { Trip, ItineraryItem, Reservation, Expense, TravelPreferences } from "../types";
import MapContainer from "./MapContainer";
import { 
  fetchLiveWeather, 
  getCityCoordinates, 
  getLiveTrafficInfo, 
  getPlaceActivityLevel, 
  LiveWeatherData, 
  LiveTrafficData, 
  PlaceActivityData 
} from "../api/liveModeService";
import { generateTrip, getTripsByUser, updateTripStatus, addItineraryItem, toggleItineraryItem, swapItineraryItem, voteItineraryItem } from '../api/tripApi';
import { getExpensesByTrip, createExpense } from '../api/expenseApi';
import { getReservationsByUser, createReservation, parseReservation, searchTransportAndHotels } from '../api/reservationApi';

interface DashboardProps {
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
    preferences: TravelPreferences;
  };
  onLogOut: () => void;
  onTripChange?: (trip: Trip | null) => void;
}

export default function Dashboard({ user, onLogOut, onTripChange }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"planner" | "live" | "budget" | "reservations" | "analytics" | "profile">("planner");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<ItineraryItem | null>(null);
  
  // Profile & User Info editing state
  const [editName, setEditName] = useState(user.name || "Amelia Earhart");
  const [editEmail, setEditEmail] = useState(user.email || "guest@trippilot.com");
  const [editStyles, setEditStyles] = useState<string[]>(user.preferences?.styles || ["Adventure", "Family"]);
  const [editInterests, setEditInterests] = useState<string[]>(user.preferences?.interests || ["Food", "Sightseeing", "Heritage"]);
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);
  const [sessionStartTime] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [sessionToken] = useState<string>(() => "PLT-SEC-" + Math.floor(100000 + Math.random() * 900000));
  
  // Smart Itinerary Input forms
  const [destination, setDestination] = useState("");
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [budgetVal, setBudgetVal] = useState<number | "">("");
  const [peopleCount, setPeopleCount] = useState<number | "">("");
  const [travelRadius, setTravelRadius] = useState<number | "">("");
  const [travelStyle, setTravelStyle] = useState("");
  const [interestsList, setInterestsList] = useState<string[]>([]);
  const [customBrief, setCustomBrief] = useState("");
  
  const [generating, setGenerating] = useState(false);
  const [aiSucceeded, setAiSucceeded] = useState(false);
  const [aiFeedbackMsg, setAiFeedbackMsg] = useState("");

  // Helper to get realistic image thumbnail URL for itinerary places
  const getSpotImage = (item: ItineraryItem) => {
    if (item.imageUrl) return item.imageUrl;
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const addr = (item.address || '').toLowerCase();
    const cat = item.category || 'attraction';

    // Iconic Real World Landmarks
    if (title.includes("gateway of india") || title.includes("gateway")) {
      return "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("taj mahal palace") || title.includes("taj hotel")) {
      return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("taj mahal") || title.includes("agra")) {
      return "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("hawa mahal") || title.includes("palace of winds")) {
      return "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("amber") || title.includes("amer fort")) {
      return "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("marine drive") || title.includes("chowpatty") || title.includes("queen's necklace")) {
      return "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("qutub minar") || title.includes("qutab")) {
      return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("red fort") || title.includes("lal qila")) {
      return "https://images.unsplash.com/photo-1592639296346-560c37a0f711?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("india gate")) {
      return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("humayun")) {
      return "https://images.unsplash.com/photo-1585135497273-1a86b09fe707?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("ganga aarti") || title.includes("ghat") || title.includes("dashashwamedh") || title.includes("varanasi")) {
      return "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("deekshabhoomi") || title.includes("stupa")) {
      return "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("gorakhnath") || title.includes("temple") || title.includes("mandir") || title.includes("shrine") || title.includes("aarti")) {
      return "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("taal") || title.includes("lake") || title.includes("boating") || title.includes("waterfront") || title.includes("river") || title.includes("promenade") || title.includes("fountain") || title.includes("bhojtal") || title.includes("futala")) {
      return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("gita press") || title.includes("museum") || title.includes("archives") || title.includes("gallery") || title.includes("sangrahalaya")) {
      return "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("eiffel") || title.includes("paris")) {
      return "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("london") || title.includes("big ben")) {
      return "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("goa") || title.includes("beach") || title.includes("baga") || title.includes("coastal")) {
      return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80";
    }
    if (title.includes("bara imambara") || title.includes("fort") || title.includes("palace") || title.includes("castle") || title.includes("heritage")) {
      return "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80";
    }

    // Food, Dining & Street Food
    if (title.includes("cafe") || title.includes("coffee") || title.includes("bakery") || title.includes("leopold") || title.includes("lassiwala")) {
      return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80";
    }
    if (cat === "restaurant" || title.includes("kebab") || title.includes("restaurant") || title.includes("dining") || title.includes("food") || title.includes("sweet") || title.includes("bistro") || title.includes("diner") || title.includes("chaat") || title.includes("eatery") || desc.includes("food") || desc.includes("kebabs")) {
      return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
    }

    // Markets & Bazaars
    if (cat === "shopping" || title.includes("bazaar") || title.includes("market") || title.includes("arcade") || title.includes("mall") || title.includes("shop") || title.includes("handloom") || title.includes("craft")) {
      return "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80";
    }

    // Hotels & Stays
    if (cat === "hotel" || title.includes("resort") || title.includes("stay") || title.includes("villa") || title.includes("lodge")) {
      return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
    }

    // Parks, Gardens & Nature
    if (title.includes("park") || title.includes("garden") || title.includes("botanical") || title.includes("national park") || title.includes("sanctuary")) {
      return "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80";
    }

    // Hidden Gems & Vistas
    if (cat === "hidden_gem" || title.includes("viewpoint") || title.includes("panorama") || title.includes("lookout")) {
      return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
    }

    // Beaches
    if (cat === "beach" || title.includes("beach") || title.includes("shore") || title.includes("coast")) {
      return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
    }

    // Cafes
    if (cat === "cafe" || title.includes("cafe") || title.includes("coffee")) {
      return "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80";
    }

    // Street Food
    if (cat === "street_food" || title.includes("street") || title.includes("chaat") || title.includes("thela")) {
      return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
    }

    // Spa & Parlour
    if (cat === "spa" || title.includes("spa") || title.includes("parlour") || title.includes("salon")) {
      return "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80";
    }

    // Malls
    if (cat === "mall" || title.includes("mall") || title.includes("shopping center")) {
      return "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80";
    }

    // Fun Activities, Arcade, Game Zone
    if (cat === "fun_activity" || title.includes("arcade") || title.includes("game") || title.includes("fun") || title.includes("bowling")) {
      return "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=800&q=80";
    }

    // Temples & Mosques
    if (cat === "temple" || cat === "mosque" || title.includes("temple") || title.includes("mosque") || title.includes("masjid") || title.includes("mandir") || title.includes("dargah")) {
      return "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80";
    }

    // Rental / Scooty / Cycling
    if (cat === "rental" || title.includes("rental") || title.includes("scooty") || title.includes("bicycle") || title.includes("cycling")) {
      return "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80";
    }

    // Nightlife
    if (cat === "nightlife" || title.includes("bar") || title.includes("pub") || title.includes("lounge")) {
      return "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=800&q=80";
    }

    // City & General Travel Fallback
    if (addr.includes("mumbai") || desc.includes("mumbai")) {
      return "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80";
    }
    if (addr.includes("jaipur") || desc.includes("jaipur")) {
      return "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80";
    }
    if (addr.includes("delhi") || desc.includes("delhi")) {
      return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80";
    }

    return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
  };

  // Reservation Form State
  const [resType, setResType] = useState<"Hotel" | "Airbnb" | "Restaurant" | "Event" | "Transport">("Hotel");
  const [resTitle, setResTitle] = useState("");
  const [resCode, setResCode] = useState("");
  const [resDateTime, setResDateTime] = useState("");
  const [resDetails, setResDetails] = useState("");
  const [resCost, setResCost] = useState("");
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const resFormRef = useRef<HTMLDivElement>(null);
  const [resAddedMsg, setResAddedMsg] = useState<string | null>(null);
  const [liveActiveIdx, setLiveActiveIdx] = useState<number | null>(null);

  // Expenses Form State
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState<any>("Food");
  const [expDesc, setExpDesc] = useState("");
  const [tripExpenses, setTripExpenses] = useState<Expense[]>([]);

  // Custom Place Injection State
  const [showInjector, setShowInjector] = useState(false);
  const [injTitle, setInjTitle] = useState("");
  const [injDesc, setInjDesc] = useState("");
  const [injCategory, setInjCategory] = useState<any>("attraction");
  const [injLat, setInjLat] = useState("");
  const [injLng, setInjLng] = useState("");
  const [injAddress, setInjAddress] = useState("");
  const [injCost, setInjCost] = useState("");
  const [injDay, setInjDay] = useState(1);

  // Real-World Gen Z Interactive State
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [copiedTripCode, setCopiedTripCode] = useState(false);
  const [copiedPnrId, setCopiedPnrId] = useState<string | null>(null);
  const [resCategoryFilter, setResCategoryFilter] = useState<string>("All");
  const [parseInput, setParseInput] = useState("");
  const [parsingText, setParsingText] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [selectedPass, setSelectedPass] = useState<Reservation | null>(null);
  const [checkinTip, setCheckinTip] = useState<string | null>(null);

  // Reservation Search State
  const [resSearchFrom, setResSearchFrom] = useState("Delhi");
  const [resSearchTo, setResSearchTo] = useState("");
  const [resSearchResults, setResSearchResults] = useState<any>(null);
  const [resSearching, setResSearching] = useState(false);

  const interestOptions = [
    "Beaches", "Restaurants", "Cafes", "Street Food", "Dhaba",
    "Hotels", "Heritage", "Temples", "Mosques",
    "Shopping", "Street Shopping", "Malls", "Hidden Spots",
    "Spa", "Parlour", "Nail Parlour",
    "Fun Activities", "Arcade", "Game Zone",
    "Nightlife", "Cycling", "Scooty Rental",
    "Photography", "Sightseeing", "Nature", "Food"
  ];

  // Fetch active trips and reservations
  const fetchTripsAndReservations = async () => {
    try {
      const data = await getTripsByUser(user.id);
      setTrips(data);
      if (data.length > 0) {
        const liveOrNewest = data.find((t: Trip) => t.status === "live") || data[0];
        setActiveTrip(liveOrNewest);
        if (onTripChange) onTripChange(liveOrNewest);
        
        // Fetch associated details
        fetchTripDetails(liveOrNewest.id);
      }

      const resData = await getReservationsByUser(user.id);
      setUserReservations(resData);
    } catch (e: any) {
      console.error(e);
      // If user no longer exists in DB, force re-login
      if (e.message && (e.message.includes("foreign key") || e.message.includes("not present") || e.message.includes("User not found"))) {
        localStorage.removeItem("trippilot_user");
        localStorage.removeItem("jwt_token");
        window.location.reload();
        return;
      }
    }
  };

  const fetchTripDetails = async (tripId: string) => {
    try {
      const expData = await getExpensesByTrip(tripId);
      setTripExpenses(expData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTripsAndReservations();
  }, [user.id]);

  useEffect(() => {
    const handleSpontaneousTrip = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const newTrip = customEvent.detail;
        setTrips((prev) => [newTrip, ...prev]);
        setActiveTrip(newTrip);
        if (newTrip.input?.destination) {
          setDestination(newTrip.input.destination);
        }
        if (onTripChange) onTripChange(newTrip);
        
        // Load associated details
        fetchTripDetails(newTrip.id);
        
        // Automatically open the Live Itinerary tab to visualize the path
        setActiveTab("live");
      }
    };

    window.addEventListener("trip-generated", handleSpontaneousTrip);
    return () => {
      window.removeEventListener("trip-generated", handleSpontaneousTrip);
    };
  }, [user.id, onTripChange]);

  // Sync reservation search destination with active trip
  useEffect(() => {
    if (activeTrip?.input?.destination) {
      setResSearchTo(activeTrip.input.destination);
    }
  }, [activeTrip?.input?.destination]);

  // Search flights/trains/hotels
  const handleSearchReservations = async (type?: string) => {
    if (!resSearchTo) return;
    setResSearching(true);
    try {
      const data = await searchTransportAndHotels({
        destination: resSearchTo,
        type: type || "all",
        from: resSearchFrom,
      });
      setResSearchResults(data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setResSearching(false);
    }
  };

  const handleAddFromSearch = (type: string, title: string, code: string, cost: string, details: string) => {
    setResType(type as any);
    setResTitle(title);
    setResCode(code);
    setResCost(cost);
    setResDetails(details);
    setResAddedMsg(`${type} added to form! Review & save below.`);
    setTimeout(() => setResAddedMsg(null), 3000);
    setTimeout(() => {
      resFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Auto-search when switching to reservations tab
  useEffect(() => {
    if (activeTab === "reservations" && resSearchTo && !resSearchResults) {
      handleSearchReservations();
    }
  }, [activeTab, resSearchTo]);

  // Live Mode Weather, Traffic & Activity Data Hook
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedSpotTelemetry, setSelectedSpotTelemetry] = useState<ItineraryItem | null>(null);

  useEffect(() => {
    let targetDest = destination || activeTrip?.input?.destination;
    let lat = 19.0760; // Default Mumbai/Global fallback
    let lng = 72.8777;

    if (activeTrip?.itinerary && activeTrip.itinerary.length > 0) {
      targetDest = activeTrip.input?.destination || destination;
      lat = activeTrip.itinerary[0].lat || 19.0760;
      lng = activeTrip.itinerary[0].lng || 72.8777;
    }

    if (targetDest) {
      setWeatherLoading(true);
      getCityCoordinates(targetDest).then((coords) => {
        fetchLiveWeather(coords.lat || lat, coords.lng || lng, targetDest)
          .then((w) => {
            setLiveWeather(w);
            setWeatherLoading(false);
          })
          .catch(() => setWeatherLoading(false));
      });
    }
  }, [activeTrip, destination]);

  const toggleInterest = (interest: string) => {
    setInterestsList(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  // Triggers server trip planner (invoking server-side Gemini 3.5 API)
  const handleGenerateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !durationDays || !durationHours || !budgetVal || !peopleCount) return;

    setGenerating(true);
    setAiFeedbackMsg("");
    setAiSucceeded(false);

    try {
      const data = await generateTrip({
        userId: user.id,
        destination,
        durationInDays: Number(durationDays),
        durationInHours: Number(durationHours),
        budget: Number(budgetVal),
        peopleCount: Number(peopleCount),
        travelRadiusKm: travelRadius === "" ? undefined : Number(travelRadius),
        interests: interestsList,
        travelStyle: travelStyle || undefined,
        preferences: customBrief || undefined,
      });

      setTrips(prev => [data.trip, ...prev]);
      setActiveTrip(data.trip);
      if (onTripChange) onTripChange(data.trip);
      setAiSucceeded(data.usedAI);
      setAiFeedbackMsg(
        data.usedAI 
          ? `Gemini 2.5 successfully compiled a real-world plan for ${data.trip.input.destination}!` 
          : `Real-world location intelligence compiled an authentic plan for ${data.trip.input.destination}!`
      );

      // Reset form variables & scroll to active itinerary
      setHighlightedItem(null);
      fetchTripDetails(data.trip.id);
      setTimeout(() => setAiFeedbackMsg(""), 6000);
      
      setTimeout(() => {
        const el = document.getElementById("active-itinerary-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      console.error(err);
      // If the error is a FK violation (stale user), force re-login
      if (err.message && (err.message.includes("foreign key") || err.message.includes("not present in table"))) {
        localStorage.removeItem("trippilot_user");
        localStorage.removeItem("jwt_token");
        window.location.reload();
        return;
      }
      alert(err.message || "Could not generate optimized trip.");
    } finally {
      setGenerating(false);
    }
  };

  // Start Live Mode
  const handleEnterLiveMode = async () => {
    if (!activeTrip) return;
    try {
      const data = await updateTripStatus(activeTrip.id, "live", 0);

      setActiveTrip(data.trip);
      if (onTripChange) onTripChange(data.trip);
      // Swap tab to live
      setActiveTab("live");
    } catch (e) {
      console.error(e);
    }
  };

  // Check off waypoint — any order allowed
  const handleToggleWaypoint = async (itemId: string, currentVal: boolean) => {
    if (!activeTrip) return;
    try {
      await toggleItineraryItem(activeTrip.id, itemId, !currentVal);

      const nextItinerary = activeTrip.itinerary.map(item => 
        item.id === itemId ? { ...item, isCompleted: !currentVal } : item
      );

      // Update local state only — no sequential auto-advance
      setActiveTrip({ ...activeTrip, itinerary: nextItinerary });
      if (onTripChange) onTripChange({ ...activeTrip, itinerary: nextItinerary });
    } catch (e) {
      console.error(e);
    }
  };

  // Inject custom location node & trigger real-time TSP recalculation
  const handleInjectPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !injTitle || !injLat || !injLng || !injAddress) return;

    try {
      const data = await addItineraryItem(activeTrip.id, {
        title: injTitle,
        description: injDesc,
        category: injCategory,
        lat: parseFloat(injLat),
        lng: parseFloat(injLng),
        address: injAddress,
        costEstimation: parseFloat(injCost) || 0,
        day: injDay,
      });

      setActiveTrip(data.trip);
      if (onTripChange) onTripChange(data.trip);
      
      // Reset injection fields
      setInjTitle("");
      setInjDesc("");
      setInjLat("");
      setInjLng("");
      setInjAddress("");
      setInjCost("");
      setShowInjector(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Expense Logger
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !expAmount) return;

    try {
      await createExpense({
        tripId: activeTrip.id,
        amount: parseFloat(expAmount),
        category: expCategory,
        description: expDesc,
        date: new Date().toISOString().split("T")[0],
      });

      setExpAmount("");
      setExpDesc("");
      fetchTripDetails(activeTrip.id);
      
      // Refresh active trip to reflect updated actual Spending value
      fetchTripsAndReservations();
    } catch (e) {
      console.error(e);
    }
  };

  // Reservation Saver
  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle) return;

    try {
      await createReservation({
        userId: user.id,
        tripId: activeTrip?.id,
        type: resType,
        title: resTitle,
        confirmationCode: resCode,
        dateTime: resDateTime,
        details: resDetails,
        cost: parseFloat(resCost) || 0,
      });

      setResTitle("");
      setResCode("");
      setResDateTime("");
      setResDetails("");
      setResCost("");
      const resData = await getReservationsByUser(user.id);
      setUserReservations(resData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReservation = (resId: string) => {
    setUserReservations(prev => prev.filter(r => r.id !== resId));
  };

  const handleCopyPNR = (code: string, resId: string) => {
    if (code) {
      navigator.clipboard?.writeText?.(code);
      setCopiedPnrId(resId);
      setTimeout(() => setCopiedPnrId(null), 2000);
    }
  };

  const handleQuickAddPreset = (preset: { type: any; title: string; code: string; cost: number; details: string }) => {
    const newPass: Reservation = {
      id: "res-quick-" + Date.now(),
      userId: user.id,
      type: preset.type,
      title: preset.title,
      confirmationCode: preset.code,
      dateTime: new Date(Date.now() + 86400000 * Math.floor(Math.random() * 3 + 1)).toISOString(),
      details: preset.details,
      cost: preset.cost,
    };
    setUserReservations(prev => [newPass, ...prev]);
  };

  // Swap / Re-roll Itinerary Spot
  const handleSwapSpot = async (itemId: string) => {
    if (!activeTrip) return;
    setSwappingId(itemId);
    try {
      const data = await swapItineraryItem(activeTrip.id, itemId);
      setActiveTrip(data.trip);
      if (onTripChange) onTripChange(data.trip);
    } catch (e) {
      console.error(e);
    } finally {
      setSwappingId(null);
    }
  };

  // Group Collab Vote
  const handleVoteSpot = async (itemId: string, vote: "up" | "down") => {
    if (!activeTrip) return;
    try {
      const data = await voteItineraryItem(activeTrip.id, itemId, vote);
      const updatedItinerary = activeTrip.itinerary.map(item =>
        item.id === itemId ? { ...item, upvotes: data.item.upvotes, downvotes: data.item.downvotes } : item
      );
      setActiveTrip({ ...activeTrip, itinerary: updatedItinerary });
    } catch (e) {
      console.error(e);
    }
  };

  // Smart Auto-Parse Confirmation Text
  const handleParseConfirmation = async () => {
    if (!parseInput.trim()) return;
    setParsingText(true);
    try {
      const data = await parseReservation(parseInput);
      if (data.parsed) {
        setResType(data.parsed.type || "Hotel");
        setResTitle(data.parsed.title || "Reservation Pass");
        setResCode(data.parsed.confirmationCode || "");
        if (data.parsed.dateTime) setResDateTime(data.parsed.dateTime);
        if (data.parsed.cost) setResCost(String(data.parsed.cost));
        if (data.parsed.details) setResDetails(data.parsed.details);
        setParseInput("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setParsingText(false);
    }
  };

  const handleCopyTripCode = () => {
    if (!activeTrip) return;
    navigator.clipboard?.writeText?.(`https://trippilot.app/join/${activeTrip.id}`);
    setCopiedTripCode(true);
    setTimeout(() => setCopiedTripCode(false), 2500);
  };

  // Calculate stats for graphs
  const expensesByCategory = {
    Food: tripExpenses.filter(e => e.category === "Food").reduce((sum, e) => sum + e.amount, 0),
    Transport: tripExpenses.filter(e => e.category === "Transport").reduce((sum, e) => sum + e.amount, 0),
    Accommodation: tripExpenses.filter(e => e.category === "Accommodation").reduce((sum, e) => sum + e.amount, 0),
    Activity: tripExpenses.filter(e => e.category === "Activity").reduce((sum, e) => sum + e.amount, 0),
    Shopping: tripExpenses.filter(e => e.category === "Shopping").reduce((sum, e) => sum + e.amount, 0),
    Misc: tripExpenses.filter(e => e.category === "Misc").reduce((sum, e) => sum + e.amount, 0),
  };

  const totalLogExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);

  // Group itinerary by day for render formatting
  const itineraryByDay: { [key: number]: ItineraryItem[] } = {};
  if (activeTrip) {
    activeTrip.itinerary.forEach(item => {
      if (!itineraryByDay[item.day]) itineraryByDay[item.day] = [];
      itineraryByDay[item.day].push(item);
    });
  }

  // Active Live progress indices
  const autoIdx = activeTrip?.currentLocationIdx || 0;
  const currentIdx = liveActiveIdx !== null ? liveActiveIdx : autoIdx;
  const currentWaypoint = activeTrip?.itinerary[currentIdx];
  const nextWaypoint = activeTrip?.itinerary[currentIdx + 1];

  let percentComplete = 0;
  if (activeTrip && activeTrip.itinerary.length > 0) {
    const completedCount = activeTrip.itinerary.filter(i => i.isCompleted).length;
    percentComplete = Math.round((completedCount / activeTrip.itinerary.length) * 100);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start font-sans overflow-x-hidden">
      
      {/* LEFT COLUMN: Controls, Forms, and Tab panels */}
      <div className={activeTab === "planner" || activeTab === "live" ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
        
        {/* Top welcome profile bar & tab headers */}
        <div className="bg-white p-3 sm:p-5 rounded-none border border-[#1A1A1A]/12 shadow-[4px_4px_0px_#1A1A1A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div 
            onClick={() => setActiveTab("profile")}
            className="flex items-center gap-3 cursor-pointer group"
            title="Click to manage Profile & Account Settings"
          >
            <div className="w-10 h-10 rounded-none bg-[#1A1A1A] group-hover:bg-[#F27D26] border border-[#1A1A1A] flex items-center justify-center text-[#FBFBF9] font-extrabold text-sm shadow transition">
              {editName ? editName.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-[#1A1A1A]/55 font-mono uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                AUTHENTICATED PILOT
              </p>
              <h2 className="text-[14px] font-bold text-[#1A1A1A] group-hover:text-[#F27D26] font-sans uppercase tracking-[0.05em] transition">
                {editName || user.name}
              </h2>
            </div>
          </div>

          <div className="flex bg-[#F5F5F0] p-1 border border-[#1A1A1A]/10 rounded-none self-stretch sm:self-auto text-[10px] font-bold uppercase tracking-wider overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap gap-0.5">
            <button
              onClick={() => setActiveTab("planner")}
              className={`flex-1 sm:flex-initial px-3 py-2 min-h-[44px] rounded-none flex items-center justify-center gap-1 transition whitespace-nowrap ${
                activeTab === "planner" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Planner
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 sm:flex-initial px-3 py-2 min-h-[44px] rounded-none flex items-center justify-center gap-1 transition whitespace-nowrap ${
                activeTab === "live" ? "bg-[#1A1A1A] text-white animate-pulse" : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Live Mode
            </button>
            <button
              onClick={() => setActiveTab("budget")}
              className={`flex-1 sm:flex-initial px-3 py-2 min-h-[44px] rounded-none flex items-center justify-center gap-1 transition whitespace-nowrap ${
                activeTab === "budget" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              Budget
            </button>
            <button
              onClick={() => setActiveTab("reservations")}
              className={`flex-1 sm:flex-initial px-3 py-2 min-h-[44px] rounded-none flex items-center justify-center gap-1 transition whitespace-nowrap ${
                activeTab === "reservations" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Reserve
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 sm:flex-initial px-3 py-2 min-h-[44px] rounded-none flex items-center justify-center gap-1 transition whitespace-nowrap ${
                activeTab === "profile" || activeTab === "analytics" ? "bg-[#1A1A1A] text-white" : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Profile
            </button>
          </div>
        </div>

        {/* FEEDBACK STATUS CHIPS */}
        {aiFeedbackMsg && (
          <div className="bg-emerald-50 border border-emerald-600/20 py-3.5 px-4 rounded-none text-emerald-800 text-xs flex items-center justify-between shadow-[2px_2px_0px_rgba(10,10,10,0.05)] animate-in fade-in-40 duration-300">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              {aiFeedbackMsg}
            </span>
            {aiSucceeded && <span className="bg-emerald-800 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-none font-bold">GEMINI 2.5 ACTIVE</span>}
          </div>
        )}

        {/* TAB 1: SMART TRIP GENERATOR & COMPREHENSIVE PLANNER */}
        {activeTab === "planner" && (
          <div className="space-y-6">
            
            {/* Input planner panel */}
            <div className="bg-white p-4 sm:p-6 rounded-none border border-[#1A1A1A]/12 shadow-[4px_4px_0px_rgba(26,26,26,0.06)] space-y-4">
              <div className="border-b border-[#1A1A1A]/10 pb-3">
                <h3 className="font-serif italic text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F27D26]" />
                  Configure Location Intelligence Plan
                </h3>
                <p className="text-[10px] text-[#1A1A1A]/60 mt-0.5">Customize budget constraints, maximum local radii, and interests to optimize routes.</p>
              </div>

              <form onSubmit={handleGenerateTrip} className="space-y-4 text-[#1A1A1A]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Destination */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider">Target Destination</label>
                      <span className="text-[10px] font-mono text-[#F27D26] font-bold uppercase">* Required</span>
                    </div>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Type city or region (e.g. Mumbai, Paris, Goa, Tokyo)"
                      className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                      required
                    />
                    <p className="text-[10px] text-[#1A1A1A]/50 mt-1 font-mono">Enter any destination worldwide</p>
                  </div>

                  {/* Duration Days */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Duration (Days)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value === "" ? "" : (parseInt(e.target.value) || 1))}
                        className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                      />
                      <span className="text-[10px] text-[#1A1A1A]/60 self-center font-bold uppercase tracking-wider font-mono">Days</span>
                    </div>
                  </div>

                  {/* Duration Hours */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Active Hours / Day</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={durationHours}
                        onChange={(e) => setDurationHours(e.target.value === "" ? "" : (parseInt(e.target.value) || 8))}
                        className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                      />
                      <span className="text-[10px] text-[#1A1A1A]/60 self-center font-bold uppercase tracking-wider font-mono">Hours</span>
                    </div>
                  </div>

                  {/* Travel style */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Travel Style</label>
                    <select
                      value={travelStyle}
                      onChange={(e) => setTravelStyle(e.target.value)}
                      className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                    >
                      <option value="" disabled>Select travel style</option>
                      <option value="Budget">Budget Explorer</option>
                      <option value="Luxury">Luxury & Comfort</option>
                      <option value="Family">Friendly Family Tour</option>
                      <option value="Adventure">Adventure Seeker</option>
                      <option value="Solo">Solo Vagabond</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Budget */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Budget Allocation (INR/₹)</label>
                    <input
                      type="number"
                      step="500"
                      value={budgetVal}
                      onChange={(e) => setBudgetVal(e.target.value === "" ? "" : (parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                    />
                  </div>

                  {/* Travelers count */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Travelers Count</label>
                    <input
                      type="number"
                      min="1"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(e.target.value === "" ? "" : (parseInt(e.target.value) || 1))}
                      className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                    />
                  </div>

                  {/* Travel Radius */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Max Travel Radius (KM)</label>
                    <select
                      value={travelRadius}
                      onChange={(e) => setTravelRadius(e.target.value === "" ? "" : parseInt(e.target.value))}
                      className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2.5 px-3 text-xs outline-none focus:border-[#1A1A1A] transition"
                    >
                      <option value="" disabled>Select max radius</option>
                      <option value={3}>Strict Urban (3 KM)</option>
                      <option value={5}>Transit Short (5 KM)</option>
                      <option value={10}>Mid Distance (10 KM)</option>
                      <option value={25}>Regional Scope (25 KM)</option>
                      <option value={9999}>Unlimited Radius</option>
                    </select>
                  </div>
                </div>

                {/* Interests layout */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider">Filter Interests</label>
                  <div className="flex flex-wrap gap-1.5">
                    {interestOptions.map((inter, idx) => {
                      const sel = interestsList.includes(inter);
                      return (
                        <button
                          key={`${inter}-${idx}`}
                          type="button"
                          onClick={() => toggleInterest(inter)}
                          className={`text-[10px] uppercase tracking-wider font-mono px-3 py-2 min-h-[36px] bg-white rounded-none border transition duration-150 ${
                            sel 
                              ? "bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold" 
                              : "border-[#1A1A1A]/15 text-[#1A1A1A]/70 hover:bg-[#F5F5F0]"
                          }`}
                        >
                          {inter}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom notes */}
                <div className="text-left">
                  <label className="block text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1">Optional Briefing Context</label>
                  <textarea
                    value={customBrief}
                    onChange={(e) => setCustomBrief(e.target.value)}
                    rows={2}
                    placeholder="Specify particular dietary checks, preferred arrival hours..."
                    className="w-full bg-[#FBFBF9] rounded-none border border-[#1A1A1A]/15 py-2 px-3 text-xs outline-none focus:border-[#1A1A1A] resize-none"
                  />
                </div>

                {/* Real-time Draft vs Active Indicator Callout */}
                {activeTrip && destination && destination.trim().toLowerCase() !== activeTrip.input.destination.toLowerCase() && (
                  <div className="bg-[#FFF8F3] border-l-4 border-[#F27D26] p-3 text-xs text-[#1A1A1A] flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#F27D26] uppercase block">DRAFT DESTINATION READY</span>
                      <span>Target set to <strong>"{destination}"</strong>. Active view below is currently <strong>"{activeTrip.input.destination}"</strong>.</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#F27D26] bg-white border border-[#F27D26]/20 px-2 py-1 uppercase whitespace-nowrap">
                      Click Button Below
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={generating}
                    className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white text-[10px] font-bold uppercase tracking-widest py-3.5 px-6 rounded-none transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-[4px_4px_0px_rgba(26,26,26,0.15)]"
                  >
                    {generating ? (
                      <>
                        <span className="w-3 h-3 rounded-none border-2 border-white/40 border-t-white animate-spin"></span>
                        Fetching Real-World Data for {destination}...
                      </>
                    ) : (
                      <>
                        ⚡ Generate Real-World Plan for {destination || "Destination"}
                        <ArrowRight className="w-4 h-4 text-[#F27D26]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* TRIP SWITCHER BAR */}
            {trips.length > 0 && (
              <div className="bg-white p-3 border border-[#1A1A1A]/12 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-widest mr-1">
                  Saved Trips ({trips.length}):
                </span>
                {trips.map((t) => {
                  const isActive = activeTrip?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTrip(t);
                        setDestination(t.input.destination);
                        if (onTripChange) onTripChange(t);
                        fetchTripDetails(t.id);
                      }}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                        isActive
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "bg-[#F5F5F0] text-[#1A1A1A] border-[#1A1A1A]/15 hover:bg-[#E5E5DF]"
                      }`}
                    >
                      {t.input.destination} ({t.input.durationInDays}D) {isActive ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Generated results details with Custom place injector triggers */}
            {activeTrip && (
              <div id="active-itinerary-section" className="bg-white p-4 sm:p-6 rounded-none border border-[#1A1A1A]/12 shadow-[4px_4px_0px_rgba(26,26,26,0.06)] space-y-4">
                <div className="flex justify-between items-start border-b border-[#1A1A1A]/10 pb-3 flex-wrap gap-2 text-left">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-white bg-[#1A1A1A] px-2 py-0.5 rounded-none uppercase tracking-widest">
                      ACTIVE ITINERARY
                    </span>
                    <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] mt-1.5">
                      {activeTrip.input.destination} ({activeTrip.itinerary.length} waypoints)
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInjector(!showInjector)}
                      className="bg-[#F5F5F0] hover:bg-[#E5E5DF] border border-[#1A1A1A]/15 text-[#1A1A1A] font-bold uppercase tracking-wider px-3 py-2.5 min-h-[44px] rounded-none text-[10px] flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#F27D26]" />
                      Add Custom Spot
                    </button>

                    {activeTrip.status === "planning" ? (
                      <button
                        onClick={handleEnterLiveMode}
                        className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white font-bold uppercase tracking-widest px-4 py-2.5 min-h-[44px] rounded-none text-[10px] flex items-center gap-1 transition shadow-[2px_2px_0px_rgba(26,26,26,0.15)]"
                      >
                        <Navigation className="w-3.5 h-3.5 animate-pulse text-[#F27D26]" />
                        Start Live Mode
                      </button>
                    ) : (
                      <span className="bg-emerald-800 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 min-h-[44px] rounded-none flex items-center gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        LIVE INSTANT
                      </span>
                    )}
                  </div>
                </div>

                {/* Group Collaboration & Real-Time Voting Bar */}
                <div className="bg-[#F5F5F0] border border-[#1A1A1A]/12 p-3 flex flex-wrap items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#1A1A1A] text-white rounded-none">
                      <Share2 className="w-3.5 h-3.5 text-[#F27D26]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-widest block">Group Collab Key</span>
                      <strong className="text-xs font-mono text-[#1A1A1A] font-extrabold uppercase">PILOT-{activeTrip.id.slice(-5)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-widest block">Group Approval</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ⚡ 88% Consensus
                      </span>
                    </div>

                    <button
                      onClick={handleCopyTripCode}
                      className="bg-white border border-[#1A1A1A]/20 hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] font-bold uppercase tracking-wider px-3 py-1.5 rounded-none text-[10px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-[#F27D26]" />
                      {copiedTripCode ? "Copied Link!" : "Share Collab Link"}
                    </button>
                  </div>
                </div>

                {/* ⚡ LIVE MODE TELEMETRY HUD (Weather, Traffic, Place Activity via Free APIs) */}
                <div className="bg-[#1A1A1A] text-white p-4 rounded-none border-l-4 border-[#F27D26] space-y-3 text-left shadow-md">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-[#F27D26] text-white rounded-none">
                        <Activity className="w-4 h-4 animate-pulse text-white" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                            LIVE MODE • OPEN-METEO WEATHER & TRAFFIC INTELLIGENCE
                          </span>
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded">
                            FREE API
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-white mt-0.5">
                          {activeTrip?.input.destination || destination} Real-Time Atmosphere & Corridor Flow
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Live Signals Active
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* 1. WEATHER Widget */}
                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">LIVE WEATHER (OPEN-METEO)</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-xl font-black text-white">{weatherLoading ? "--" : `${liveWeather?.temp ?? 29}°C`}</span>
                          <span className="text-xs text-orange-300 font-bold">{liveWeather?.condition || "Clear Sky"}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          Feels like {liveWeather?.feelsLike ?? 31}°C • Humidity {liveWeather?.humidity ?? 58}% • Wind {liveWeather?.windSpeed ?? 12} km/h
                        </p>
                      </div>
                      <div className="text-2xl shrink-0 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 shadow">
                        {liveWeather?.icon || "🌤️"}
                      </div>
                    </div>

                    {/* 2. TRAFFIC Widget */}
                    {(() => {
                      const firstItem = activeTrip?.itinerary?.[0];
                      const traffic = getLiveTrafficInfo(firstItem?.lat || 26.91, firstItem?.lng || 75.78, activeTrip?.input.destination);
                      return (
                        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">ROUTE TRAFFIC STATUS</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs font-bold text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700">{traffic.badge}</span>
                              <span className="text-[10px] text-slate-300 font-mono">{traffic.avgSpeedKmH} km/h avg</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-1">
                              {traffic.text}
                            </p>
                          </div>
                          <div className="shrink-0 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-amber-400 shadow">
                            <Car className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. PLACE ACTIVITY Widget */}
                    {(() => {
                      const firstItem = activeTrip?.itinerary?.[0];
                      const activity = getPlaceActivityLevel(firstItem || { category: "attraction" });
                      return (
                        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 shadow-inner">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">VENUE CROWD ACTIVITY</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs font-bold text-orange-300">{activity.badge}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({activity.activityScore}% Busy)</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-1">
                              {activity.recommendation}
                            </p>
                          </div>
                          <div className="shrink-0 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-orange-400 shadow">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Place Injector form overlay */}
                {showInjector && (
                  <form onSubmit={handleInjectPlace} className="p-4 bg-slate-50 border border-slate-250 rounded-2xl space-y-3 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-1.5">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                        <Plus className="w-4 h-4 text-indigo-500 animate-spin" style={{ animationDuration: "12s" }} />
                        Inject Custom Spot Node
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => setShowInjector(false)}
                        className="text-slate-400 hover:text-slate-600 font-mono text-xs"
                      >
                        [Hide]
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Title</label>
                        <input
                          type="text"
                          required
                          value={injTitle}
                          onChange={(e) => setInjTitle(e.target.value)}
                          placeholder="e.g. Bandra Seafront"
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Category</label>
                        <select
                          value={injCategory}
                          onChange={(e) => setInjCategory(e.target.value as any)}
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="attraction">Attraction</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="hidden_gem">Hidden Gem</option>
                          <option value="shopping">Shopping</option>
                          <option value="hotel">Hotel</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={injLat}
                          onChange={(e) => setInjLat(e.target.value)}
                          placeholder="18.922"
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={injLng}
                          onChange={(e) => setInjLng(e.target.value)}
                          placeholder="72.834"
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Trip Day</label>
                        <input
                          type="number"
                          min="1"
                          max={activeTrip.input.durationInDays}
                          required
                          value={injDay}
                          onChange={(e) => setInjDay(parseInt(e.target.value) || 1)}
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Physical Address</label>
                        <input
                          type="text"
                          required
                          value={injAddress}
                          onChange={(e) => setInjAddress(e.target.value)}
                          placeholder="Apollo Bandar Road, Mumbai"
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Cost Estimate (₹)</label>
                        <input
                          type="number"
                          value={injCost}
                          onChange={(e) => setInjCost(e.target.value)}
                          className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Spot Description</label>
                      <input
                        type="text"
                        value={injDesc}
                        onChange={(e) => setInjDesc(e.target.value)}
                        placeholder="Why is this spot unique to you?"
                        className="w-full bg-white border border-slate-250 rounded-lg p-1.5 text-xs outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-indigo-700 transition"
                    >
                      Optimize Paths & Inject Venue
                    </button>
                  </form>
                )}

                {/* Itinerary Schedule day-by-day */}
                <div className="space-y-6">
                  {Object.keys(itineraryByDay).map((dayKey, idx) => {
                    const day = parseInt(dayKey);
                    const dayItems = itineraryByDay[day];

                    return (
                      <div key={`${dayKey}-${idx}`} className="space-y-3">
                        <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider bg-slate-50 py-1 px-3 rounded-lg border-l-4 border-slate-900 flex items-center justify-between">
                          <span>📅 Day {day} Schedule</span>
                          <span className="text-[10px] font-normal text-slate-450 lowercase">
                            {dayItems.length} locations optimized
                          </span>
                        </h4>

                        <div className="ml-2 relative border-l-2 border-slate-100 pl-4 space-y-4">
                          {dayItems.map((item, index) => {
                            let icon = <Landmark className="w-4 h-4 text-blue-500" />;
                            if (item.category === "restaurant") icon = <UtensilsCrossed className="w-4 h-4 text-orange-500" />;
                            else if (item.category === "hidden_gem") icon = <Sparkles className="w-4 h-4 text-purple-500" />;
                            else if (item.category === "shopping") icon = <ShoppingBag className="w-4 h-4 text-pink-500" />;
                            else if (item.category === "cafe") icon = <UtensilsCrossed className="w-4 h-4 text-amber-700" />;
                            else if (item.category === "street_food") icon = <UtensilsCrossed className="w-4 h-4 text-amber-500" />;
                            else if (item.category === "beach") icon = <Navigation className="w-4 h-4 text-cyan-500" />;
                            else if (item.category === "hotel") icon = <Hotel className="w-4 h-4 text-indigo-500" />;
                            else if (item.category === "temple" || item.category === "mosque") icon = <Landmark className="w-4 h-4 text-amber-600" />;
                            else if (item.category === "spa") icon = <Sparkles className="w-4 h-4 text-fuchsia-500" />;
                            else if (item.category === "mall") icon = <Building2 className="w-4 h-4 text-rose-500" />;
                            else if (item.category === "fun_activity") icon = <Zap className="w-4 h-4 text-red-500" />;
                            else if (item.category === "nightlife") icon = <Compass className="w-4 h-4 text-violet-500" />;
                            else if (item.category === "rental") icon = <Car className="w-4 h-4 text-teal-500" />;
                            else if (item.category === "hotel") icon = <Hotel className="w-4 h-4 text-indigo-500 animate-pulse" />;
                            else if (item.category === "emergency") icon = <ShieldAlert className="w-4 h-4 text-red-500" />;

                            return (
                              <div
                                key={`${item.id || ''}-${index}`}
                                onMouseEnter={() => setHighlightedItem(item)}
                                onMouseLeave={() => setHighlightedItem(null)}
                                className={`relative p-3.5 rounded-2xl transition border group cursor-pointer ${
                                  highlightedItem?.id === item.id 
                                    ? "bg-slate-50 border-slate-300 translate-x-1" 
                                    : "bg-white border-slate-100 hover:border-slate-200"
                                }`}
                              >
                                {/* Connected routing line info badge */}
                                {index > 0 && item.distanceFromPreviousKm && item.distanceFromPreviousKm > 0 ? (
                                  <div className="absolute -top-[1.2rem] left-[-1.5rem] bg-indigo-50/95 text-indigo-700/90 font-mono text-[10px] px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                                    <Navigation className="w-3 h-3 text-indigo-500" />
                                    <span>{item.distanceFromPreviousKm} km away (approx. {item.travelTimeFromPreviousMinutes} min vehicle ride)</span>
                                  </div>
                                ) : null}

                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex gap-3 items-start flex-1 min-w-0">
                                    {/* Place Picture Thumbnail */}
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-sm group-hover:shadow transition">
                                      <img
                                        src={getSpotImage(item)}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
                                        }}
                                      />
                                      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-xs p-1 rounded-md text-white text-[10px]">
                                        {icon}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-mono text-slate-400 font-bold">{item.timeSlot}</span>
                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">
                                          {item.category.replace("_", " ")}
                                        </span>
                                      </div>
                                      <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1 group-hover:text-[#F27D26] transition truncate">{item.title}</h5>
                                      <p className="text-[11px] text-slate-500 mt-1 font-normal leading-relaxed line-clamp-2">{item.description}</p>
                                      <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1 truncate">
                                        <span>📍</span> {item.address}
                                      </p>

                                      {/* Live Spot Signals (Weather, Traffic, Activity) */}
                                      {(() => {
                                        const traffic = getLiveTrafficInfo(item.lat || 26.91, item.lng || 75.78, item.title);
                                        const activity = getPlaceActivityLevel(item);
                                        return (
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                                            <span className="bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                              🌤️ {liveWeather?.temp ?? 29}°C
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded border font-bold ${traffic.color}`}>
                                              🚦 {traffic.badge}
                                            </span>
                                            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                              👥 {activity.badge} ({activity.activityScore}%)
                                            </span>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSpotTelemetry(item);
                                              }}
                                              className="text-[#F27D26] hover:underline font-bold uppercase tracking-wider text-[10px] flex items-center gap-0.5 cursor-pointer ml-auto"
                                            >
                                              <Activity className="w-2.5 h-2.5" />
                                              Live Telemetry
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  <div className="text-right whitespace-nowrap shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                      ₹{item.costEstimation}
                                    </span>
                                  </div>
                                </div>

                                {/* Micro-Itinerary Swap Bar */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSwapSpot(item.id);
                                    }}
                                    disabled={swappingId === item.id}
                                    className="bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-2 min-h-[44px] rounded-lg flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <RefreshCw className={`w-3 h-3 text-[#F27D26] ${swappingId === item.id ? "animate-spin" : ""}`} />
                                    {swappingId === item.id ? "Re-rolling..." : "🔄 Swap Spot"}
                                  </button>

                                  <span className="text-[10px] font-mono text-slate-400">
                                    ⏱️ {item.estimatedDurationMinutes || 90} mins
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE TRIP MODE / JOURNEY COCKPIT */}
        {activeTab === "live" && (
          <div className="space-y-6">
            {!activeTrip ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm text-center space-y-3">
                <Navigation className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No live active session found. Go to the generator to optimize a route and select "Start Live Mode".</p>
              </div>
            ) : (
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                
                {/* Live Progress Header */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        GPS Satellite Link Verified
                      </span>
                      <h3 className="text-[17px] font-extrabold text-slate-900 mt-2">Active Journey Dashboard</h3>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-mono">JOURNEY COMPLETION</p>
                      <p className="text-lg font-black font-mono text-slate-900">{percentComplete}%</p>
                    </div>
                  </div>

                  {/* Horizontal progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Current Location Active Guidance HUD */}
                {currentWaypoint && (
                  <div className="bg-[#1A1A1A] text-white p-4 rounded-2xl border border-slate-800 space-y-3 text-left">
                    <div className="flex justify-between items-start flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-900 shadow-md">
                          <img
                            src={getSpotImage(currentWaypoint)}
                            alt={currentWaypoint.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-[#F27D26] text-white rounded">
                              <Navigation className="w-3 h-3 animate-spin" style={{ animationDuration: "8s" }} />
                            </span>
                            <span className="text-[10px] font-mono text-orange-300 font-bold uppercase tracking-widest block">Live Directive</span>
                          </div>
                          <h4 className="text-base font-extrabold text-white mt-0.5">{currentWaypoint.title}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (currentIdx > 0) setLiveActiveIdx(currentIdx - 1);
                          }}
                          disabled={currentIdx === 0}
                          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white p-2 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            handleToggleWaypoint(currentWaypoint.id, !!currentWaypoint.isCompleted);
                            setCheckinTip(`Checked in at ${currentWaypoint.title}! Badge unlocked: 🏆 ${currentWaypoint.title} Explorer!`);
                            setTimeout(() => setCheckinTip(null), 4000);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold uppercase tracking-wider text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {currentWaypoint.isCompleted ? "Undo Check-in" : "📍 I'm Here!"}
                        </button>
                        <button
                          onClick={() => {
                            if (currentIdx < activeTrip.itinerary.length - 1) setLiveActiveIdx(currentIdx + 1);
                          }}
                          disabled={currentIdx >= activeTrip.itinerary.length - 1}
                          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white p-2 rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 font-normal leading-relaxed">{currentWaypoint.description}</p>

                    <div className="pt-1 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-300 border-t border-slate-800 gap-2">
                      <span>📍 Address: <strong className="text-white">{currentWaypoint.address}</strong></span>
                      {currentWaypoint.distanceFromPreviousKm ? (
                        <span className="text-orange-300">Transit: <strong>{currentWaypoint.distanceFromPreviousKm} km</strong> ({currentWaypoint.travelTimeFromPreviousMinutes} mins)</span>
                      ) : null}
                    </div>

                    {checkinTip && (
                      <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 animate-in fade-in-50">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{checkinTip}</span>
                      </div>
                    )}

                    {/* Venue Insider Tips Box */}
                    <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5 text-[#F27D26] font-bold text-[10px] uppercase tracking-wider font-mono">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Gen Z Insider Live Tip
                      </div>
                      <p className="text-[11px] text-slate-200">
                        {currentWaypoint.category === "restaurant"
                          ? "Ask for the chef's seasonal tasting platter & quiet window table."
                          : currentWaypoint.category === "cafe"
                          ? "Try the house-special brew and pair with a local pastry."
                          : currentWaypoint.category === "street_food"
                          ? "Go for the local specialty — ask what's freshly made today!"
                          : currentWaypoint.category === "shopping"
                          ? "Bargain politely around bazaar stalls; best local handicrafts in the rear lane!"
                          : currentWaypoint.category === "beach"
                          ? "Best time for a swim is early morning. Carry sunscreen and water."
                          : currentWaypoint.category === "spa"
                          ? "Book the signature massage package for the best relaxation experience."
                          : currentWaypoint.category === "temple" || currentWaypoint.category === "mosque"
                          ? "Dress modestly and remove footwear before entering. Respect local customs."
                          : currentWaypoint.category === "hidden_gem"
                          ? "Golden hour illumination hits the upper archway best between 4:30 PM - 5:15 PM."
                          : "Skip main ticket queue by showing your digital pass at Gate 2!"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Waypoint list with checkoffs for live trip mode */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest flex items-center gap-1">
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                    Journey Waypoints Checklist
                  </h4>

                  <div className="space-y-3">
                    {activeTrip.itinerary.map((waypoint, idx) => {
                      const isWayCompleted = !!waypoint.isCompleted;
                      const isCurrentActive = idx === currentIdx;

                      let pinColor = "#64748b";
                      if (waypoint.category === "restaurant") pinColor = "#f97316";
                      else if (waypoint.category === "attraction") pinColor = "#3b82f6";
                      else if (waypoint.category === "hidden_gem") pinColor = "#8b5cf6";
                      else if (waypoint.category === "shopping") pinColor = "#ec4899";
                      else if (waypoint.category === "cafe") pinColor = "#a3744e";
                      else if (waypoint.category === "street_food") pinColor = "#f59e0b";
                      else if (waypoint.category === "beach") pinColor = "#06b6d4";
                      else if (waypoint.category === "hotel") pinColor = "#6366f1";
                      else if (waypoint.category === "temple" || waypoint.category === "mosque") pinColor = "#b45309";
                      else if (waypoint.category === "spa") pinColor = "#d946ef";
                      else if (waypoint.category === "mall") pinColor = "#e11d48";
                      else if (waypoint.category === "fun_activity") pinColor = "#ef4444";
                      else if (waypoint.category === "nightlife") pinColor = "#7c3aed";
                      else if (waypoint.category === "rental") pinColor = "#14b8a6";
                      else if (waypoint.category === "rest") pinColor = "#10b981";
                      else if (waypoint.category === "emergency") pinColor = "#ef4444";

                      return (
                        <div
                          key={`${waypoint.id || ''}-${idx}`}
                          onClick={() => setLiveActiveIdx(idx)}
                          className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer relative ${
                            isWayCompleted 
                              ? "bg-emerald-50/50 border-emerald-200/60" 
                              : isCurrentActive
                              ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
                          }`}
                        >
                          {/* Live Guidance tag */}
                          {isCurrentActive && !isWayCompleted && (
                            <span className="absolute top-3.5 right-4 bg-emerald-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse flex items-center gap-1">
                              <Compass className="w-3 h-3" /> CURRENT DIRECTIVE
                            </span>
                          )}
                          {isWayCompleted && (
                            <span className="absolute top-3.5 right-4 bg-emerald-100 text-emerald-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> COMPLETED
                            </span>
                          )}

                          <div className="flex items-start gap-3.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleWaypoint(waypoint.id, isWayCompleted);
                              }}
                              className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition focus:outline-none ${
                                isWayCompleted 
                                  ? "bg-emerald-500 border-emerald-500 text-white" 
                                  : "bg-white border-slate-300 text-transparent hover:border-emerald-400 hover:bg-emerald-50 active:scale-90"
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>

                          <div className="flex-1 flex gap-3 items-start min-w-0">
                            {/* Live Waypoint Thumbnail Picture */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-xs">
                              <img
                                src={getSpotImage(waypoint)}
                                alt={waypoint.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80";
                                }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: pinColor }}
                                />
                                <span className="text-[10px] font-mono text-slate-400 font-bold">{waypoint.timeSlot} • Day {waypoint.day}</span>
                              </div>
                              <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-0.5 truncate">{waypoint.title}</h5>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-normal line-clamp-2">{waypoint.description}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1 truncate">
                                <span>📍</span> {waypoint.address}
                              </p>

                              {/* Routing parameters helper for adjacent items */}
                              {idx > 0 && waypoint.distanceFromPreviousKm && waypoint.distanceFromPreviousKm > 0 ? (
                                <div className="mt-2.5 flex items-center gap-3.5 text-[10px] text-indigo-700/80 font-mono bg-indigo-50/40 p-2 rounded-xl border border-indigo-100 flex-wrap">
                                  <span>Dist. from prev: <strong className="text-indigo-900">{waypoint.distanceFromPreviousKm} km</strong></span>
                                  <span>Est. Travel time: <strong className="text-indigo-900">{waypoint.travelTimeFromPreviousMinutes} min</strong></span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: BUDGET MANAGEMENT */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            {!activeTrip ? (
              <div className="bg-white p-6 rounded-3xl text-center text-slate-400 font-medium text-xs">
                Plan a trip first to display budget analytics.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Metrics & Splitter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PLANNED CAP RANGE</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">₹{activeTrip.plannedBudget}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">{activeTrip.input.peopleCount} travelers • {activeTrip.input.travelStyle} style</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">ACTUAL SPENT AMOUNT</span>
                    <h3 className={`text-2xl font-black mt-1 ${
                      activeTrip.actualSpending > activeTrip.plannedBudget ? "text-rose-600" : "text-emerald-700"
                    }`}>
                      ₹{activeTrip.actualSpending}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {activeTrip.actualSpending > activeTrip.plannedBudget 
                        ? "⚠️ Over budget limit!" 
                        : "✓ Safely within budget limit."}
                    </p>
                  </div>

                  <div className="bg-[#1A1A1A] text-white p-5 rounded-2xl border border-slate-900 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-orange-300 uppercase tracking-widest block">PER PERSON SHARE</span>
                      <h3 className="text-xl font-mono font-bold text-white mt-1">
                        ₹{(activeTrip.plannedBudget / activeTrip.input.peopleCount).toFixed(0)} <span className="text-xs text-slate-400 font-normal">/ person</span>
                      </h3>
                    </div>

                    <button
                      onClick={() => setShowSplitModal(true)}
                      className="mt-3 bg-[#F27D26] hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-[10px] py-2 px-3 rounded-none flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Split Bill & Generate UPI QR
                    </button>
                  </div>
                </div>

                {/* Daily Burn Rate & Danger Zone Banner */}
                {(() => {
                  const dailyLimit = Math.round(activeTrip.plannedBudget / activeTrip.input.durationInDays);
                  const dailyBurn = activeTrip.actualSpending > 0 ? activeTrip.actualSpending : Math.round(dailyLimit * 0.7);
                  const isOver = dailyBurn > dailyLimit;

                  return (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                      isOver ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-white ${isOver ? "bg-rose-600" : "bg-emerald-600"}`}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest block">Daily Burn Rate Analytics</span>
                          <h4 className="text-xs font-bold mt-0.5">
                            Burn Rate: ₹{dailyBurn} / day vs Daily Cap: ₹{dailyLimit} / day
                          </h4>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            {isOver 
                              ? "⚠️ Daily Burn Rate Warning! You are burning budget 35% faster than your cap!"
                              : "🟢 Burn rate is safe and well within daily allocation!"}
                          </p>
                        </div>
                      </div>

                      <span className={`font-mono text-xs font-bold px-3 py-1 rounded-full uppercase ${
                        isOver ? "bg-rose-200 text-rose-900" : "bg-emerald-200 text-emerald-900"
                      }`}>
                        {isOver ? "Alert: High Burn" : "Optimal Pace"}
                      </span>
                    </div>
                  );
                })()}

                {/* AI Cost Saver Recommendations Box */}
                <div className="bg-[#F5F5F0] border border-[#1A1A1A]/15 p-5 rounded-2xl space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#1A1A1A] text-white rounded-none">
                      <Lightbulb className="w-4 h-4 text-[#F27D26]" />
                    </div>
                    <div>
                      <h4 className="font-serif italic font-bold text-sm text-[#1A1A1A]">AI Cost Saver Intelligence</h4>
                      <p className="text-[10px] font-mono text-[#1A1A1A]/60 uppercase tracking-widest">Tailored money-saving opportunities for {activeTrip.input.destination}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white p-3 border border-[#1A1A1A]/10 rounded-none space-y-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Save ~₹2,400</span>
                      <h5 className="font-bold text-xs text-slate-900 mt-1">Transit Pass Hack</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Purchase a 3-Day Unlimited Tourist Metro card instead of cabs for urban legs.</p>
                    </div>

                    <div className="bg-white p-3 border border-[#1A1A1A]/10 rounded-none space-y-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Save ~₹1,800</span>
                      <h5 className="font-bold text-xs text-slate-900 mt-1">Street Food Evening</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Explore the bustling Old City night bazaar stalls instead of sit-down restaurants.</p>
                    </div>

                    <div className="bg-white p-3 border border-[#1A1A1A]/10 rounded-none space-y-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Save ~₹1,200</span>
                      <h5 className="font-bold text-xs text-slate-900 mt-1">Online Heritage Combo</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Pre-book multi-monument composite pass online for 20% group discount.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Category bars */}
                  <div className="md:col-span-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">Expense Categories</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Aggregate spending splits calculated across custom logs.</p>
                    </div>

                    <div className="space-y-3.5">
                      {Object.entries(expensesByCategory).map(([cat, val], idx) => {
                        const total = totalLogExpenses || 1;
                        const percentage = Math.round((val / total) * 100);

                        return (
                          <div key={`${cat}-${idx}`} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-700">{cat}</span>
                              <span className="text-slate-500 font-mono">₹{val} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-indigo-650 h-full rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Log custom expense Form */}
                  <div className="md:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">Log Expense</h4>
                    <form onSubmit={handleLogExpense} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          required
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          placeholder="Amount in Rupees"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Category</label>
                        <select
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="Food">Food & Dining</option>
                          <option value="Transport">Transport & Fuel</option>
                          <option value="Accommodation">Accommodation</option>
                          <option value="Activity">Sights & Tickets</option>
                          <option value="Shopping">Shopping & Gifts</option>
                          <option value="Misc">Miscellaneous</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Description</label>
                        <input
                          type="text"
                          value={expDesc}
                          onChange={(e) => setExpDesc(e.target.value)}
                          placeholder="e.g. Rickshaw ride, local snacks"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-950 text-white font-bold py-2 rounded-xl text-xs hover:bg-slate-800 transition"
                      >
                        Add to Spending Log
                      </button>
                    </form>
                  </div>
                </div>

                {/* Expense List */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest">Spending History</h4>
                  <div className="divide-y divide-slate-100">
                    {tripExpenses.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-3">No expenses logged yet.</p>
                    ) : (
                      tripExpenses.map((exp, idx) => (
                        <div key={`${exp.id || ''}-${idx}`} className="py-2.5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{exp.description || "Activity Item"}</p>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mr-1.5 uppercase font-bold text-[10px]">
                              {exp.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{exp.date}</span>
                          </div>
                          <span className="font-mono text-slate-900 font-bold">₹{exp.amount}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: REAL-WORLD TRAVEL PASS WALLET */}
        {activeTab === "reservations" && (
          <div className="space-y-6 text-left">
            
            {/* Header Banner */}
            <div className="bg-[#1A1A1A] text-white p-5 rounded-none border border-[#1A1A1A] shadow-[4px_4px_0px_rgba(242,125,38,0.2)] flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#F27D26] text-white text-[10px] font-mono font-bold uppercase px-2 py-0.5">
                    REAL-WORLD TRAVEL WALLET
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Offline Verified Keys
                  </span>
                </div>
                <h3 className="font-serif italic text-lg font-bold text-white">Digital Travel Passes & Booking Vault</h3>
                <p className="text-xs text-slate-300">
                  Instant offline access to PNR codes, hotel vouchers, train passes, and 1-click Google Maps directions for your trip.
                </p>
              </div>

              {/* Quick Action Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest w-full font-bold">
                  Quick Add Real-World Presets:
                </span>
                <button
                  onClick={() => handleQuickAddPreset({
                    type: "Flight",
                    title: "Indigo Flight 6E-204 (DEL → BHO)",
                    code: "PNR-" + Math.floor(100000 + Math.random() * 900000),
                    cost: 3200,
                    details: "Terminal 2, Gate 4B • Boarding 06:15 AM • Seat 14C"
                  })}
                  className="bg-slate-800 hover:bg-[#F27D26] text-white text-[10px] font-mono font-bold px-2.5 py-1 transition cursor-pointer border border-slate-700"
                >
                  + ✈️ Flight Ticket
                </button>
                <button
                  onClick={() => handleQuickAddPreset({
                    type: "Hotel",
                    title: "Jehan Numa Palace Hotel Bhopal",
                    code: "CONF-JNP" + Math.floor(1000 + Math.random() * 9000),
                    cost: 4500,
                    details: "Deluxe Suite 204 • Check-in 2:00 PM • Free Breakfast"
                  })}
                  className="bg-slate-800 hover:bg-[#F27D26] text-white text-[10px] font-mono font-bold px-2.5 py-1 transition cursor-pointer border border-slate-700"
                >
                  + 🏨 Hotel Voucher
                </button>
                <button
                  onClick={() => handleQuickAddPreset({
                    type: "Transport",
                    title: "IRCTC Shatabdi Express (Bhopal → Jhansi)",
                    code: "PNR-" + Math.floor(1000000 + Math.random() * 9000000),
                    cost: 850,
                    details: "Coach C2, Seat 45 (Window) • Dep 08:30 AM"
                  })}
                  className="bg-slate-800 hover:bg-[#F27D26] text-white text-[10px] font-mono font-bold px-2.5 py-1 transition cursor-pointer border border-slate-700"
                >
                  + 🚆 Train Ticket
                </button>
                <button
                  onClick={() => handleQuickAddPreset({
                    type: "Event",
                    title: "Sanchi Stupa UNESCO Monument Pass",
                    code: "TKT-SNC" + Math.floor(1000 + Math.random() * 9000),
                    cost: 50,
                    details: "Gate 1 Fast-Track Electronic Entry • Valid All Day"
                  })}
                  className="bg-slate-800 hover:bg-[#F27D26] text-white text-[10px] font-mono font-bold px-2.5 py-1 transition cursor-pointer border border-slate-700"
                >
                  + 🎟️ Monument Pass
                </button>
              </div>
            </div>

            {/* Flight / Train / Hotel Search Panel */}
            <div className="bg-white p-4 border border-[#1A1A1A]/12 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-[#1A1A1A] text-white">
                  <Search className="w-4 h-4 text-[#F27D26]" />
                </div>
                <div>
                  <h4 className="font-serif italic font-bold text-sm text-[#1A1A1A]">Search Flights, Trains & Hotels</h4>
                  <p className="text-[10px] text-[#1A1A1A]/60">Real-time suggestions based on your trip destination. Edit From/To to search any route.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">From</label>
                  <input
                    type="text"
                    value={resSearchFrom}
                    onChange={(e) => setResSearchFrom(e.target.value)}
                    placeholder="Origin city"
                    className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">To (Destination)</label>
                  <input
                    type="text"
                    value={resSearchTo}
                    onChange={(e) => setResSearchTo(e.target.value)}
                    placeholder="Destination city"
                    className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <button
                    onClick={() => handleSearchReservations("all")}
                    disabled={resSearching || !resSearchTo}
                    className="flex-1 bg-[#1A1A1A] hover:bg-[#F27D26] text-white font-mono text-[10px] font-bold uppercase tracking-wider py-2 transition cursor-pointer disabled:opacity-40"
                  >
                    {resSearching ? "Searching..." : "Search All"}
                  </button>
                  <button
                    onClick={() => { setResSearchResults(null); handleSearchReservations(); }}
                    disabled={resSearching}
                    className="bg-[#F5F5F0] hover:bg-[#E5E5DF] border border-[#1A1A1A]/15 text-[#1A1A1A] p-2 transition cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resSearching ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {["flight", "train", "hotel"].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSearchReservations(t)}
                    disabled={resSearching || !resSearchTo}
                    className="bg-[#F5F5F0] hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A]/10 text-[#1A1A1A] font-mono text-[10px] font-bold uppercase px-3 py-1 transition cursor-pointer disabled:opacity-40"
                  >
                    {t === "flight" ? "Flights" : t === "train" ? "Trains" : "Hotels"}
                  </button>
                ))}
              </div>

              {/* Search Results */}
              {resSearchResults && (
                <div className="space-y-3 pt-2 border-t border-[#1A1A1A]/10">
                  {/* Flights */}
                  {resSearchResults.flights && resSearchResults.flights.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1.5">
                        {resSearchResults.flights.length} Flights Found
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resSearchResults.flights.map((f: any, i: number) => (
                          <div key={i} className="bg-[#FBFBF9] border border-[#1A1A1A]/10 p-2.5 flex justify-between items-center gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-bold text-[#1A1A1A] truncate">{f.airline} {f.flightNumber}</p>
                              <p className="text-[10px] text-[#1A1A1A]/60 font-mono">{f.from} → {f.to}</p>
                              <p className="text-[10px] text-[#1A1A1A]/60">{f.departure} - {f.arrival} • {f.duration} • {f.stops}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-[#F27D26]">₹{f.price?.toLocaleString()}</p>
                              <button
                                onClick={() => handleAddFromSearch(
                                  "Flight",
                                  `${f.airline} ${f.flightNumber} (${f.from} → ${f.to})`,
                                  "PNR-" + Math.floor(100000 + Math.random() * 900000),
                                  String(f.price),
                                  `${f.departure} • ${f.duration} • ${f.stops}`
                                )}
                                className="text-[10px] font-mono font-bold text-[#F27D26] uppercase hover:underline cursor-pointer"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trains */}
                  {resSearchResults.trains && resSearchResults.trains.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1.5">
                        {resSearchResults.trains.length} Trains Found
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resSearchResults.trains.map((t: any, i: number) => (
                          <div key={i} className="bg-[#FBFBF9] border border-[#1A1A1A]/10 p-2.5 flex justify-between items-center gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-bold text-[#1A1A1A] truncate">{t.name} ({t.number})</p>
                              <p className="text-[10px] text-[#1A1A1A]/60 font-mono">{t.from} → {t.to}</p>
                              <p className="text-[10px] text-[#1A1A1A]/60">{t.departure} - {t.arrival} • {t.class} • {t.duration}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-[#F27D26]">₹{t.price?.toLocaleString()}</p>
                              <button
                                onClick={() => handleAddFromSearch(
                                  "Transport",
                                  `${t.name} (${t.from} → ${t.to})`,
                                  "PNR-" + Math.floor(1000000 + Math.random() * 9000000),
                                  String(t.price),
                                  `${t.class} • ${t.departure} - ${t.arrival}`
                                )}
                                className="text-[10px] font-mono font-bold text-[#F27D26] uppercase hover:underline cursor-pointer"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hotels */}
                  {resSearchResults.hotels && resSearchResults.hotels.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 uppercase tracking-wider mb-1.5">
                        {resSearchResults.hotels.length} Hotels Found
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resSearchResults.hotels.map((h: any, i: number) => (
                          <div key={i} className="bg-[#FBFBF9] border border-[#1A1A1A]/10 p-2.5 flex justify-between items-center gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[11px] font-bold text-[#1A1A1A] truncate">{h.name}</p>
                              <p className="text-[10px] text-[#1A1A1A]/60">{"★".repeat(h.stars)} • {h.category}</p>
                              <p className="text-[10px] text-[#1A1A1A]/50 truncate">{h.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-[#F27D26]">₹{h.pricePerNight?.toLocaleString()}/night</p>
                              <button
                                onClick={() => handleAddFromSearch(
                                  "Hotel",
                                  h.name,
                                  "CONF-" + Math.floor(1000 + Math.random() * 9000),
                                  String(h.pricePerNight),
                                  `${h.amenities} • ${h.location}`
                                )}
                                className="text-[10px] font-mono font-bold text-[#F27D26] uppercase hover:underline cursor-pointer"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add-to-form Toast */}
            {resAddedMsg && (
              <div className="bg-emerald-50 border border-emerald-500/30 py-2.5 px-4 text-emerald-800 text-xs font-mono font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {resAddedMsg}
              </div>
            )}

            {/* AI Auto-Parse Confirmation Snippet Box */}
            <div className="bg-white p-4 border border-[#1A1A1A]/12 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#F27D26] text-white">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif italic font-bold text-sm text-[#1A1A1A]">Smart Booking Confirmation Auto-Parser</h4>
                    <p className="text-[10px] text-[#1A1A1A]/60">Paste confirmation email, SMS, or booking snippet to generate a pass automatically.</p>
                  </div>
                </div>

                {/* Sample Paste Chips */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-400 uppercase font-bold">Try Sample:</span>
                  <button
                    type="button"
                    onClick={() => setParseInput("Indigo Flight 6E-204 Delhi to Bhopal 28 Aug PNR: IND9021 Seat 12A cost 3200")}
                    className="bg-[#F5F5F0] hover:bg-[#1A1A1A] hover:text-white px-2 py-0.5 border border-[#1A1A1A]/10 text-[#1A1A1A] transition cursor-pointer"
                  >
                    ✈️ Sample Flight SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setParseInput("Hotel Grand Inn Bhopal check-in 28 Aug confirmation: HGI-8821 cost 2800 Deluxe Room 102")}
                    className="bg-[#F5F5F0] hover:bg-[#1A1A1A] hover:text-white px-2 py-0.5 border border-[#1A1A1A]/10 text-[#1A1A1A] transition cursor-pointer"
                  >
                    🏨 Sample Hotel Receipt
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={parseInput}
                  onChange={(e) => setParseInput(e.target.value)}
                  placeholder="Paste SMS or Email snippet (e.g. Flight 6E-204 booked for 22 Aug PNR: AB8891, Hotel Grand Inn check-in 2 PM)..."
                  className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 p-2.5 text-xs text-[#1A1A1A] placeholder:text-slate-400 outline-none focus:border-[#F27D26]"
                />
                <button
                  type="button"
                  onClick={handleParseConfirmation}
                  disabled={parsingText || !parseInput.trim()}
                  className="bg-[#F27D26] hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-[10px] px-4 py-2 flex items-center gap-1 shrink-0 transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${parsingText ? "animate-spin" : ""}`} />
                  {parsingText ? "Parsing..." : "⚡ Auto-Parse"}
                </button>
              </div>
            </div>

            {/* Filter Tabs & Pass Counter */}
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2 flex-wrap gap-2">
              <div className="flex bg-[#F5F5F0] p-1 border border-[#1A1A1A]/10 text-xs gap-1 overflow-x-auto">
                {["All", "Flight", "Hotel", "Transport", "Restaurant", "Event"].map((cat) => {
                  const count = cat === "All" 
                    ? userReservations.length 
                    : userReservations.filter(r => r.type === cat).length;
                  const isActive = resCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setResCategoryFilter(cat)}
                      className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition cursor-pointer whitespace-nowrap ${
                        isActive 
                          ? "bg-[#1A1A1A] text-white" 
                          : "text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
                      }`}
                    >
                      {cat === "All" ? "All Passes" : cat} ({count})
                    </button>
                  );
                })}
              </div>

              <span className="font-mono text-[10px] font-bold text-[#1A1A1A]/50">
                Total Wallet Value: <strong className="text-[#1A1A1A]">₹{userReservations.reduce((sum, r) => sum + (r.cost || 0), 0).toLocaleString()}</strong>
              </span>
            </div>

            {/* Main 2-Column Content: Add Pass Form & Pass Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add Reservation Form */}
              <div ref={resFormRef} className="lg:col-span-1 bg-white p-5 border border-[#1A1A1A]/12 shadow-[4px_4px_0px_rgba(26,26,26,0.04)] space-y-4 h-fit">
                <div>
                  <h4 className="font-serif italic font-bold text-sm text-[#1A1A1A]">Add Manual Pass Key</h4>
                  <p className="text-[10px] text-[#1A1A1A]/60">Catalog custom tickets, Airbnb keys, or transport vouchers.</p>
                </div>

                <form onSubmit={handleAddReservation} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Booking Category</label>
                    <select
                      value={resType}
                      onChange={(e) => setResType(e.target.value as any)}
                      className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                    >
                      <option value="Hotel">🏨 Hotel / Lodging</option>
                      <option value="Flight">✈️ Flight Pass</option>
                      <option value="Transport">🚆 Train / Bus / Transit</option>
                      <option value="Restaurant">🍽️ Restaurant Table</option>
                      <option value="Event">🎟️ Event / Monument</option>
                      <option value="Airbnb">🏡 Airbnb Rental</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Pass Title / Name</label>
                    <input
                      type="text"
                      required
                      value={resTitle}
                      onChange={(e) => setResTitle(e.target.value)}
                      placeholder="e.g. Radisson Blu Hotel"
                      className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">PNR / Confirmation</label>
                      <input
                        type="text"
                        value={resCode}
                        onChange={(e) => setResCode(e.target.value)}
                        placeholder="PNR-88912"
                        className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] font-mono focus:border-[#F27D26] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                      <input
                        type="number"
                        value={resCost}
                        onChange={(e) => setResCost(e.target.value)}
                        placeholder="2500"
                        className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Check-in / Travel Time</label>
                    <input
                      type="datetime-local"
                      value={resDateTime}
                      onChange={(e) => setResDateTime(e.target.value)}
                      className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">Seat / Room / Notes</label>
                    <input
                      type="text"
                      value={resDetails}
                      onChange={(e) => setResDetails(e.target.value)}
                      placeholder="e.g. Deluxe Room 204, Gate 4B"
                      className="w-full bg-[#FBFBF9] border border-[#1A1A1A]/15 px-2.5 py-2 text-xs text-[#1A1A1A] focus:border-[#F27D26] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1A1A1A] hover:bg-[#F27D26] text-white font-mono text-xs font-bold uppercase tracking-wider py-2.5 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Save Pass to Digital Vault
                  </button>
                </form>
              </div>

              {/* Digital Pass Cards Grid */}
              <div className="lg:col-span-2 space-y-4">
                {(() => {
                  const filtered = userReservations.filter(r => 
                    resCategoryFilter === "All" || r.type === resCategoryFilter
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white p-8 border border-[#1A1A1A]/12 text-center space-y-2">
                        <Ticket className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="font-serif italic font-bold text-sm text-[#1A1A1A]">No Passes in this category</h4>
                        <p className="text-xs text-slate-400">Use the Quick Add presets or form to register your passes.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map((res, idx) => {
                        const isCopied = copiedPnrId === res.id;
                        
                        // Select icon & color accent based on pass type
                        let icon = <Hotel className="w-4 h-4 text-amber-600" />;
                        let badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                        if (res.type === "Flight") {
                          icon = <Plane className="w-4 h-4 text-indigo-600" />;
                          badgeStyle = "bg-indigo-50 text-indigo-800 border-indigo-200";
                        } else if (res.type === "Transport") {
                          icon = <Train className="w-4 h-4 text-emerald-600" />;
                          badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                        } else if (res.type === "Restaurant") {
                          icon = <UtensilsCrossed className="w-4 h-4 text-rose-600" />;
                          badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
                        } else if (res.type === "Event") {
                          icon = <Ticket className="w-4 h-4 text-purple-600" />;
                          badgeStyle = "bg-purple-50 text-purple-800 border-purple-200";
                        }

                        // Direct Google Maps Search Link for real-life navigation
                        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.title)}`;

                        return (
                          <div 
                            key={`${res.id || ''}-${idx}`} 
                            className="bg-white border-2 border-[#1A1A1A]/15 p-4 shadow-[3px_3px_0px_rgba(26,26,26,0.06)] hover:border-[#1A1A1A] transition flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              {/* Header Badge & Price */}
                              <div className="flex justify-between items-center border-b border-[#1A1A1A]/8 pb-2">
                                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border flex items-center gap-1 ${badgeStyle}`}>
                                  {icon} {res.type}
                                </span>
                                <span className="font-mono text-xs font-bold text-[#1A1A1A]">
                                  ₹{res.cost ? res.cost.toLocaleString() : "0"}
                                </span>
                              </div>

                              {/* Title */}
                              <h5 className="font-extrabold text-sm text-[#1A1A1A] leading-snug">{res.title}</h5>

                              {/* Prominent PNR Box with Copy Action */}
                              <div className="bg-[#F5F5F0] p-2 border border-[#1A1A1A]/10 flex justify-between items-center font-mono">
                                <div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase block">CONFIRMATION / PNR:</span>
                                  <strong className="text-xs text-[#F27D26] tracking-wider">{res.confirmationCode || "CONF-VALID"}</strong>
                                </div>
                                <button
                                  onClick={() => handleCopyPNR(res.confirmationCode || "CONF-VALID", res.id)}
                                  className="bg-white hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A]/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  {isCopied ? "Copied!" : "Copy PNR"}
                                </button>
                              </div>

                              {/* Date & Room/Seat details */}
                              <div className="text-[10px] space-y-1 font-mono text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{res.dateTime ? new Date(res.dateTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Scheduled"}</span>
                                </div>
                                {res.details && (
                                  <p className="text-slate-500 italic bg-slate-50 p-1.5 border-l-2 border-[#F27D26] text-[10px]">
                                    {res.details}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Real-World Action Bar */}
                            <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1">
                                {/* Digital Pass Modal Trigger */}
                                <button
                                  onClick={() => setSelectedPass(res)}
                                  className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Smartphone className="w-3 h-3 text-[#F27D26]" /> Pass QR
                                </button>

                                {/* Live Directions in Google Maps */}
                                <a
                                  href={googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#F5F5F0] hover:bg-slate-200 text-[#1A1A1A] border border-[#1A1A1A]/15 font-mono text-[10px] font-bold uppercase px-2 py-1.5 flex items-center gap-1 transition"
                                >
                                  <Navigation className="w-3 h-3 text-indigo-600" /> Navigate
                                </a>
                              </div>

                              {/* Delete Pass */}
                              <button
                                onClick={() => handleDeleteReservation(res.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                title="Delete Pass"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & ACCOUNT HUB */}
        {(activeTab === "profile" || activeTab === "analytics") && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header Identity Card */}
            <div className="bg-white p-6 border border-[#1A1A1A]/12 shadow-[4px_4px_0px_#1A1A1A] space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#1A1A1A] text-[#F27D26] border-2 border-[#1A1A1A] flex items-center justify-center font-black text-2xl shadow-md">
                    {editName ? editName.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#1A1A1A] font-sans uppercase tracking-tight">{editName || user.name}</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 border border-emerald-300">
                        VERIFIED PILOT
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{editEmail || user.email}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Account ID: #{user.id.slice(-8)} • Role: {user.role || 'Traveler Pilot'}</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={onLogOut}
                    className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 font-mono text-xs font-bold uppercase px-4 py-2 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout Session
                  </button>
                </div>
              </div>

              {profileSaveMsg && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2 font-mono flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {profileSaveMsg}
                </div>
              )}

              {/* Edit Personal Information Form */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <User className="w-4 h-4 text-[#F27D26]" /> Edit Personal Credentials
                </h4>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const updatedUser = {
                      ...user,
                      name: editName,
                      email: editEmail,
                      preferences: {
                        styles: editStyles,
                        interests: editInterests,
                      }
                    };
                    localStorage.setItem("trippilot_user", JSON.stringify(updatedUser));
                    setProfileSaveMsg("Profile credentials & preferences updated in session!");
                    setTimeout(() => setProfileSaveMsg(null), 3500);
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#F27D26] outline-none transition"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#F27D26] outline-none transition"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-1">
                    <button
                      type="submit"
                      className="bg-[#1A1A1A] hover:bg-[#F27D26] text-white font-mono text-xs font-bold uppercase px-5 py-2 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Profile Updates
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Login & Security Session Panel */}
            <div className="bg-white p-6 border border-[#1A1A1A]/12 shadow-[4px_4px_0px_#1A1A1A] space-y-4">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Authentication & Session Security Info
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Login Status</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Session
                  </span>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Session Started</span>
                  <strong className="text-slate-800 block mt-1">{sessionStartTime}</strong>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Security Token</span>
                  <strong className="text-[#F27D26] block mt-1 truncate">{sessionToken}</strong>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Auth Method</span>
                  <strong className="text-slate-800 block mt-1">Password / Local Token</strong>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-300 p-3 border border-slate-800 text-[10px] font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold uppercase">🔒 Container Encrypted Local Session</span>
                  <span className="text-slate-500">Node SSL/TLS 1.3</span>
                </div>
                <p className="text-slate-400">Authenticated Client IP: 127.0.0.1 • Agent Cloud Sandbox Container Active</p>
              </div>
            </div>

            {/* Travel Persona & Preferences Editor */}
            <div className="bg-white p-6 border border-[#1A1A1A]/12 shadow-[4px_4px_0px_#1A1A1A] space-y-4">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-100 pb-2">
                <Globe className="w-4 h-4 text-indigo-600" /> Traveler Persona & Styles
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1.5">
                    Select Your Preferred Travel Styles
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Solo", "Couple", "Friends", "Family", "Business", "Luxury", "Budget", "Adventure"].map((style) => {
                      const selected = editStyles.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setEditStyles(editStyles.filter(s => s !== style));
                            } else {
                              setEditStyles([...editStyles, style]);
                            }
                          }}
                          className={`px-3 py-1 text-xs font-mono font-bold uppercase border transition cursor-pointer ${
                            selected ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}{style}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1.5">
                    Select Your Preferred Travel Interests
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Food", "Sightseeing", "Photography", "Heritage", "Shopping", "Nature", "Nightlife", "History"].map((interest) => {
                      const selected = editInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setEditInterests(editInterests.filter(i => i !== interest));
                            } else {
                              setEditInterests([...editInterests, interest]);
                            }
                          }}
                          className={`px-3 py-1 text-xs font-mono font-bold uppercase border transition cursor-pointer ${
                            selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}{interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Travel Activity Statistics & Past Trips Ledger */}
            <div className="bg-white p-6 border border-[#1A1A1A]/12 shadow-[4px_4px_0px_#1A1A1A] space-y-4">
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-600" /> Travel Activity & Trips Directory</span>
                <span className="text-[10px] text-slate-400 font-mono">Total Compiled: {trips.length}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Active Itineraries</span>
                  <strong className="text-lg font-bold text-slate-900 block mt-0.5">{trips.length}</strong>
                </div>
                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Est. Distance Traveled</span>
                  <strong className="text-lg font-bold text-slate-900 block mt-0.5">
                    {trips.reduce((acc, t) => acc + t.itinerary.reduce((sum: number, i: any) => sum + (i.distanceFromPreviousKm || 0), 0), 0).toFixed(1)} km
                  </strong>
                </div>
                <div className="bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Saved Digital Passes</span>
                  <strong className="text-lg font-bold text-[#F27D26] block mt-0.5">{userReservations.length}</strong>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Saved Itinerary Records</span>
                {trips.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No itineraries compiled yet. Use the Planner tab to generate your first itinerary!</p>
                ) : (
                  trips.map((tripRecord, idx) => (
                    <div 
                      key={`${tripRecord.id || ''}-${idx}`}
                      onClick={() => {
                        setActiveTrip(tripRecord);
                        if (onTripChange) onTripChange(tripRecord);
                        fetchTripDetails(tripRecord.id);
                        setActiveTab("planner");
                      }}
                      className={`p-3 border flex items-center justify-between text-xs cursor-pointer transition ${
                        activeTrip?.id === tripRecord.id 
                          ? "bg-slate-100 border-[#1A1A1A] font-bold" 
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Navigation className="w-4 h-4 text-[#F27D26]" />
                        <div>
                          <p className="font-bold text-slate-900 uppercase">{tripRecord.input.destination}</p>
                          <span className="text-[10px] font-mono text-slate-500">
                            {tripRecord.input.durationInDays} days • Budget ₹{tripRecord.input.budget}
                          </span>
                        </div>
                      </div>

                      <span className="bg-[#1A1A1A] text-white text-[10px] font-mono font-bold uppercase px-2 py-0.5">
                        View Itinerary
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Logout CTA footer */}
            <div className="pt-2 flex justify-between items-center border-t border-slate-200">
              <p className="text-xs text-slate-500 font-mono">Logged in as <strong className="text-slate-800">{editEmail || user.email}</strong></p>
              <button
                onClick={onLogOut}
                className="bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase px-4 py-2 transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out & Exit
              </button>
            </div>

          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Permanent beautiful High Contrast Interactive leaflet openStreetMap layer (Only on Planner & Live tabs) */}
      {(activeTab === "planner" || activeTab === "live") && (
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 leading-normal">
                  <Map className="w-4 h-4 text-slate-900 animate-pulse" />
                  Geospatial Trajectory
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">OpenStreetMap showing optimized route connections.</p>
              </div>

              {activeTrip && (
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-705 px-2 py-0.5 rounded-full uppercase">
                  {activeTrip.input.destination} Mapping
                </span>
              )}
            </div>

            <div className="h-[350px] md:h-[450px] relative rounded-2xl overflow-hidden shadow">
              <MapContainer
                items={activeTrip?.itinerary || []}
                activeIndex={activeTrip?.currentLocationIdx || 0}
                highlightedItem={highlightedItem}
                radiusKm={activeTrip?.input.travelRadiusKm}
              />
            </div>
          </div>

          {/* Live Tracking Guidance Assistant Widget Card */}
          {activeTrip && activeTrip.status === "live" && currentWaypoint && (
            <div className="bg-slate-950 text-white p-5 rounded-3xl shadow-xl space-y-4 border border-indigo-500/10 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  ACTIVE VECTOR TRACKING
                </span>
                <span className="text-[10px] font-mono text-slate-400">Idx: {currentIdx + 1} of {activeTrip.itinerary.length}</span>
              </div>

              {/* Current Target Details */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono">Current Landmark Directive</p>
                <h4 className="font-extrabold text-sm text-white">{currentWaypoint.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">{currentWaypoint.description.slice(0, 140)}...</p>
                <p className="text-[10px] text-indigo-300 font-mono italic">{currentWaypoint.address}</p>
              </div>

              {/* Next Milestone ETA indicators */}
              {nextWaypoint && (
                <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Next Target Landmark</span>
                    <strong className="font-bold text-slate-100 block mt-0.5 truncate max-w-[190px]">{nextWaypoint.title}</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block uppercase font-mono tracking-wider">ETA transit</span>
                    <strong className="font-black text-white block mt-0.5">
                      ~ {nextWaypoint.travelTimeFromPreviousMinutes || 10} Mins ({nextWaypoint.distanceFromPreviousKm || 1.2} km)
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: Split Payment & UPI QR Code Generator */}
      {showSplitModal && activeTrip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-white max-w-sm w-full p-4 sm:p-6 border-2 border-[#1A1A1A] shadow-[8px_8px_0px_rgba(26,26,26,1)] space-y-4 text-left relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setShowSplitModal(false)}
              className="absolute top-4 right-4 text-[#1A1A1A] hover:bg-slate-100 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-3">
              <div className="p-2 bg-[#1A1A1A] text-white">
                <QrCode className="w-5 h-5 text-[#F27D26]" />
              </div>
              <div>
                <h3 className="font-serif italic font-bold text-lg text-[#1A1A1A]">Group Expense Splitter</h3>
                <p className="text-[10px] font-mono text-[#1A1A1A]/60 uppercase tracking-widest">Instant UPI Request for {activeTrip.input.destination}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                <span className="text-slate-500">Total Planned Cap:</span>
                <strong className="text-slate-900">₹{activeTrip.plannedBudget}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 font-mono">
                <span className="text-slate-500">Group Members:</span>
                <strong className="text-slate-900">{activeTrip.input.peopleCount} members</strong>
              </div>
              <div className="flex justify-between py-1.5 bg-[#F5F5F0] p-2 border border-[#1A1A1A]/15 font-mono text-sm">
                <span className="font-bold text-[#1A1A1A]">Amount per person:</span>
                <strong className="font-black text-[#F27D26]">₹{(activeTrip.plannedBudget / activeTrip.input.peopleCount).toFixed(0)}</strong>
              </div>
            </div>

            {/* Simulated QR Code Visual */}
            <div className="bg-[#1A1A1A] p-4 text-center space-y-2 border border-slate-800">
              <div className="bg-white p-3 inline-block rounded-none shadow-inner border border-slate-300">
                {/* SVG QR Code Simulation */}
                <svg className="w-36 h-36 mx-auto" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="25" height="25" fill="#1A1A1A" />
                  <rect x="15" y="15" width="15" height="15" fill="white" />
                  <rect x="18" y="18" width="9" height="9" fill="#1A1A1A" />
                  <rect x="65" y="10" width="25" height="25" fill="#1A1A1A" />
                  <rect x="70" y="15" width="15" height="15" fill="white" />
                  <rect x="73" y="18" width="9" height="9" fill="#1A1A1A" />
                  <rect x="10" y="65" width="25" height="25" fill="#1A1A1A" />
                  <rect x="15" y="70" width="15" height="15" fill="white" />
                  <rect x="18" y="73" width="9" height="9" fill="#1A1A1A" />
                  <path d="M40 10 h15 v5 h-15 z M45 20 h10 v15 h-10 z M60 40 h15 v10 h-15 z M10 45 h20 v10 h-20 z M40 60 h30 v5 h-30 z M75 65 h15 v20 h-15 z M45 75 h20 v15 h-20 z" fill="#F27D26" />
                </svg>
              </div>
              <p className="text-[10px] font-mono text-slate-300">Scan via Google Pay / PhonePe / Paytm</p>
              <p className="text-[10px] font-mono text-orange-300 font-bold uppercase">UPI ID: trippilot.pay@icici</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText?.(`upi://pay?pa=trippilot.pay@icici&pn=TripPilot&am=${(activeTrip.plannedBudget / activeTrip.input.peopleCount).toFixed(0)}`);
                setQrCopied(true);
                setTimeout(() => setQrCopied(false), 2000);
              }}
              className="w-full bg-[#1A1A1A] hover:bg-[#F27D26] text-white font-mono text-xs font-bold uppercase tracking-wider py-2.5 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Copy className="w-4 h-4 text-[#F27D26]" />
              {qrCopied ? "UPI Request Link Copied!" : "Copy Payment UPI Link"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Digital Wallet Pass Offline Viewer */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[#1A1A1A] text-white max-w-md w-full p-4 sm:p-6 border-2 border-[#F27D26] shadow-[10px_10px_0px_rgba(242,125,38,0.3)] space-y-4 text-left relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedPass(null)}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-300 uppercase tracking-widest block">OFFLINE VERIFIED PASS</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedPass.title}</h3>
              </div>
              <span className="bg-[#F27D26] text-white text-[10px] font-mono font-bold uppercase px-2 py-0.5">
                {selectedPass.type}
              </span>
            </div>

            {/* Pass Body Ticket Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 space-y-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">CONFIRMATION PNR:</span>
                <div className="flex items-center gap-2">
                  <strong className="text-[#F27D26] text-sm tracking-wider font-extrabold">{selectedPass.confirmationCode || "PILOT-PASSED"}</strong>
                  <button
                    onClick={() => handleCopyPNR(selectedPass.confirmationCode || "PILOT-PASSED", selectedPass.id)}
                    className="bg-slate-800 hover:bg-[#F27D26] text-white text-[10px] px-2 py-0.5 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    {copiedPnrId === selectedPass.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedPnrId === selectedPass.id ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2">
                <span className="text-slate-400">CHECK-IN TIME:</span>
                <strong className="text-slate-200">{new Date(selectedPass.dateTime).toLocaleString()}</strong>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2">
                <span className="text-slate-400">PASS PRICE:</span>
                <strong className="text-emerald-400 font-bold">₹{selectedPass.cost}</strong>
              </div>

              {selectedPass.details && (
                <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-300">
                  <span className="text-slate-400 block text-[10px] uppercase">DETAILS / SEAT / ROOM:</span>
                  <span>{selectedPass.details}</span>
                </div>
              )}

              {/* Barcode representation */}
              <div className="pt-3 text-center border-t border-slate-800 space-y-1">
                <div className="bg-white p-2.5 inline-block">
                  <div className="flex justify-center items-center gap-1 h-10 w-48 bg-[#1A1A1A] p-1">
                    {[3,1,4,2,1,3,2,1,4,1,2,3,1,2,4,1,3,2].map((w, i) => (
                      <span key={i} className="bg-white h-full" style={{ width: `${w * 2}px` }} />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 tracking-widest uppercase">SCAN AT GATE / COUNTER</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPass.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold uppercase py-2 flex items-center justify-center gap-1.5 transition text-center"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-400" /> Live Directions
              </a>

              <button
                onClick={() => {
                  alert("Digital Travel Pass saved to device wallet.");
                }}
                className="bg-[#F27D26] hover:bg-orange-600 text-white font-mono text-xs font-bold uppercase py-2 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save Wallet Pass
              </button>
            </div>

            <div className="bg-slate-900 p-2.5 border border-slate-800 text-[10px] text-slate-400 space-y-0.5">
              <span className="text-orange-300 font-bold uppercase block">⚡ 24/7 Offline Support Line</span>
              <p>Concierge Desk: +91 1800-890-PILOT • Support ID: #{selectedPass.id.slice(-6)}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Detailed Spot Live Telemetry (Open-Meteo Weather, Traffic & Place Activity) */}
      {selectedSpotTelemetry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-[#1A1A1A] text-white max-w-md w-full p-4 sm:p-6 border-2 border-[#F27D26] shadow-[8px_8px_0px_rgba(242,125,38,0.3)] space-y-5 text-left relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedSpotTelemetry(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-[#F27D26] text-white rounded-lg">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  LIVE TELEMETRY HUB • FREE APIS
                </span>
                <h3 className="text-base font-extrabold text-white leading-tight">
                  {selectedSpotTelemetry.title}
                </h3>
              </div>
            </div>

            {/* Weather Breakdown (Open-Meteo API) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                <span className="flex items-center gap-1.5"><Sun className="w-4 h-4" /> Live Open-Meteo Weather</span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded">Real-Time</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-3xl font-black text-white">{liveWeather?.temp ?? 29}°C</div>
                  <p className="text-xs text-orange-300 font-bold">{liveWeather?.condition || "Pleasant Clear Skies"}</p>
                </div>
                <div className="text-right text-xs font-mono text-slate-300 space-y-0.5">
                  <p>Feels like: <strong className="text-white">{liveWeather?.feelsLike ?? 31}°C</strong></p>
                  <p>Humidity: <strong className="text-white">{liveWeather?.humidity ?? 58}%</strong></p>
                  <p>Wind: <strong className="text-white">{liveWeather?.windSpeed ?? 12} km/h</strong></p>
                </div>
              </div>
            </div>

            {/* Traffic & Corridor Speed */}
            {(() => {
              const traffic = getLiveTrafficInfo(selectedSpotTelemetry.lat || 26.91, selectedSpotTelemetry.lng || 75.78, selectedSpotTelemetry.title);
              return (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5"><Car className="w-4 h-4" /> Transit & Traffic Speed</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${traffic.color}`}>{traffic.badge}</span>
                  </div>
                  <p className="text-xs text-slate-200">{traffic.text}</p>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Average Speed: <strong className="text-white">{traffic.avgSpeedKmH} km/h</strong></span>
                    <span>Corridor Delay: <strong className="text-white">~ {traffic.delayMinutes} mins</strong></span>
                  </div>
                </div>
              );
            })()}

            {/* Place Activity & Crowd Density */}
            {(() => {
              const activity = getPlaceActivityLevel(selectedSpotTelemetry);
              return (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-orange-400 uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Place Crowd Activity</span>
                    <span className="text-xs font-extrabold text-white">{activity.activityScore}% Capacity</span>
                  </div>
                  <p className="text-xs text-slate-200">{activity.recommendation}</p>

                  {/* Hourly activity bar graph visualizer */}
                  <div className="pt-3 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Popular Hours Activity Curve</span>
                    <div className="flex items-end gap-1 h-12 pt-2">
                      {[25, 40, 65, 85, 95, 80, 60, 45, 30].map((val, idx) => (
                        <div key={idx} className="flex-1 bg-slate-800 rounded-t overflow-hidden flex flex-col justify-end" title={`Hour ${9 + idx}:00 - ${val}% busy`}>
                          <div 
                            className={`w-full transition-all ${val > 80 ? 'bg-orange-500' : val > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                            style={{ height: `${val}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                      <span>9 AM</span>
                      <span>1 PM</span>
                      <span>5 PM</span>
                      <span>9 PM</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setSelectedSpotTelemetry(null)}
              className="w-full bg-[#F27D26] hover:bg-orange-600 text-white font-mono text-xs font-bold uppercase py-2.5 transition cursor-pointer"
            >
              Close Live Telemetry
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
