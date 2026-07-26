/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Users, MapPin, BarChart3, TrendingUp, Sparkles, Map, Plus, Trash2, ShieldAlert, DollarSign, Activity } from "lucide-react";
import { AdminStats, AdminPlace } from "../types";
import MapContainer from "./MapContainer";
import { getAdminAnalytics, getAdminPlaces, createAdminPlace, deleteAdminPlace, getAdminUsers } from '../api/adminApi';

interface AdminPanelProps {
  adminUserId: string;
}

export default function AdminPanel({ adminUserId }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "users" | "places">("analytics");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Place Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"restaurant" | "attraction" | "hidden_gem" | "shopping" | "hotel">("attraction");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRating, setNewRating] = useState("4.8");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, placesData, usersData] = await Promise.all([
        getAdminAnalytics(),
        getAdminPlaces(),
        getAdminUsers(),
      ]);
      setStats(statsData);
      setPlaces(placesData);
      setUsers(usersData);
    } catch (e) {
      console.error("Error reading admin analytics datasets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newLat || !newLng || !newAddress) return;

    try {
      const res = await createAdminPlace({
          title: newTitle,
          category: newCategory,
          lat: parseFloat(newLat),
          lng: parseFloat(newLng),
          address: newAddress,
          rating: parseFloat(newRating),
        });

      if (res) {
        setNewTitle("");
        setNewLat("");
        setNewLng("");
        setNewAddress("");
        setFormSuccess("Geospatial place index added successfully!");
        setTimeout(() => setFormSuccess(""), 4000);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlace = async (id: string) => {
    if (!confirm("Are you certain you wish to delete this place index?")) return;
    try {
      await deleteAdminPlace(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500 font-sans">
        <Activity className="w-10 h-10 animate-spin text-slate-900 mb-4" />
        <p className="text-sm font-medium">Synchronizing control intelligence core...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Panel */}
      <div className="bg-[#1A1A1A] text-[#FBFBF9] p-6 rounded-none border border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#F27D26] text-white text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-none animate-pulse">
              Live Inspector Mode
            </span>
            <span className="text-[9px] text-[#FBFBF9]/60 font-mono">NODE ID: {adminUserId}</span>
          </div>
          <h1 className="text-3xl font-serif italic mt-1 text-[#FBFBF9]">Travel Intelligence Control Center</h1>
          <p className="text-xs text-[#FBFBF9]/80 mt-1">Monitor geospatial influx patterns, heatmap points, registered users, and active itineraries.</p>
        </div>

        <div className="flex bg-[#2C2C2A] p-1 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-none transition ${
              activeTab === "analytics" ? "bg-white text-slate-950" : "hover:text-white text-slate-300"
            }`}
          >
            Analytics & Heatmap
          </button>
          <button
            onClick={() => setActiveTab("places")}
            className={`px-3 py-1.5 rounded-none transition ${
              activeTab === "places" ? "bg-white text-slate-950" : "hover:text-white text-slate-100"
            }`}
          >
            Places Index
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-none transition ${
              activeTab === "users" ? "bg-white text-slate-950" : "hover:text-white text-slate-100"
            }`}
          >
            System Users
          </button>
        </div>
      </div>

      {/* Analytics & Spatial Map Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Platform Ingress</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalUsers || 2}</h3>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">▲ 100% register rate</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Active Sessions</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.activeUsers || 2}</h3>
                <p className="text-[10px] text-indigo-600 font-semibold mt-1">● 70% retention proxy</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Consolidated Trips</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalTrips || 1}</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">{stats?.activeTrips || 1} in live guidance</p>
              </div>
              <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Projected Income</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">₹38k</h3>
                <p className="text-[10px] text-slate-550 mt-1 font-mono">Enterprise SAAS</p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap Location Visualizer */}
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Map className="w-4 h-4 text-slate-900 animate-pulse" />
                    Geospatial Density Heatmap
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Heat dispersion representing dense navigation corridors.</p>
                </div>
                <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  Real-time GPS nodes
                </span>
              </div>

              {/* map canvas */}
              <div className="h-[280px] md:h-[360px] rounded-2xl overflow-hidden relative">
                <MapContainer
                  items={[]}
                  heatmapPoints={stats?.heatmapPoints}
                  isAdminMode={true}
                />
              </div>
            </div>

            {/* Travel metrics tables & lists */}
            <div className="space-y-6">
              {/* Popular destinations list */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  Popular Destinations
                </h3>
                <div className="divide-y divide-slate-150">
                  {stats?.popularDestinations.map((dest, idx) => (
                    <div key={dest.name} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{dest.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{dest.count} trips generated</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Influx Paths */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Heavy Congestion Routes
                </h3>
                <div className="space-y-2.5">
                  {stats?.popularRoutes.map((route, i) => (
                    <div key={i} className="text-[11px]">
                      <div className="flex justify-between items-center text-slate-700 font-medium">
                        <span className="truncate max-w-[170px]">{route.from}</span>
                        <span className="text-slate-400">➜</span>
                        <span className="truncate max-w-[170px]">{route.to}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full" 
                            style={{ width: `${(route.count / 20) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 font-bold">{route.count} checks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Places Tab */}
      {activeTab === "places" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add custom geospatial spot */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Index Smart Spot
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Publish custom location nodes. These will automatically feed user search clusters.</p>
            </div>

            {formSuccess && (
              <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleAddPlace} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">Spot Name</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Leopold Cafe, Bandra Stand"
                  className="w-full bg-slate-50 rounded-xl border border-slate-250 py-2 px-3 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="18.9221"
                    className="w-full bg-slate-50 rounded-xl border border-slate-250 py-2 px-3 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    placeholder="72.8315"
                    className="w-full bg-slate-50 rounded-xl border border-slate-250 py-2 px-3 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">Address Descriptors</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Colaba Causeway, Fort Mumbai"
                  className="w-full bg-slate-50 rounded-xl border border-slate-250 py-2 px-3 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">Class/Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-50 rounded-xl border border-slate-250 py-2 px-3 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                >
                  <option value="attraction">Attraction</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hidden_gem">Hidden Gem</option>
                  <option value="shopping">Shopping</option>
                  <option value="hotel">Hotel</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">Popularity Rating</label>
                <input
                  type="number"
                  step="0.1"
                  max="5"
                  required
                  value={newRating}
                  onChange={(e) => setNewRating(e.target.value)}
                  className="w-full bg-slate-50 rounded-xl border border-slate-250 py-2 px-3 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-950 hover:bg-slate-800 text-white font-medium py-2 rounded-xl text-xs transition"
              >
                Register Spot Index
              </button>
            </form>
          </div>

          {/* List existing spots */}
          <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Geospatial Place Indexes</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Overview of coordinates mapped for live routing optimizations.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                    <th className="py-2">Name</th>
                    <th className="py-2">Class</th>
                    <th className="py-2">GPS Coords</th>
                    <th className="py-2">Address</th>
                    <th className="py-2">Rating</th>
                    <th className="py-2 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {places.map((place) => (
                    <tr key={place.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">{place.title}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                          {place.category}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-[10px]/normal text-slate-600">
                        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                      </td>
                      <td className="py-3 truncate max-w-[153px]">{place.address}</td>
                      <td className="py-3 font-mono font-bold text-amber-600">★ {place.rating}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeletePlace(place.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users management list */}
      {activeTab === "users" && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">System Users Directory</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Control registered accounts, credentials state, and user authorization levels.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-2 pb-3">User Token</th>
                  <th className="py-2 pb-3">Name</th>
                  <th className="py-2 pb-3">Email Address</th>
                  <th className="py-2 pb-3">System Access Role</th>
                  <th className="py-2 pb-3">Subscription</th>
                  <th className="py-2 pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="py-3 fs border-slate-100 font-mono text-slate-500">{user.id}</td>
                    <td className="py-3 border-slate-100 font-bold text-slate-900">{user.name}</td>
                    <td className="py-3 border-slate-100">{user.email}</td>
                    <td className="py-3 border-slate-100">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-wider font-extrabold uppercase ${
                        user.role === "admin" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 border-slate-100 text-zinc-500">Enterprise</td>
                    <td className="py-3 border-slate-100 text-right">
                      <span className="flex items-center justify-end gap-1.5 text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
