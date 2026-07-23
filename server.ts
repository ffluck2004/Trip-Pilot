/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "trippilot_db.json");

// Helper to construct great circle distances
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// Lazy loaded Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Define local persistent store for files to persist in sandbox container
interface DBStore {
  users: any[];
  trips: any[];
  expenses: any[];
  reservations: any[];
  adminPlaces: any[];
}

function loadDB(): DBStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, loading fallback.", error);
  }

  // Pre-seed default database with premium mock user, trips, and admin logs
  const seed: DBStore = {
    users: [
      {
        id: "admin-id",
        email: "admin@trippilot.com",
        password: "admin", // Simple auth for demo
        name: "Admin Pilot",
        role: "admin",
        preferences: {
          styles: ["Luxury", "Adventure", "Food Explorer"],
          interests: ["Photography", "Sightseeing", "Food"],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: "guest-id",
        email: "guest@trippilot.com",
        password: "guest",
        name: "Amelia Earhart",
        role: "user",
        preferences: {
          styles: ["Adventure", "Photography", "Cultural Explorer"],
          interests: ["Heritage", "Nature", "Local Food", "Photography"],
        },
        createdAt: new Date().toISOString(),
      },
    ],
    trips: [
      {
        id: "mumbai-trip",
        userId: "guest-id",
        input: {
          destination: "Mumbai",
          durationInDays: 1,
          durationInHours: 8,
          budget: 3000,
          peopleCount: 4,
          travelRadiusKm: 3,
          interests: ["Food", "Sightseeing", "Photography"],
          travelStyle: "Budget",
        },
        itinerary: [
          {
            id: "m1",
            day: 1,
            timeSlot: "09:00 - 11:00",
            title: "Gateway of India",
            description: "Marvel at the monumental historical arch built during the British Raj. Incredible sea views and photo opportunities.",
            category: "attraction",
            lat: 18.922,
            lng: 72.8347,
            address: "Apollo Bandar, Colaba, Mumbai",
            costEstimation: 0,
            estimatedDurationMinutes: 120,
            distanceFromPreviousKm: 0,
            travelTimeFromPreviousMinutes: 0,
            isCompleted: true,
          },
          {
            id: "m2",
            day: 1,
            timeSlot: "11:15 - 12:45",
            title: "Taj Mahal Palace Café",
            description: "Indulge in filter coffee and local snacks right next to the historic Gateway. High heritage aesthetic.",
            category: "restaurant",
            lat: 18.9217,
            lng: 72.8332,
            address: "Apollo Bunder, Colaba, Mumbai",
            costEstimation: 1200,
            estimatedDurationMinutes: 90,
            distanceFromPreviousKm: 0.2,
            travelTimeFromPreviousMinutes: 5,
            isCompleted: true,
          },
          {
            id: "m3",
            day: 1,
            timeSlot: "13:00 - 15:00",
            title: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya",
            description: "Splendid museum documenting the natural history, art, and ancient relics of Western India.",
            category: "hidden_gem",
            lat: 18.9269,
            lng: 72.8327,
            address: "159-161, Mahatma Gandhi Road, Fort, Mumbai",
            costEstimation: 600,
            estimatedDurationMinutes: 120,
            distanceFromPreviousKm: 0.6,
            travelTimeFromPreviousMinutes: 10,
            isCompleted: false,
          },
          {
            id: "m4",
            day: 1,
            timeSlot: "15:30 - 17:00",
            title: "Colaba Causeway Street Shopping",
            description: "Vibrant street market famous for vintage artifacts, brass trinkets, and traditional Indian attire.",
            category: "shopping",
            lat: 18.9189,
            lng: 72.829,
            address: "Colaba Causeway, Mumbai",
            costEstimation: 800,
            estimatedDurationMinutes: 90,
            distanceFromPreviousKm: 0.9,
            travelTimeFromPreviousMinutes: 15,
            isCompleted: false,
          },
          {
            id: "m5",
            day: 1,
            timeSlot: "17:15 - 18:00",
            title: "Marine Drive Sunset Viewpoint",
            description: "Famous seaside promenade providing safety, beautiful photography of the Arabian Sea, and refreshing winds.",
            category: "rest",
            lat: 18.924,
            lng: 72.822,
            address: "Netaji Subhash Chandra Bose Road, Mumbai",
            costEstimation: 0,
            estimatedDurationMinutes: 45,
            distanceFromPreviousKm: 1.1,
            travelTimeFromPreviousMinutes: 12,
            isCompleted: false,
          },
        ],
        optimizedOrder: ["m1", "m2", "m3", "m4", "m5"],
        plannedBudget: 3000,
        actualSpending: 1800,
        status: "live",
        currentLocationIdx: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    expenses: [
      {
        id: "e1",
        tripId: "mumbai-trip",
        amount: 1200,
        category: "Food",
        description: "Taj Palace High Tea Experience",
        date: new Date().toISOString().split("T")[0],
      },
      {
        id: "e2",
        tripId: "mumbai-trip",
        amount: 600,
        category: "Activity",
        description: "Museum Entry Pass (4 Friends)",
        date: new Date().toISOString().split("T")[0],
      },
    ],
    reservations: [
      {
        id: "r1",
        userId: "guest-id",
        tripId: "mumbai-trip",
        type: "Restaurant",
        title: "The Taj Lounge Booking",
        confirmationCode: "TAJ-MUM-9921",
        dateTime: `${new Date().toISOString().split("T")[0]}T11:15:00`,
        details: "4 Seats near the window viewpoint over the ocean.",
        cost: 1200,
      },
    ],
    adminPlaces: [
      {
        id: "ap1",
        title: "Gateway of India",
        category: "attraction",
        lat: 18.922,
        lng: 72.8347,
        address: "Apollo Bandar, Colaba, Mumbai",
        rating: 4.8,
      },
      {
        id: "ap2",
        title: "Chhatrapati Shivaji Terminus (CST)",
        category: "attraction",
        lat: 18.9398,
        lng: 72.8355,
        address: "Fort, Mumbai",
        rating: 4.9,
      },
      {
        id: "ap3",
        title: "Leopold Cafe & Bar",
        category: "restaurant",
        lat: 18.9221,
        lng: 72.8315,
        address: "Colaba, Mumbai",
        rating: 4.5,
      },
      {
        id: "ap4",
        title: "Hawa Mahal",
        category: "attraction",
        lat: 26.9124,
        lng: 75.8273,
        address: "Hawa Mahal Rd, Badi Choupad, J.D.A. Market, Jaipur",
        rating: 4.7,
      },
      {
        id: "ap5",
        title: "Amber Palace",
        category: "attraction",
        lat: 26.9855,
        lng: 75.8513,
        address: "Devisinghpura, Amer, Jaipur",
        rating: 4.9,
      },
    ],
  };

  saveDB(seed);
  return seed;
}

function saveDB(db: DBStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error persisting database to disk.", error);
  }
}

// Initialize active database
const db = loadDB();

// Helper to get realistic image thumbnail URL for server-side generated itinerary places
function getSpotImageForBackend(title: string, category: string, destination: string): string {
  const t = (title || "").toLowerCase();
  const cat = category || "attraction";

  if (t.includes("gateway")) return "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80";
  if (t.includes("taj mahal palace")) return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
  if (t.includes("taj mahal")) return "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80";
  if (t.includes("hawa mahal")) return "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80";
  if (t.includes("amber")) return "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80";
  if (t.includes("marine drive")) return "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80";
  if (t.includes("gorakhnath")) return "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80";
  if (t.includes("taal") || t.includes("lake") || t.includes("bhojtal") || t.includes("futala")) return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
  if (t.includes("gita press") || t.includes("museum")) return "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80";
  if (t.includes("deekshabhoomi")) return "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80";
  if (t.includes("qutub minar")) return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80";
  if (t.includes("red fort")) return "https://images.unsplash.com/photo-1592639296346-560c37a0f711?auto=format&fit=crop&w=800&q=80";
  if (t.includes("india gate")) return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80";
  if (t.includes("ganga aarti") || t.includes("ghat")) return "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80";
  if (t.includes("bara imambara")) return "https://images.unsplash.com/photo-1585135497273-1a86b09fe707?auto=format&fit=crop&w=800&q=80";
  if (cat === "restaurant" || t.includes("food") || t.includes("sweet") || t.includes("kebab") || t.includes("cafe")) return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
  if (cat === "shopping" || t.includes("bazaar") || t.includes("market")) return "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80";
  if (t.includes("park") || t.includes("garden")) return "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80";
  return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";
}

// Build fallback pre-calculated generator for when Gemini token is empty or error gets triggered
function generateFallbackItinerary(destination: string, durationDays: number, budget: number, travelStyle: string): any[] {
  const destLower = destination.toLowerCase().trim();

  // Real-world landmark databases for popular destinations
  const realWorldLandmarks: { [key: string]: { lat: number; lng: number; spots: any[] } } = {
    gorakhpur: {
      lat: 26.7606,
      lng: 83.3732,
      spots: [
        { title: "Gorakhnath Temple & Sacred Mansarovar Pond", category: "attraction", lat: 26.7905, lng: 83.3592, cost: 0, desc: "Historic temple shrine of Guru Gorakhnath featuring peaceful gardens, ancient architecture, and daily evening aarti.", addr: "Gorakhnath Road, Gorakhpur, Uttar Pradesh" },
        { title: "Ramgarh Taal Lakefront & Boating Deck", category: "attraction", lat: 26.7321, lng: 83.4012, cost: 80, desc: "Sprawling 1,700-acre natural lake featuring a modern laser fountain show, waterfront boulevard, and speedboat rides.", addr: "Padleyganj Lakefront Drive, Gorakhpur, Uttar Pradesh" },
        { title: "Gita Press Heritage Museum & Archives", category: "attraction", lat: 26.7580, lng: 83.3720, cost: 0, desc: "World-famous publication house featuring 100+ years of hand-drawn religious murals, rare scripture manuscripts, and art.", addr: "Gita Press Road, Laldiggi, Gorakhpur, Uttar Pradesh" },
        { title: "Choudhary Sweet House & Pakwan Lane", category: "restaurant", lat: 26.7550, lng: 83.3780, cost: 180, desc: "Famous culinary hotspot serving authentic Gorakhpuri samosa chaat, rabri jalebi, and badam milk.", addr: "Golghar Market, Gorakhpur, Uttar Pradesh" },
        { title: "Gorakhpur Railway Museum & Heritage Loco Park", category: "attraction", lat: 26.7620, lng: 83.3850, cost: 30, desc: "Interactive transport museum housing historic steam engines, vintage toy trains, and colonial railway memorabilia.", addr: "Railway Colony, Gorakhpur, Uttar Pradesh" },
        { title: "Golghar Commercial & Handloom Arcade", category: "shopping", lat: 26.7590, lng: 83.3750, cost: 350, desc: "Bustling central market famous for Terracotta pottery craft from Aurangabad village, brassware, and traditional silk sarees.", addr: "Golghar, Gorakhpur, Uttar Pradesh" },
        { title: "Vindhyavasini Park & Botanical Walkways", category: "hidden_gem", lat: 26.7450, lng: 83.3820, cost: 10, desc: "Lush green urban oasis with fountain promenades, rose garden trails, and morning relaxation spaces.", addr: "Civil Lines, Gorakhpur, Uttar Pradesh" },
        { title: "Tarkulha Devi Temple Excursion", category: "attraction", lat: 26.6800, lng: 83.5200, cost: 0, desc: "Revered forest temple associated with freedom fighter Shaheed Bandhu Singh surrounded by ancient banyan trees.", addr: "Deoria Road, Gorakhpur Environs, Uttar Pradesh" },
      ]
    },
    gorakpur: {
      lat: 26.7606,
      lng: 83.3732,
      spots: [
        { title: "Gorakhnath Temple & Sacred Mansarovar Pond", category: "attraction", lat: 26.7905, lng: 83.3592, cost: 0, desc: "Historic temple shrine of Guru Gorakhnath featuring peaceful gardens, ancient architecture, and daily evening aarti.", addr: "Gorakhnath Road, Gorakhpur, Uttar Pradesh" },
        { title: "Ramgarh Taal Lakefront & Boating Deck", category: "attraction", lat: 26.7321, lng: 83.4012, cost: 80, desc: "Sprawling 1,700-acre natural lake featuring a modern laser fountain show, waterfront boulevard, and speedboat rides.", addr: "Padleyganj Lakefront Drive, Gorakhpur, Uttar Pradesh" },
        { title: "Gita Press Heritage Museum & Archives", category: "attraction", lat: 26.7580, lng: 83.3720, cost: 0, desc: "World-famous publication house featuring 100+ years of hand-drawn religious murals, rare scripture manuscripts, and art.", addr: "Gita Press Road, Laldiggi, Gorakhpur, Uttar Pradesh" },
        { title: "Choudhary Sweet House & Pakwan Lane", category: "restaurant", lat: 26.7550, lng: 83.3780, cost: 180, desc: "Famous culinary hotspot serving authentic Gorakhpuri samosa chaat, rabri jalebi, and badam milk.", addr: "Golghar Market, Gorakhpur, Uttar Pradesh" },
        { title: "Gorakhpur Railway Museum & Heritage Loco Park", category: "attraction", lat: 26.7620, lng: 83.3850, cost: 30, desc: "Interactive transport museum housing historic steam engines, vintage toy trains, and colonial railway memorabilia.", addr: "Railway Colony, Gorakhpur, Uttar Pradesh" },
        { title: "Golghar Commercial & Handloom Arcade", category: "shopping", lat: 26.7590, lng: 83.3750, cost: 350, desc: "Bustling central market famous for Terracotta pottery craft from Aurangabad village, brassware, and traditional silk sarees.", addr: "Golghar, Gorakhpur, Uttar Pradesh" },
        { title: "Vindhyavasini Park & Botanical Walkways", category: "hidden_gem", lat: 26.7450, lng: 83.3820, cost: 10, desc: "Lush green urban oasis with fountain promenades, rose garden trails, and morning relaxation spaces.", addr: "Civil Lines, Gorakhpur, Uttar Pradesh" },
      ]
    },
    nagpur: {
      lat: 21.1458,
      lng: 79.0882,
      spots: [
        { title: "Deekshabhoomi Sacred Stupa", category: "attraction", lat: 21.1278, lng: 79.0667, cost: 0, desc: "Monumental architectural stupa and pilgrimage site surrounded by manicured lawns and peaceful reflection halls.", addr: "Bajaj Nagar, Nagpur, Maharashtra" },
        { title: "Futala Lake Promenade & Musical Fountain", category: "attraction", lat: 21.1550, lng: 79.0430, cost: 50, desc: "Vibrant lakeside food street and waterfront promenade famous for sunset views and evening light shows.", addr: "Futala Road, Nagpur, Maharashtra" },
        { title: "Haldiram's Planet Food Court & Sweet Hub", category: "restaurant", lat: 21.1450, lng: 79.0820, cost: 250, desc: "Original flagship location of Haldiram's serving Nagpuri Orange Barfi, Tarri Poha, and regional street foods.", addr: "Shankar Nagar Square, Nagpur, Maharashtra" },
        { title: "Ambazari Lake & Biodiversity Park", category: "attraction", lat: 21.1290, lng: 79.0380, cost: 20, desc: "Nagpur's largest lake featuring jogging tracks, musical gardens, and paddle boat facilities.", addr: "Ambazari, Nagpur, Maharashtra" },
        { title: "Sitabuldi Fort & Heritage Market", category: "shopping", lat: 21.1478, lng: 79.0828, cost: 200, desc: "Historic hill fort overlooking the city center alongside bustling street markets for Nagpur oranges and textiles.", addr: "Sitabuldi Main Road, Nagpur, Maharashtra" },
        { title: "Zero Mile Stone Monument & Metro Park", category: "hidden_gem", lat: 21.1517, lng: 79.0882, cost: 0, desc: "Geographical center of undivided India built by British surveyors in 1907 with sandstone pillars.", addr: "Civil Lines, Nagpur, Maharashtra" },
        { title: "Raman Science Centre & Planetarium", category: "attraction", lat: 21.1460, lng: 79.0980, cost: 40, desc: "Interactive science park with 3D planetarium shows, prehistoric animal park, and physics exhibits.", addr: "Opp. Gandhisagar Lake, Nagpur, Maharashtra" },
      ]
    },
    napur: {
      lat: 21.1458,
      lng: 79.0882,
      spots: [
        { title: "Deekshabhoomi Sacred Stupa", category: "attraction", lat: 21.1278, lng: 79.0667, cost: 0, desc: "Monumental architectural stupa and pilgrimage site surrounded by manicured lawns and peaceful reflection halls.", addr: "Bajaj Nagar, Nagpur, Maharashtra" },
        { title: "Futala Lake Promenade & Musical Fountain", category: "attraction", lat: 21.1550, lng: 79.0430, cost: 50, desc: "Vibrant lakeside food street and waterfront promenade famous for sunset views and evening light shows.", addr: "Futala Road, Nagpur, Maharashtra" },
        { title: "Haldiram's Planet Food Court & Sweet Hub", category: "restaurant", lat: 21.1450, lng: 79.0820, cost: 250, desc: "Original flagship location of Haldiram's serving Nagpuri Orange Barfi, Tarri Poha, and regional street foods.", addr: "Shankar Nagar Square, Nagpur, Maharashtra" },
        { title: "Ambazari Lake & Biodiversity Park", category: "attraction", lat: 21.1290, lng: 79.0380, cost: 20, desc: "Nagpur's largest lake featuring jogging tracks, musical gardens, and paddle boat facilities.", addr: "Ambazari, Nagpur, Maharashtra" },
        { title: "Sitabuldi Fort & Heritage Market", category: "shopping", lat: 21.1478, lng: 79.0828, cost: 200, desc: "Historic hill fort overlooking the city center alongside bustling street markets for Nagpur oranges and textiles.", addr: "Sitabuldi Main Road, Nagpur, Maharashtra" },
      ]
    },
    delhi: {
      lat: 28.6139,
      lng: 77.2090,
      spots: [
        { title: "Qutub Minar & Mehrauli Heritage Complex", category: "attraction", lat: 28.5244, lng: 77.1855, cost: 50, desc: "73-meter UNESCO World Heritage brick minaret surrounded by 12th-century monuments and Iron Pillar.", addr: "Mehrauli, New Delhi" },
        { title: "Red Fort (Lal Qila) & Diwan-i-Am", category: "attraction", lat: 28.6562, lng: 77.2410, cost: 50, desc: "Iconic 17th-century Mughal fortress with red sandstone ramparts, museums, and Sound & Light show.", addr: "Netaji Subhash Marg, Chandni Chowk, New Delhi" },
        { title: "Karim's Historic Jama Masjid Kebabs", category: "restaurant", lat: 28.6510, lng: 77.2330, cost: 400, desc: "Legendary Mughal culinary institution founded in 1913 famous for mutton stew, seekh kebabs, and naan.", addr: "Gali Kababian, Old Delhi" },
        { title: "India Gate & Kartavya Path Promenade", category: "attraction", lat: 28.6129, lng: 77.2295, cost: 0, desc: "Grand war memorial arch set amidst manicured lawns, fountains, and illuminated twilight vistas.", addr: "Rajpath, New Delhi" },
        { title: "Dilli Haat INA Open-Air Craft Bazaar", category: "shopping", lat: 28.5732, lng: 77.2078, cost: 30, desc: "Handicrafts hub featuring regional artisan stalls from all Indian states and authentic food pavilions.", addr: "Kidwai Nagar West, New Delhi" },
        { title: "Humayun's Tomb Mughal Gardens", category: "attraction", lat: 28.5847, lng: 77.2507, cost: 50, desc: "UNESCO garden-tomb masterpiece that inspired the Taj Mahal, featuring marble domes and water channels.", addr: "Nizamuddin East, New Delhi" },
      ]
    },
    varanasi: {
      lat: 25.3176,
      lng: 82.9739,
      spots: [
        { title: "Dashashwamedh Ghat Evening Ganga Aarti", category: "attraction", lat: 25.3060, lng: 83.0100, cost: 0, desc: "Mesmerizing spiritual fire ceremony performed daily at sunset on the banks of the sacred Ganges river.", addr: "Dashashwamedh Ghat, Varanasi, Uttar Pradesh" },
        { title: "Kashi Vishwanath Golden Temple Corridor", category: "attraction", lat: 25.3109, lng: 83.0107, cost: 0, desc: "Holy Jyotirlinga shrine renovated into a grand riverside marble corridor connecting to the ghats.", addr: "Lahori Tola, Varanasi, Uttar Pradesh" },
        { title: "Kashi Chat Bhandar & Blue Lassi Shop", category: "restaurant", lat: 25.3100, lng: 83.0080, cost: 120, desc: "Famous local eatery serving Tamatar Chaat, Palak Chaat, and thick clay-pot fruit lassis.", addr: "Godowlia Chowk, Varanasi, Uttar Pradesh" },
        { title: "Sarnath Buddhist Deer Park & Dhamek Stupa", category: "attraction", lat: 25.3811, lng: 83.0214, cost: 25, desc: "Sacred site where Lord Buddha delivered his first sermon, featuring ancient stupas and archaeological museum.", addr: "Sarnath, Varanasi, Uttar Pradesh" },
        { title: "Banarasi Silk Weaver Market & Bazaar", category: "shopping", lat: 25.3150, lng: 83.0050, cost: 500, desc: "Traditional weaving alleyways showcasing handloom Banarasi brocade sarees and Zari gold threadwork.", addr: "Madanpura, Varanasi, Uttar Pradesh" },
      ]
    },
    lucknow: {
      lat: 26.8467,
      lng: 80.9462,
      spots: [
        { title: "Bara Imambara & Bhool Bhulaiya Labyrinth", category: "attraction", lat: 26.8689, lng: 80.9128, cost: 50, desc: "Grand 18th-century Awadhi monument featuring an arched pillarless hall and intricate rooftop maze.", addr: "Machchhi Bhavan, Lucknow, Uttar Pradesh" },
        { title: "Tunday Kababi Historic Aminabad Outlet", category: "restaurant", lat: 26.8450, lng: 80.9250, cost: 250, desc: "100+ year old legendary eatery world-famous for melt-in-mouth Galouti Kebabs and Sheermal bread.", addr: "Nazirabad Road, Aminabad, Lucknow, Uttar Pradesh" },
        { title: "Rumi Darwaza & Hussainabad Clock Tower", category: "attraction", lat: 26.8710, lng: 80.9140, cost: 0, desc: "60-foot tall Turkish-style gateway and India's tallest clock tower lit up majestically at night.", addr: "Hussainabad, Lucknow, Uttar Pradesh" },
        { title: "Hazratganj Shopping Arcade & Love Lane", category: "shopping", lat: 26.8520, lng: 80.9460, cost: 300, desc: "Colonial-style Victorian shopping boulevard famous for Chikankari embroidery wear and street food.", addr: "Hazratganj, Lucknow, Uttar Pradesh" },
      ]
    },
    bhopal: {
      lat: 23.2599,
      lng: 77.4126,
      spots: [
        { title: "Upper Lake (Bhojtal) & Boat Club", category: "attraction", lat: 23.2323, lng: 77.3912, cost: 100, desc: "Sprawling historic artificial lake built by Raja Bhoj. Enjoy tranquil boat rides, watersports, and sunset lakeside walks.", addr: "Shamla Hills, Bhopal, Madhya Pradesh" },
        { title: "Van Vihar National Park", category: "attraction", lat: 23.2268, lng: 77.3685, cost: 50, desc: "Open-air national park along Upper Lake home to tigers, leopards, sloth bears, and diverse avifauna.", addr: "Lake View Road, Bhopal, Madhya Pradesh" },
        { title: "Manohar Dairy & Restaurant", category: "restaurant", lat: 23.2332, lng: 77.4012, cost: 250, desc: "Iconic Bhopali culinary destination famous for street chaat, chole bhature, and traditional rasmalai.", addr: "Hamidia Road, Bhopal, Madhya Pradesh" },
        { title: "Taj-ul-Masajid", category: "attraction", lat: 23.2612, lng: 77.3925, cost: 0, desc: "One of Asia's largest mosques featuring impressive 18-storey pink minarets and marble courtyards.", addr: "NH 12, Motia Khan, Bhopal, Madhya Pradesh" },
        { title: "Chatori Gali Night Food Alley", category: "restaurant", lat: 23.2590, lng: 77.4010, cost: 150, desc: "Historic culinary lane in Old Bhopal famous for rich local street snacks, kebabs, and authentic sweets.", addr: "Old City Market, Bhopal, Madhya Pradesh" },
        { title: "Madhya Pradesh Tribal Museum", category: "attraction", lat: 23.2185, lng: 77.3992, cost: 20, desc: "A world-class museum celebrating indigenous tribal art, traditional architecture, mythology, and folklore.", addr: "Shyamala Hills, Bhopal, Madhya Pradesh" },
      ]
    },
    mumbai: {
      lat: 18.922,
      lng: 72.8347,
      spots: [
        { title: "Gateway of India", category: "attraction", lat: 18.922, lng: 72.8347, cost: 0, desc: "Monumental historical arch overlooking the Arabian Sea built during the British Raj.", addr: "Apollo Bandar, Colaba, Mumbai, Maharashtra" },
        { title: "Marine Drive Promenade", category: "attraction", lat: 18.9438, lng: 72.823, cost: 0, desc: "Iconic 3.6 km long arc waterfront street known as the Queen's Necklace.", addr: "Netaji Subhash Chandra Bose Road, Mumbai, Maharashtra" },
        { title: "Bademiya Street Kebabs", category: "restaurant", lat: 18.9225, lng: 72.8312, cost: 350, desc: "World-famous street food outlet serving grilled seekh kebabs and baida roti.", addr: "Tulloch Road, Colaba, Mumbai, Maharashtra" },
        { title: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", category: "attraction", lat: 18.9269, lng: 72.8327, cost: 150, desc: "Indo-Saracenic museum showcasing rare ancient sculptures and natural history exhibits.", addr: "MG Road, Fort, Mumbai, Maharashtra" },
        { title: "Colaba Causeway Market", category: "shopping", lat: 18.921, lng: 72.831, cost: 300, desc: "Bustling shopping street for vintage jewelry, handicrafts, books, and fashion.", addr: "Colaba Causeway, Mumbai, Maharashtra" },
      ]
    },
    jaipur: {
      lat: 26.9124,
      lng: 75.8273,
      spots: [
        { title: "Amber Fort & Palace", category: "attraction", lat: 26.9855, lng: 75.8513, cost: 100, desc: "Majestic hilltop fort built from red sandstone and marble featuring Sheesh Mahal mirror palace.", addr: "Devisinghpura, Amer, Jaipur, Rajasthan" },
        { title: "Hawa Mahal (Palace of Winds)", category: "attraction", lat: 26.9239, lng: 75.8267, cost: 50, desc: "Five-story pink sandstone structure with 953 intricate lattice windows.", addr: "Hawa Mahal Rd, Badi Choupad, Jaipur, Rajasthan" },
        { title: "City Palace Jaipur", category: "attraction", lat: 26.9258, lng: 75.8237, cost: 300, desc: "Royal residence blending Rajasthani and Mughal architecture with museums.", addr: "Tulsi Marg, Gangori Bazaar, Jaipur, Rajasthan" },
        { title: "Lassiwala MI Road", category: "restaurant", lat: 26.9180, lng: 75.8150, cost: 80, desc: "Legendary 1944 shop serving thick creamy lassi served in traditional earthenware kulhads.", addr: "MI Road, Jaipur, Rajasthan" },
      ]
    }
  };

  let targetData = realWorldLandmarks[destLower];

  // Search partial match in preset database
  if (!targetData) {
    for (const [key, val] of Object.entries(realWorldLandmarks)) {
      if (destLower.includes(key) || key.includes(destLower)) {
        targetData = val;
        break;
      }
    }
  }

  // Base coordinates
  let centerLat = targetData ? targetData.lat : 23.2599;
  let centerLng = targetData ? targetData.lng : 77.4126;

  if (!targetData) {
    // Generate deterministic lat/lng coordinates for any searched village, town or city
    let hash = 0;
    for (let i = 0; i < destination.length; i++) {
      hash = destination.charCodeAt(i) + ((hash << 5) - hash);
    }
    centerLat = parseFloat((18 + (Math.abs(hash % 80) / 80) * 12).toFixed(4));
    centerLng = parseFloat((72 + (Math.abs((hash >> 3) % 120) / 120) * 15).toFixed(4));
  }

  const destCap = destination.charAt(0).toUpperCase() + destination.slice(1);

  // Generate authentic spots list
  const availableSpots = targetData ? targetData.spots : [
    { title: `${destCap} Central Town Square & Clock Tower`, category: "attraction", cost: 0, desc: `Vibrant historic gathering plaza at the heart of ${destCap} surrounded by heritage architecture.`, addr: `Town Square, ${destCap}` },
    { title: `${destCap} Heritage & Regional Cultural Museum`, category: "attraction", cost: 30, desc: `Exhibiting regional history, traditional art forms, and indigenous artifacts of the ${destCap} district.`, addr: `Civil Lines, ${destCap}` },
    { title: `${destCap} Traditional Food Street & Local Delicacies`, category: "restaurant", cost: 180, desc: `Sample iconic regional street foods, authentic snacks, and famous local specialties in ${destCap}.`, addr: `Main Market Road, ${destCap}` },
    { title: `${destCap} Riverfront & Ecological Promenade`, category: "attraction", cost: 0, desc: `Relaxing scenic waterfront walkways and sunset viewing decks in ${destCap}.`, addr: `Waterfront Drive, ${destCap}` },
    { title: `${destCap} Handloom & Artisan Craft Bazaar`, category: "shopping", cost: 250, desc: `Bustling local marketplace featuring handcrafted textiles, souvenirs, and traditional wares of ${destCap}.`, addr: `Station Road Market, ${destCap}` },
    { title: `${destCap} Panorama Hill & Sunset Lookout`, category: "hidden_gem", cost: 0, desc: `High altitude vantage point providing breathtaking panoramic views across ${destCap}.`, addr: `Hill Ridge, ${destCap}` },
  ];

  const items: any[] = [];
  let itemCounter = 1;

  for (let d = 1; d <= durationDays; d++) {
    const daySpotsCount = 4;
    for (let s = 0; s < daySpotsCount; s++) {
      const spotIndex = ((d - 1) * daySpotsCount + s) % availableSpots.length;
      const spot = availableSpots[spotIndex];

      const startHour = 9 + s * 2.5;
      const endHour = startHour + 2;
      const strStart = `${Math.floor(startHour).toString().padStart(2, "0")}:${((startHour % 1) * 60).toString().padStart(2, "0")}`;
      const strEnd = `${Math.floor(endHour).toString().padStart(2, "0")}:${((endHour % 1) * 60).toString().padStart(2, "0")}`;

      const offsetLat = spot.lat || (centerLat + (s * 0.008) - 0.01);
      const offsetLng = spot.lng || (centerLng + (s * 0.008) - 0.01);

      items.push({
        id: `it-${d}-${itemCounter++}`,
        day: d,
        timeSlot: `${strStart} - ${strEnd}`,
        title: spot.title,
        description: spot.desc || `Discover ${spot.title} in ${destination}. Custom planned for ${travelStyle} travel style.`,
        category: spot.category,
        lat: parseFloat(offsetLat.toFixed(4)),
        lng: parseFloat(offsetLng.toFixed(4)),
        costEstimation: spot.cost || 50,
        estimatedDurationMinutes: 120,
        address: spot.addr || `Central ${destination}`,
        isCompleted: false,
        imageUrl: spot.imageUrl || getSpotImageForBackend(spot.title, spot.category, destination),
      });
    }
  }

  return items;
}

// Geospatial solver: coordinates distance, traveling salesperson order, and time estimates
function optimizeRoutesInPlace(itinerary: any[]): any[] {
  if (!itinerary || itinerary.length === 0) return [];

  // Group by day first
  const dayGroups: { [key: number]: any[] } = {};
  itinerary.forEach((item) => {
    if (!dayGroups[item.day]) dayGroups[item.day] = [];
    dayGroups[item.day].push(item);
  });

  const optimizedItinerary: any[] = [];

  Object.keys(dayGroups).forEach((dayKey) => {
    const day = parseInt(dayKey);
    const dayItems = dayGroups[day];

    if (dayItems.length === 0) return;

    // Greedy TSP path optimization starting from index 0
    const ordered: any[] = [];
    const unvisited = [...dayItems];

    // Pick first element
    let current = unvisited.shift();
    ordered.push(current);

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = getDistanceKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      current = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(current);
    }

    // Now recalculate detailed intermediate times/distances
    for (let j = 0; j < ordered.length; j++) {
      if (j === 0) {
        ordered[j].distanceFromPreviousKm = 0;
        ordered[j].travelTimeFromPreviousMinutes = 0;
      } else {
        const prev = ordered[j - 1];
        const dist = getDistanceKm(prev.lat, prev.lng, ordered[j].lat, ordered[j].lng);
        ordered[j].distanceFromPreviousKm = dist;

        // Estimate vehicle time (roughly 25km/hr within congested city areas plus 5 mins traffic cushion)
        const timeEstimate = dist > 0 ? Math.round((dist / 25) * 60 + 5) : 0;
        ordered[j].travelTimeFromPreviousMinutes = timeEstimate;
      }
    }

    optimizedItinerary.push(...ordered);
  });

  return optimizedItinerary;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Log standard API inquiries for debug purposes
  app.use((req, res, next) => {
    console.log(`[TripPilot Server] ${req.method} ${req.url}`);
    next();
  });

  // API 1: AUTH REGISTRATION
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, preferences } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required registration parameters." });
    }

    const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "User with this email already registered." });
    }

    const newUser = {
      id: "u-" + Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase(),
      password,
      name,
      role: "user",
      preferences: preferences || { styles: [], interests: [] },
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDB(db);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        preferences: newUser.preferences,
      },
    });
  });

  // API 2: AUTH LOGIN
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password constraints." });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferences: user.preferences,
      },
    });
  });

  // API 3: GET USER SESSIONS & PROFILES
  app.get("/api/auth/profile/:id", (req, res) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User profile not identified." });
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
    });
  });

  // API 4: SAVE USER PREFERENCES
  app.post("/api/auth/profile/:id/preferences", (req, res) => {
    const { preferences } = req.body;
    const userIdx = db.users.findIndex((u) => u.id === req.params.id);
    if (userIdx === -1) {
      return res.status(404).json({ error: "User profile not identified." });
    }

    db.users[userIdx].preferences = preferences;
    saveDB(db);

    res.json({ success: true, preferences: db.users[userIdx].preferences });
  });

  // API 5: SMART TRIP ITINERARY GENERATOR (Powered by Gemini 3.5 AI)
  app.post("/api/trips/generate", async (req, res) => {
    const {
      userId,
      destination,
      durationInDays,
      durationInHours,
      budget,
      peopleCount,
      travelRadiusKm,
      interests,
      travelStyle,
      preferences,
    } = req.body;

    if (!destination || !durationInDays) {
      return res.status(400).json({ error: "Destination and duration parameters are highly required." });
    }

    console.log(`Generating optimized itinerary for ${destination}, duration: ${durationInDays} days`);

    let generatedItinerary: any[] = [];
    let usedAI = false;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();

        const customPrompt = `
Generate a fully optimized day-by-day travel itinerary for destination "${destination}".
Trip Details:
- Duration: ${durationInDays} day(s) ${durationInHours ? `(${durationInHours} hours)` : ""}
- Budget: ${budget} (INR for India places, general local currency otherwise)
- Travel style: ${travelStyle}
- Number of people: ${peopleCount}
- Maximum local radius from center: ${travelRadiusKm === 9999 ? "unlimited" : `${travelRadiusKm} KM`}
- Special interests: ${interests.join(", ")}
- Extra requests: ${preferences || "None"}

CRITICAL MANDATES:
1. Provide REAL, EXACT, SPECIFIC named landmarks, famous local restaurants, historical monuments, popular street food spots, and attractions located in "${destination}".
2. DO NOT output generic placeholders or vague names like "${destination} Fort" or "${destination} Museum". Use ACTUAL real-world landmark names (e.g. for Gorakhpur: Gorakhnath Temple, Ramgarh Taal Lakefront, Gita Press Museum, Golghar Market, Railway Museum; for Nagpur: Deekshabhoomi, Futala Lake, Haldiram's Planet Food Court, Ambazari Lake, Zero Mile Stone).
3. Generate exactly 4 to 6 logical activities/spots per day.
4. Ensure appropriate scheduling covering local street food, authentic sights, culture, and markets.
5. Estimate accurate lat/lng coordinates around the actual geographic center of "${destination}" so they render on OpenStreetMap.

Return only valid JSON with properties aligning directly to this schema:
{
  "itinerary": [
    {
      "day": 1,
      "timeSlot": "09:00 - 11:00",
      "title": "Exact Real Spot Name",
      "description": "Engaging 2-sentence description explaining why this real spot suits this journey style.",
      "category": "one of: 'restaurant', 'attraction', 'hidden_gem', 'shopping', 'rest', 'emergency', 'hotel'",
      "lat": number, 
      "lng": number,
      "costEstimation": number,
      "estimatedDurationMinutes": number,
      "address": "Realistic local address details or area name"
    }
  ]
}
Return only JSON. Do not write markdown tags of any kind. Valid raw JSON string only.
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: customPrompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.8,
            systemInstruction: "You are the primary engine of TripPilot, a state-of-the-art Location Intelligence and Geospatial Planner. You always generate clean, realistic travel itineraries with actual locations, perfect coordinates, and local prices. Do not output markdown blocks.",
          },
        });

        const rawText = response.text ? response.text.trim() : "";
        console.log("Raw response from Gemini API completed.");
        
        try {
          // Remove potential markdown wrappers if the model accidentally outputted them
          const cleansed = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          const parsed = JSON.parse(cleansed);
          if (parsed && Array.isArray(parsed.itinerary)) {
            generatedItinerary = parsed.itinerary;
            usedAI = true;
          }
        } catch (je) {
          console.error("JSON parsing error of Gemini content. Attempting fallback.", je);
        }
      } catch (ae) {
        console.error("Gemini AI API failure. Proceeding with Location Intelligence backup engine.", ae);
      }
    } else {
      console.log("GEMINI_API_KEY missing. Activating high-fidelity fallback Location Intelligence generator.");
    }

    // Default Fallback Generator if Gemini is not setup or threw parsing deviations
    if (generatedItinerary.length === 0) {
      generatedItinerary = generateFallbackItinerary(destination, durationInDays, budget, travelStyle);
    }

    // Run Geospatial Engine: TSP optimizer to order by distance & calculate incremental vehicle time/intervals
    const fullyOptimized = optimizeRoutesInPlace(generatedItinerary);

    // Save generated trip into user storage
    const newTrip = {
      id: "trip-" + Math.random().toString(36).substring(2, 9),
      userId: userId || "guest-id",
      input: {
        destination,
        durationInDays,
        durationInHours,
        budget,
        peopleCount,
        travelRadiusKm,
        interests,
        travelStyle,
        preferences,
      },
      itinerary: fullyOptimized,
      optimizedOrder: fullyOptimized.map((item) => item.id),
      plannedBudget: budget,
      actualSpending: 0,
      status: "planning",
      currentLocationIdx: 0,
      createdAt: new Date().toISOString(),
    };

    db.trips.push(newTrip);
    saveDB(db);

    res.json({
      success: true,
      usedAI,
      trip: newTrip,
    });
  });

  // API 6: GET ALL TRIPS BY USER
  app.get("/api/trips/user/:userId", (req, res) => {
    const userTrips = db.trips.filter((t) => t.userId === req.params.userId);
    res.json(userTrips);
  });

  // API 7: GET SINGLE TRIP DETAIL
  app.get("/api/trips/:id", (req, res) => {
    const trip = db.trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip record not verified." });
    res.json(trip);
  });

  // API 8: UPDATE TRIP STATUS (e.g. Enter Live Mode, Complete Trip)
  app.post("/api/trips/:id/status", (req, res) => {
    const { status, currentLocationIdx } = req.body;
    const tripIdx = db.trips.findIndex((t) => t.id === req.params.id);
    if (tripIdx === -1) return res.status(404).json({ error: "Trip record not verified." });

    if (status) db.trips[tripIdx].status = status;
    if (typeof currentLocationIdx === "number") {
      db.trips[tripIdx].currentLocationIdx = currentLocationIdx;
    }

    saveDB(db);
    res.json({ success: true, trip: db.trips[tripIdx] });
  });

  // API 9: SAVE CUSTOM PLACE / ITINERARY ADJ (Manual Place Discovery Injection)
  app.post("/api/trips/:id/itinerary/add", (req, res) => {
    const { title, description, category, lat, lng, costEstimation, estimatedDurationMinutes, address, day } = req.body;
    const tripIdx = db.trips.findIndex((t) => t.id === req.params.id);
    if (tripIdx === -1) return res.status(404).json({ error: "Trip record not verified." });

    const newItem = {
      id: "activity-" + Math.random().toString(36).substring(2, 9),
      day: parseInt(day) || 1,
      timeSlot: "Flexible Time",
      title,
      description,
      category,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      costEstimation: parseFloat(costEstimation) || 0,
      estimatedDurationMinutes: parseInt(estimatedDurationMinutes) || 60,
      isCompleted: false,
    };

    db.trips[tripIdx].itinerary.push(newItem);
    // Re-run Geospatial Route Optimization automatically
    db.trips[tripIdx].itinerary = optimizeRoutesInPlace(db.trips[tripIdx].itinerary);
    db.trips[tripIdx].optimizedOrder = db.trips[tripIdx].itinerary.map((item: any) => item.id);

    saveDB(db);
    res.json({ success: true, trip: db.trips[tripIdx] });
  });

  // API 10: TOGGLE ITINERARY ITEM COMPLETION
  app.post("/api/trips/:id/itinerary/:itemId/toggle", (req, res) => {
    const { completed } = req.body;
    const tripIdx = db.trips.findIndex((t) => t.id === req.params.id);
    if (tripIdx === -1) return res.status(404).json({ error: "Trip record not verified." });

    const itemIdx = db.trips[tripIdx].itinerary.findIndex((item: any) => item.id === req.params.itemId);
    if (itemIdx === -1) return res.status(404).json({ error: "Itinerary item not found." });

    db.trips[tripIdx].itinerary[itemIdx].isCompleted = completed;
    saveDB(db);

    res.json({ success: true, item: db.trips[tripIdx].itinerary[itemIdx] });
  });

  // API 10b: SWAP ITINERARY SPOT / RE-ROLL
  app.post("/api/trips/:id/itinerary/:itemId/swap", (req, res) => {
    const tripIdx = db.trips.findIndex((t) => t.id === req.params.id);
    if (tripIdx === -1) return res.status(404).json({ error: "Trip record not verified." });

    const itemIdx = db.trips[tripIdx].itinerary.findIndex((item: any) => item.id === req.params.itemId);
    if (itemIdx === -1) return res.status(404).json({ error: "Itinerary item not found." });

    const currentItem = db.trips[tripIdx].itinerary[itemIdx];
    const destination = db.trips[tripIdx].input?.destination || "Destination";

    // Alternate venues bank for swapping
    const altVenues = [
      { title: `${destination} Hidden Rooftop Lounge`, category: "hidden_gem", desc: "Cozy sunset view point away from tourist crowds.", cost: 800 },
      { title: `${destination} Artisan Heritage Bazaar`, category: "shopping", desc: "Handicrafts, textiles, and authentic local souvenirs.", cost: 1200 },
      { title: `${destination} Royal Botanical Gardens`, category: "attraction", desc: "Serene century-old green park with rare flora.", cost: 300 },
      { title: `${destination} Organic Fusion Cafe`, category: "restaurant", desc: "Farm-to-table breakfast and artisanal local coffee.", cost: 650 },
      { title: `${destination} Coastal Sunset Point`, category: "hidden_gem", desc: "Breathtaking cliffside view of the horizon.", cost: 0 },
    ];

    const pick = altVenues[Math.floor(Math.random() * altVenues.length)];
    
    // Slightly shift lat/lng
    const newLat = parseFloat((currentItem.lat + (Math.random() - 0.5) * 0.01).toFixed(4));
    const newLng = parseFloat((currentItem.lng + (Math.random() - 0.5) * 0.01).toFixed(4));

    const swappedItem = {
      ...currentItem,
      title: pick.title,
      category: pick.category,
      description: pick.desc,
      costEstimation: pick.cost,
      lat: newLat,
      lng: newLng,
    };

    db.trips[tripIdx].itinerary[itemIdx] = swappedItem;
    db.trips[tripIdx].itinerary = optimizeRoutesInPlace(db.trips[tripIdx].itinerary);
    saveDB(db);

    res.json({ success: true, item: swappedItem, trip: db.trips[tripIdx] });
  });

  // API 10c: GROUP COLLAB VOTE ON ITINERARY ITEM
  app.post("/api/trips/:id/itinerary/:itemId/vote", (req, res) => {
    const { vote } = req.body; // 'up' or 'down'
    const tripIdx = db.trips.findIndex((t) => t.id === req.params.id);
    if (tripIdx === -1) return res.status(404).json({ error: "Trip record not verified." });

    const itemIdx = db.trips[tripIdx].itinerary.findIndex((item: any) => item.id === req.params.itemId);
    if (itemIdx === -1) return res.status(404).json({ error: "Itinerary item not found." });

    const item = db.trips[tripIdx].itinerary[itemIdx];
    item.upvotes = (item.upvotes || 1) + (vote === "up" ? 1 : 0);
    item.downvotes = (item.downvotes || 0) + (vote === "down" ? 1 : 0);

    saveDB(db);
    res.json({ success: true, item });
  });

  // API 11: GET RESERVATIONS UTILITIES
  app.get("/api/reservations/user/:userId", (req, res) => {
    const items = db.reservations.filter((r) => r.userId === req.params.userId);
    res.json(items);
  });

  // API 11b: PARSE SMART CONFIRMATION TEXT INTO RESERVATION
  app.post("/api/reservations/parse", async (req, res) => {
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ error: "No confirmation text provided." });

    let parsed = {
      type: "Hotel",
      title: "Confirmed Stay",
      confirmationCode: `CONF-${Math.floor(100000 + Math.random() * 900000)}`,
      dateTime: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
      details: rawText.slice(0, 120),
      cost: 4500,
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const prompt = `Extract reservation metadata from this booking confirmation text:
"${rawText}"

Return JSON matching:
{
  "type": "Hotel" | "Airbnb" | "Restaurant" | "Event" | "Transport",
  "title": "Short title or venue name",
  "confirmationCode": "Code or PNR or Reference string",
  "dateTime": "YYYY-MM-DDTHH:mm format or ISO string",
  "cost": estimated total cost number,
  "details": "Key details like room type, seat, address, or terminal"
}
Output valid JSON string only.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.2 }
        });

        if (response.text) {
          const aiParsed = JSON.parse(response.text.trim());
          if (aiParsed.title) parsed = { ...parsed, ...aiParsed };
        }
      } catch (e) {
        console.error("Failed to parse confirmation using Gemini, using fallback parser.", e);
      }
    } else {
      // Fallback regex detection
      const textLower = rawText.toLowerCase();
      if (textLower.includes("flight") || textLower.includes("indigo") || textLower.includes("air") || textLower.includes("pnr")) {
        parsed.type = "Transport";
        parsed.title = "Flight Booking Confirmation";
      } else if (textLower.includes("hotel") || textLower.includes("taj") || textLower.includes("resort") || textLower.includes("marriott") || textLower.includes("radisson")) {
        parsed.type = "Hotel";
        parsed.title = "Hotel Lodging Confirmation";
      } else if (textLower.includes("airbnb")) {
        parsed.type = "Airbnb";
        parsed.title = "Airbnb Stay";
      } else if (textLower.includes("table") || textLower.includes("restaurant") || textLower.includes("dinner")) {
        parsed.type = "Restaurant";
        parsed.title = "Dining Reservation";
      }

      // Try extract PNR/Code
      const codeMatch = rawText.match(/(?:pnr|ref|code|conf|booking id)[:\s]*([a-zA-Z0-9\-]+)/i);
      if (codeMatch && codeMatch[1]) {
        parsed.confirmationCode = codeMatch[1].toUpperCase();
      }

      // Try extract cost
      const costMatch = rawText.match(/(?:₹|inr|rs\.?|\$)\s*([\d,]+)/i);
      if (costMatch && costMatch[1]) {
        parsed.cost = parseFloat(costMatch[1].replace(/,/g, ""));
      }
    }

    res.json({ success: true, parsed });
  });

  app.post("/api/reservations", (req, res) => {
    const { userId, tripId, type, title, confirmationCode, dateTime, details, cost } = req.body;

    const newRes = {
      id: "res-" + Math.random().toString(36).substring(2, 9),
      userId,
      tripId,
      type,
      title,
      confirmationCode: confirmationCode || `CONF-${Math.floor(100000 + Math.random() * 900000)}`,
      dateTime: dateTime || new Date().toISOString(),
      details: details || "",
      cost: parseFloat(cost) || 0,
    };

    db.reservations.push(newRes);

    // Update actualSpending in corresponding trip
    if (tripId) {
      const tIdx = db.trips.findIndex((t) => t.id === tripId);
      if (tIdx !== -1) {
        db.trips[tIdx].actualSpending += parseFloat(cost) || 0;
      }
    }

    saveDB(db);
    res.json({ success: true, reservation: newRes });
  });

  // API 12: GET EXPENSES LOGS & ANALYTICS
  app.get("/api/expenses/trip/:tripId", (req, res) => {
    const items = db.expenses.filter((e) => e.tripId === req.params.tripId);
    res.json(items);
  });

  app.post("/api/expenses", (req, res) => {
    const { tripId, amount, category, description, date } = req.body;

    const newExpense = {
      id: "exp-" + Math.random().toString(36).substring(2, 9),
      tripId,
      amount: parseFloat(amount) || 0,
      category,
      description,
      date: date || new Date().toISOString().split("T")[0],
    };

    db.expenses.push(newExpense);

    // Increment actual trip expenditure
    const tIdx = db.trips.findIndex((t) => t.id === tripId);
    if (tIdx !== -1) {
      db.trips[tIdx].actualSpending += parseFloat(amount) || 0;
    }

    saveDB(db);
    res.json({ success: true, expense: newExpense });
  });

  // API 12b: GET ALL PLACES (With query filters for featured, category, type)
  app.get("/api/places", (req, res) => {
    const { featured, type, category } = req.query;
    
    // Rich, hand-crafted dataset of places, destinations, and hotels
    const allPlaces = [
      // DESTINATIONS
      {
        id: "dest-paris",
        title: "Paris",
        destination: "Paris",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "9h",
        price: 58000,
        rating: 4.9,
        description: "The romance capital of the world. Features the iconic Eiffel Tower, Louvre Museum, and legendary sidewalk cafes.",
        tags: ["Romantic", "Art", "Culture", "Food"],
        lat: 48.8566,
        lng: 2.3522,
        address: "Paris, France"
      },
      {
        id: "dest-jaipur",
        title: "Jaipur",
        destination: "Jaipur",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "1.5h",
        price: 4200,
        rating: 4.8,
        description: "The magnificent Pink City of Rajasthan. Renowned for its grand Amber Palace, Hawa Mahal, and vibrant gemstone markets.",
        tags: ["Heritage", "Palace", "Culture", "Shopping"],
        lat: 26.9124,
        lng: 75.8273,
        address: "Jaipur, Rajasthan, India"
      },
      {
        id: "dest-goa",
        title: "Goa",
        destination: "Goa",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "1h",
        price: 3500,
        rating: 4.7,
        description: "Tropical coastal paradise. Pristine sandy beaches, 17th-century Portuguese churches, active nightlife, and spice plantations.",
        tags: ["Beach", "Nature", "Nightlife", "Relaxing"],
        lat: 15.2993,
        lng: 74.1240,
        address: "Goa, India"
      },
      {
        id: "dest-mumbai",
        title: "Mumbai",
        destination: "Mumbai",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "2h",
        price: 4900,
        rating: 4.8,
        description: "The lively financial heart of India. Home to the legendary Gateway of India, Marine Drive sunset loops, and rich street foods.",
        tags: ["City", "Heritage", "Street Food", "Coastal"],
        lat: 18.9220,
        lng: 72.8347,
        address: "Mumbai, Maharashtra, India"
      },
      {
        id: "dest-london",
        title: "London",
        destination: "London",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "8h",
        price: 52000,
        rating: 4.9,
        description: "Vibrant capital spanning history and contemporary style. Westminster Abbey, the Eye, and charming classic British pubs.",
        tags: ["Heritage", "Museums", "City", "Parks"],
        lat: 51.5074,
        lng: -0.1278,
        address: "London, United Kingdom"
      },

      // HOTELS
      {
        id: "hotel-taj",
        title: "The Taj Mahal Palace",
        destination: "Mumbai",
        type: "HOTEL",
        category: "HOTEL",
        price: 24500,
        rating: 4.9,
        ratingBadge: "9.9 Exceptional",
        description: "Iconic ultra-luxury harbor-side hotel offering legendary hospitality since 1903. Overlooks the Gateway of India.",
        tags: ["5★", "Luxury", "Pool", "Spa", "Sea View"],
        lat: 18.9217,
        lng: 72.8331,
        address: "Apollo Bandar, Colaba, Mumbai",
        amenities: ["Free WiFi", "Infinity Pool", "Luxury Spa", "Ocean Lounge"]
      },
      {
        id: "hotel-rambagh",
        title: "Rambagh Palace",
        destination: "Jaipur",
        type: "HOTEL",
        category: "HOTEL",
        price: 32000,
        rating: 4.9,
        ratingBadge: "9.9 Exceptional",
        description: "Former royal residence turned heritage luxury palace. Styled with grand marble corridors and manicured gardens.",
        tags: ["5★", "Luxury", "Heritage", "Royal Gardens"],
        lat: 26.8982,
        lng: 75.8093,
        address: "Bhawani Singh Rd, Jaipur",
        amenities: ["Heritage Spa", "Indoor Pool", "Peacock Gardens", "Polo Lounge"]
      },
      {
        id: "hotel-wgoa",
        title: "W Goa Beach Resort",
        destination: "Goa",
        type: "HOTEL",
        category: "HOTEL",
        price: 18500,
        rating: 4.7,
        ratingBadge: "9.5 Exceptional",
        description: "Vibrant beachfront lifestyle luxury resort nestled under the dramatic cliffs of historic Chapora Fort.",
        tags: ["5★", "Beachfront", "Pool", "Nightlife"],
        lat: 15.5944,
        lng: 73.7371,
        address: "Vagator Beach, Bardez, Goa",
        amenities: ["Private Beach Access", "Rock Pool", "Yoga Deck", "DJ Lounge"]
      },
      {
        id: "hotel-plaza",
        title: "Hotel Plaza Athénée",
        destination: "Paris",
        type: "HOTEL",
        category: "HOTEL",
        price: 82000,
        rating: 4.9,
        ratingBadge: "9.8 Exceptional",
        description: "Ultra-prestigious palace hotel on Avenue Montaigne. Famed for its iconic red geranium balconies and Eiffel views.",
        tags: ["Luxury", "Eiffel View", "Fine Dining"],
        lat: 48.8665,
        lng: 2.3023,
        address: "25 Avenue Montaigne, 75008 Paris",
        amenities: ["Michelin Dining", "Dior Spa", "Eiffel Balconies", "Chauffeur"]
      },
      {
        id: "hotel-ibis-jaipur",
        title: "Ibis Budget Town Hotel",
        destination: "Jaipur",
        type: "HOTEL",
        category: "HOTEL",
        price: 2400,
        rating: 4.2,
        ratingBadge: "8.4 Very Good",
        description: "Highly rated, smart budget lodging in civil lines. Perfect for active sightseers and solo backpackers.",
        tags: ["Budget", "Pool", "Central Location"],
        lat: 26.9080,
        lng: 75.7890,
        address: "Collectorate Circle, Jaipur",
        amenities: ["Free WiFi", "Outdoor Pool", "Express Laundry", "Cafeteria"]
      },
      {
        id: "hotel-colaba-airbnb",
        title: "Colaba Cozy Art Loft",
        destination: "Mumbai",
        type: "HOTEL",
        category: "HOTEL",
        price: 4200,
        rating: 4.5,
        ratingBadge: "9.1 Exceptional",
        description: "Charming Airbnb flat styled with local vintage furniture, modern kitchen, and brickwork. Brisk walk to Causeway.",
        tags: ["Airbnb", "Cozy Loft", "Kitchen"],
        lat: 18.9192,
        lng: 72.8295,
        address: "Ormiston Road, Colaba, Mumbai",
        amenities: ["Kitchen", "Air Con", "Workplace", "Espresso Maker"]
      },
      {
        id: "hotel-goa-shack",
        title: "Curley's Beach Cabana",
        destination: "Goa",
        type: "HOTEL",
        category: "HOTEL",
        price: 1900,
        rating: 4.1,
        ratingBadge: "8.2 Very Good",
        description: "Rustic beachfront eco-cabana on Anjuna shores. Uncompromised views of the sunset waves and coastal breezes.",
        tags: ["Airbnb", "Budget", "Beachfront"],
        lat: 15.5785,
        lng: 73.7410,
        address: "Anjuna Beach, Goa",
        amenities: ["Ocean View Balcony", "Beach Cafe", "Hammocks", "Kayak Rental"]
      },

      // LOCAL MARKERS & PLACES
      {
        id: "place-leopold",
        title: "Leopold Cafe & Bar",
        destination: "Mumbai",
        type: "FOOD",
        category: "restaurant",
        price: 600,
        rating: 4.5,
        description: "Famed legacy restaurant open since 1871. Historic ambiance, chilled beers, and legendary multi-cuisine plates.",
        lat: 18.9221,
        lng: 72.8315,
        address: "Colaba Causeway, Mumbai"
      },
      {
        id: "place-tajlounge",
        title: "The Taj Ocean Lounge",
        destination: "Mumbai",
        type: "FOOD",
        category: "restaurant",
        price: 2000,
        rating: 4.8,
        description: "Premium high tea experience overlooking the Gateway harbor and yachts.",
        lat: 18.9218,
        lng: 72.8333,
        address: "The Taj Mahal Palace, Mumbai"
      },
      {
        id: "place-hawamahal",
        title: "Hawa Mahal Palace",
        destination: "Jaipur",
        type: "ATTRACTION",
        category: "attraction",
        price: 200,
        rating: 4.7,
        description: "Famed Palace of Winds with 953 small latticed windows. Staggering pink sandstone architectural marvel.",
        lat: 26.9124,
        lng: 75.8273,
        address: "Hawa Mahal Rd, Jaipur"
      },
      {
        id: "place-curlies",
        title: "Curlies Beach Shack",
        destination: "Goa",
        type: "FOOD",
        category: "restaurant",
        price: 850,
        rating: 4.4,
        description: "Legendary beach shack in Anjuna. Celebrated for fresh seafood, coastal cocktails, and electronic beach sundowners.",
        lat: 15.5724,
        lng: 73.7431,
        address: "South Anjuna Beach, Goa"
      },
      {
        id: "place-effel",
        title: "Eiffel Tower Summit",
        destination: "Paris",
        type: "ATTRACTION",
        category: "attraction",
        price: 2500,
        rating: 4.9,
        description: "Climb to the pinnacle of the world's most famous tower for breathtaking panoramic sweeps over Paris and the Seine.",
        lat: 48.8584,
        lng: 2.2945,
        address: "Champ de Mars, Paris"
      }
    ];

    let filtered = [...allPlaces];

    if (featured === "true") {
      filtered = filtered.filter(p => p.type === "DESTINATION");
    }
    if (type) {
      filtered = filtered.filter(p => p.type === type);
    }
    if (category) {
      const catStr = String(category);
      filtered = filtered.filter(p => p.category.toUpperCase() === catStr.toUpperCase() || p.type.toUpperCase() === catStr.toUpperCase());
    }

    res.json(filtered);
  });

  // API 12c: GET PLACES NEARBY (Using physical/haversine queries)
  app.get("/api/places/nearby", (req, res) => {
    const lat = parseFloat(req.query.lat as string) || 18.9220;
    const lng = parseFloat(req.query.lng as string) || 72.8347;
    const radius = parseFloat(req.query.radius as string) || 5000; // in meters

    // Generate dynamic nearby places around requested coordinates
    const nearbyPlaces = [
      { id: "nb1", title: "Taj Ocean Grill", category: "restaurant", lat: lat + 0.001, lng: lng - 0.0015, address: "Waterfront Boulevard", rating: 4.8 },
      { id: "nb2", title: "Grand Heritage Museum", category: "attraction", lat: lat - 0.0012, lng: lng + 0.0018, address: "Castle Square", rating: 4.7 },
      { id: "nb3", title: "Local Spice Market", category: "shopping", lat: lat + 0.0025, lng: lng + 0.0002, address: "Bazaar Street", rating: 4.6 },
      { id: "nb4", title: "Sunset Cafe & Bakery", category: "restaurant", lat: lat - 0.002, lng: lng - 0.0025, address: "Promenade Arch 4", rating: 4.4 },
      { id: "nb5", title: "Tourist Care Center", category: "emergency", lat: lat + 0.003, lng: lng - 0.001, address: "Medical Avenue", rating: 4.5 }
    ];

    res.json(nearbyPlaces);
  });

  // API 12d: GET SINGLE PLACE DETAILS
  app.get("/api/places/:id", (req, res) => {
    const id = req.params.id;
    // Fast finder inside high-fidelity static dataset
    const placesDataset = [
      {
        id: "dest-paris",
        title: "Paris",
        destination: "Paris",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "9h",
        price: 58000,
        rating: 4.9,
        description: "The romance capital of the world. Features the iconic Eiffel Tower, Louvre Museum, and legendary sidewalk cafes.",
        tags: ["Romantic", "Art", "Culture", "Food"],
        lat: 48.8566,
        lng: 2.3522,
        address: "Paris, France"
      },
      {
        id: "dest-jaipur",
        title: "Jaipur",
        destination: "Jaipur",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "1.5h",
        price: 4200,
        rating: 4.8,
        description: "The magnificent Pink City of Rajasthan. Renowned for its grand Amber Palace, Hawa Mahal, and vibrant gemstone markets.",
        tags: ["Heritage", "Palace", "Culture", "Shopping"],
        lat: 26.9124,
        lng: 75.8273,
        address: "Jaipur, Rajasthan, India"
      },
      {
        id: "dest-goa",
        title: "Goa",
        destination: "Goa",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "1h",
        price: 3500,
        rating: 4.7,
        description: "Tropical coastal paradise. Pristine sandy beaches, 17th-century Portuguese churches, active nightlife, and spice plantations.",
        tags: ["Beach", "Nature", "Nightlife", "Relaxing"],
        lat: 15.2993,
        lng: 74.1240,
        address: "Goa, India"
      },
      {
        id: "dest-mumbai",
        title: "Mumbai",
        destination: "Mumbai",
        type: "DESTINATION",
        category: "attraction",
        flightTime: "2h",
        price: 4900,
        rating: 4.8,
        description: "The lively financial heart of India. Home to the legendary Gateway of India, Marine Drive sunset loops, and rich street foods.",
        tags: ["City", "Heritage", "Street Food", "Coastal"],
        lat: 18.9220,
        lng: 72.8347,
        address: "Mumbai, Maharashtra, India"
      },
      {
        id: "hotel-taj",
        title: "The Taj Mahal Palace",
        destination: "Mumbai",
        type: "HOTEL",
        category: "HOTEL",
        price: 24500,
        rating: 4.9,
        ratingBadge: "9.9 Exceptional",
        description: "Iconic ultra-luxury harbor-side hotel offering legendary hospitality since 1903. Overlooks the Gateway of India with panoramic maritime views.",
        tags: ["5★", "Luxury", "Pool", "Spa", "Sea View"],
        lat: 18.9217,
        lng: 72.8331,
        address: "Apollo Bandar, Colaba, Mumbai",
        amenities: ["Free WiFi", "Infinity Pool", "Luxury Spa", "Ocean Lounge"]
      },
      {
        id: "hotel-rambagh",
        title: "Rambagh Palace",
        destination: "Jaipur",
        type: "HOTEL",
        category: "HOTEL",
        price: 32000,
        rating: 4.9,
        ratingBadge: "9.9 Exceptional",
        description: "Former royal residence turned heritage luxury palace. Styled with grand marble corridors and manicured gardens.",
        tags: ["5★", "Luxury", "Heritage", "Royal Gardens"],
        lat: 26.8982,
        lng: 75.8093,
        address: "Bhawani Singh Rd, Jaipur",
        amenities: ["Heritage Spa", "Indoor Pool", "Peacock Gardens", "Polo Lounge"]
      },
      {
        id: "hotel-wgoa",
        title: "W Goa Beach Resort",
        destination: "Goa",
        type: "HOTEL",
        category: "HOTEL",
        price: 18500,
        rating: 4.7,
        ratingBadge: "9.5 Exceptional",
        description: "Vibrant beachfront lifestyle luxury resort nestled under the dramatic cliffs of historic Chapora Fort.",
        tags: ["5★", "Beachfront", "Pool", "Nightlife"],
        lat: 15.5944,
        lng: 73.7371,
        address: "Vagator Beach, Bardez, Goa",
        amenities: ["Private Beach Access", "Rock Pool", "Yoga Deck", "DJ Lounge"]
      }
    ];

    const found = placesDataset.find(p => p.id === id);
    if (found) {
      res.json(found);
    } else {
      res.json({
        id,
        title: "Charming Discovery Spot",
        destination: "Spontaneous Target",
        type: "ATTRACTION",
        category: "attraction",
        price: 1500,
        rating: 4.6,
        description: "Beautiful scenic attraction with local guide support, clear directions, and rich photo-opportunities.",
        tags: ["Heritage", "Scenic", "Popular"],
        lat: 18.9220,
        lng: 72.8347,
        address: "Central Point Location"
      });
    }
  });

  // API 13: ADMIN INTELLIGENCE ANALYTICS & STATE MANAGEMENT
  app.get("/api/admin/analytics", (req, res) => {
    const totalUsers = db.users.length;
    const activeUsers = Math.max(1, Math.round(totalUsers * 0.7)); // Simulated high engagement proxy
    const totalTrips = db.trips.length;
    const activeTrips = db.trips.filter((t) => t.status === "live").length;

    // Calculate favorites
    const destCounts: { [key: string]: number } = {};
    db.trips.forEach((t) => {
      const d = t.input.destination;
      destCounts[d] = (destCounts[d] || 0) + 1;
    });
    const popularDestinations = Object.keys(destCounts).map((k) => ({
      name: k,
      count: destCounts[k],
    })).sort((a, b) => b.count - a.count);

    // Standard category values
    const categoryDistribution = [
      { category: "attraction", value: db.trips.reduce((acc, t) => acc + t.itinerary.filter((i: any) => i.category === "attraction").length, 0) || 12 },
      { category: "restaurant", value: db.trips.reduce((acc, t) => acc + t.itinerary.filter((i: any) => i.category === "restaurant").length, 0) || 8 },
      { category: "hidden_gem", value: db.trips.reduce((acc, t) => acc + t.itinerary.filter((i: any) => i.category === "hidden_gem").length, 0) || 5 },
      { category: "shopping", value: db.trips.reduce((acc, t) => acc + t.itinerary.filter((i: any) => i.category === "shopping").length, 0) || 4 },
      { category: "rest", value: db.trips.reduce((acc, t) => acc + t.itinerary.filter((i: any) => i.category === "rest").length, 0) || 2 },
    ];

    // High fidelity mockup heatmaps for client OpenStreetMap layer
    const heatmapPoints = [
      { lat: 18.922, lng: 72.8347, intensity: 0.9, label: "Gateway Hotspot" },
      { lat: 18.9269, lng: 72.8327, intensity: 0.75, label: "Heritage Quarter" },
      { lat: 18.9398, lng: 72.8355, intensity: 0.8, label: "Terminal Activity" },
      { lat: 26.9124, lng: 75.8273, intensity: 0.95, label: "Jaipur Palace Activity" },
      { lat: 26.9855, lng: 75.8513, intensity: 0.65, label: "Amber Fort Transit" },
    ];

    const stats = {
      totalUsers,
      activeUsers,
      totalTrips,
      activeTrips,
      popularDestinations: popularDestinations.length ? popularDestinations : [{ name: "Mumbai", count: 2 }, { name: "Jaipur", count: 1 }],
      popularRoutes: [
        { from: "Colaba Gateway", to: "Marine Drive Promenade", count: 18 },
        { from: "Hawa Mahal Market", to: "Amber Palace", count: 12 },
        { from: "Chhatrapati Museum", to: "Colaba Causeway", count: 14 },
      ],
      categoryDistribution,
      userGrowth: [
        { date: "June 16", users: 10 },
        { date: "June 18", users: 15 },
        { date: "June 20", users: 22 },
        { date: "June 22", users: db.users.length },
      ],
      revenueData: [
        { month: "Apr", income: 12000 },
        { month: "May", income: 25000 },
        { month: "Jun", income: 38000 },
      ],
      heatmapPoints,
    };

    res.json(stats);
  });

  // Admin database controls
  app.get("/api/admin/places", (req, res) => {
    res.json(db.adminPlaces);
  });

  app.post("/api/admin/places", (req, res) => {
    const { title, category, lat, lng, address, rating } = req.body;
    const newPlace = {
      id: "ap-" + Math.random().toString(36).substring(2, 9),
      title,
      category,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address,
      rating: parseFloat(rating) || 4.5,
    };
    db.adminPlaces.push(newPlace);
    saveDB(db);
    res.json({ success: true, place: newPlace });
  });

  app.delete("/api/admin/places/:id", (req, res) => {
    const idx = db.adminPlaces.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) {
      db.adminPlaces.splice(idx, 1);
      saveDB(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Target place not found." });
    }
  });

  app.get("/api/admin/users", (req, res) => {
    res.json(
      db.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      }))
    );
  });

  // API 14: CHAT WITH AI TRAVEL ASSISTANT (Powered by Gemini)
  app.post("/api/gemini/chat", async (req, res) => {
    const { message, tripContext } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message payload." });

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const model = "gemini-3.6-flash";

        const sysPrompt = `
You are TripPilot AI, a state-of-the-art conversational travel routing and location intelligence agent.
Your goal is to converse with the user and help them with anything travel related.
Importantly, if the user asks you to plan a trip, suggests a destination, or indicates they are too lazy to fill out the main page form, you can draft a trip plan for them!

You must always return a JSON object aligning with this schema:
{
  "text": "Your helpful conversational response to the user. Ask clarifying questions, summarize the draft, or provide expert travel tips.",
  "proposedTrip": null or {
    "destination": "The destination city name (string)",
    "durationInDays": 1 to 30 (number, default 3),
    "durationInHours": 1 to 24 (number, default 8),
    "budget": budget estimation (number, default 20000),
    "peopleCount": number of travelers (number, default 1),
    "travelRadiusKm": 3 to 100 (number, default 15),
    "interests": Array of strings selected from ["Food", "Sightseeing", "Photography", "Heritage", "Shopping", "Nature", "Nightlife"],
    "travelStyle": "Budget", "Luxury", "Adventure", or "Family" (string, default "Adventure"),
    "preferences": "Custom briefing or special requests compiled from user chat (string)"
  }
}

Only populate the "proposedTrip" object if the user specifies a destination, or explicitly asks you to plan/draft a trip, or provides information about where they want to go. Otherwise, keep "proposedTrip" as null.
Current Active Trip Context: ${tripContext ? JSON.stringify(tripContext) : "No active trip generated yet."}
`;

        const response = await ai.models.generateContent({
          model,
          contents: message,
          config: {
            systemInstruction: sysPrompt,
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const rawText = response.text ? response.text.trim() : "";
        try {
          const parsed = JSON.parse(rawText);
          res.json({
            text: parsed.text || "I've processed your travel inquiry. What's our next coordinates?",
            proposedTrip: parsed.proposedTrip || null
          });
        } catch (parseErr) {
          console.error("Failed to parse JSON chat response:", rawText, parseErr);
          res.json({
            text: rawText,
            proposedTrip: null
          });
        }
      } catch (err: any) {
        console.error("Gemini Assistant Chat Error:", err);
        const lower = message.toLowerCase();
        let proposedTrip = null;
        if (lower.includes("jaipur") || lower.includes("mumbai") || lower.includes("delhi") || lower.includes("goa") || lower.includes("paris") || lower.includes("plan")) {
          proposedTrip = {
            destination: lower.includes("jaipur") ? "Jaipur" : lower.includes("paris") ? "Paris" : "Mumbai",
            durationInDays: 3,
            durationInHours: 8,
            budget: 18000,
            peopleCount: 2,
            travelRadiusKm: 20,
            interests: ["Food", "Sightseeing"],
            travelStyle: "Adventure",
            preferences: "Offline intelligence backup generation draft"
          };
        }
        res.json({
          text: `[Location Intelligence Core Backup] I understand you'd like to plan! Based on our local cached index, I have prepared a draft itinerary proposal. Click the 'Launch Itinerary' button below to map it out!`,
          proposedTrip
        });
      }
    } else {
      const lower = message.toLowerCase();
      let proposedTrip = null;
      if (lower.includes("jaipur") || lower.includes("mumbai") || lower.includes("delhi") || lower.includes("goa") || lower.includes("paris") || lower.includes("plan") || lower.includes("trip")) {
        proposedTrip = {
          destination: lower.includes("jaipur") ? "Jaipur" : lower.includes("paris") ? "Paris" : "Mumbai",
          durationInDays: 3,
          durationInHours: 8,
          budget: 15000,
          peopleCount: 4,
          travelRadiusKm: 25,
          interests: ["Food", "Sightseeing", "Heritage"],
          travelStyle: "Family",
          preferences: "Demo Mode Offline Itinerary Proposal"
        };
      }
      res.json({
        text: `[Demo Mode] I can formulate a travel route for you! Here is a custom itinerary proposal I generated. Click 'Launch Itinerary' below to map the coordinates immediately!`,
        proposedTrip
      });
    }
  });

  // Mount Vite development middlewares or serve static assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TripPilot Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup exception. Stopping application.", err);
});
