/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TravelPreferences {
  styles: string[]; // e.g., Solo, Couple, Friends, Family, Business, Luxury, Budget, Adventure, etc.
  interests: string[]; // e.g., Food, Sightseeing, Photography, History, Shopping, Nightlife, Nature
  favoriteDestinations?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferences: TravelPreferences;
  createdAt: string;
}

export interface TripInput {
  destination: string;
  durationInDays: number;
  durationInHours?: number; // Optional hourly duration if daily is 1
  budget: number;
  peopleCount: number;
  travelRadiusKm: number; // e.g., 3, 5, 10, or 9999 for unlimited
  interests: string[];
  travelStyle: string;
  preferences?: string;
}

export interface ItineraryItem {
  id: string;
  day: number; // 1-based, or hour-offset if hourly
  timeSlot: string; // e.g. "09:00 - 10:30"
  title: string;
  description: string;
  category: 'restaurant' | 'attraction' | 'hidden_gem' | 'shopping' | 'rest' | 'emergency' | 'hotel';
  lat: number;
  lng: number;
  costEstimation: number;
  estimatedDurationMinutes: number;
  address: string;
  imageUrl?: string;
  // Route indicators
  distanceFromPreviousKm?: number;
  travelTimeFromPreviousMinutes?: number;
  // Interactive Live Status
  isCompleted?: boolean;
  upvotes?: number;
  downvotes?: number;
}

export interface Trip {
  id: string;
  userId: string;
  input: TripInput;
  itinerary: ItineraryItem[];
  optimizedOrder: string[]; // Order of itinerary item IDs
  plannedBudget: number;
  actualSpending: number;
  status: 'planning' | 'live' | 'completed';
  createdAt: string;
  // Track Live Trip Mode State
  currentLocationIdx?: number;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Accommodation' | 'Activity' | 'Shopping' | 'Misc';
  description: string;
  date: string;
}

export interface Reservation {
  id: string;
  userId: string;
  tripId?: string;
  type: 'Hotel' | 'Airbnb' | 'Restaurant' | 'Event' | 'Transport' | 'Flight';
  title: string;
  confirmationCode: string;
  dateTime: string;
  details: string;
  cost: number;
}

// Admin Panel Analytics Interfaces
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTrips: number;
  activeTrips: number;
  popularDestinations: { name: string; count: number }[];
  popularRoutes: { from: string; to: string; count: number }[];
  categoryDistribution: { category: string; value: number }[];
  userGrowth: { date: string; users: number }[];
  revenueData: { month: string; income: number }[];
  heatmapPoints: { lat: number; lng: number; intensity: number; label: string }[];
}

export interface AdminPlace {
  id: string;
  title: string;
  category: 'restaurant' | 'attraction' | 'hidden_gem' | 'shopping' | 'hotel';
  lat: number;
  lng: number;
  address: string;
  rating: number;
}
