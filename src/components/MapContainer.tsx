/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import { ItineraryItem } from "../types";

interface MapContainerProps {
  items: ItineraryItem[];
  activeIndex?: number;
  highlightedItem?: ItineraryItem | null;
  radiusKm?: number;
  centerCoords?: [number, number];
  heatmapPoints?: { lat: number; lng: number; intensity: number; label: string }[];
  isAdminMode?: boolean;
}

export default function MapContainer({
  items,
  activeIndex = 0,
  highlightedItem,
  radiusKm,
  centerCoords,
  heatmapPoints,
  isAdminMode = false,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Determine initial center
    let initialLat = 18.922; // default Mumbai Gateway
    let initialLng = 72.8347;

    if (centerCoords) {
      initialLat = centerCoords[0];
      initialLng = centerCoords[1];
    } else if (highlightedItem) {
      initialLat = highlightedItem.lat;
      initialLng = highlightedItem.lng;
    } else if (items.length > 0) {
      initialLat = items[0].lat;
      initialLng = items[0].lng;
    }

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([initialLat, initialLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [centerCoords]); // Small reconstruct when base pivot area changes

  // Synchronize Markers and routes when relevant props update
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old elements
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    // 1. Admin Heatmap Rendering
    if (isAdminMode && heatmapPoints && heatmapPoints.length > 0) {
      heatmapPoints.forEach((point) => {
        // Draw elegant glowing activity circles
        const color = point.intensity > 0.8 ? "#ef4444" : "#f59e0b";
        const heatCircle = L.circle([point.lat, point.lng], {
          radius: 350 * point.intensity,
          color: color,
          fillColor: color,
          fillOpacity: 0.45,
          weight: 1,
        }).addTo(map);

        heatCircle.bindPopup(`
          <div class="p-2 font-sans">
            <h4 class="font-bold text-slate-800 text-xs">${point.label}</h4>
            <p class="text-[10px] text-slate-500 mt-1">Geospatial Influx: ${Math.round(point.intensity * 100)}% density</p>
          </div>
        `);
        // Store as markers for cleanup representation
        markersRef.current.push(heatCircle as unknown as L.Marker);
      });

      // Fit map bounds over points
      const group = L.featureGroup(markersRef.current as unknown as L.Layer[]);
      if (markersRef.current.length > 0) {
        map.fitBounds(group.getBounds().pad(0.15));
      }
      return;
    }

    // 2. Client Trip Map Rendering
    if (items.length > 0) {
      const coords: [number, number][] = [];

      items.forEach((item, index) => {
        const isActive = index === activeIndex;
        const isHighlight = highlightedItem?.id === item.id;

        coords.push([item.lat, item.lng]);

        // Dynamic pin custom styling (Vector HTML Div icons to bypass missing asset path glitches)
        let pinColor = "#64748b"; // Generic gray for future steps
        let pinSize = "24px";
        let ringEffect = "";

        if (item.category === "restaurant") pinColor = "#f97316"; // Orange
        else if (item.category === "attraction") pinColor = "#3b82f6"; // Blue
        else if (item.category === "hidden_gem") pinColor = "#8b5cf6"; // Purple
        else if (item.category === "shopping") pinColor = "#ec4899"; // Pink
        else if (item.category === "rest") pinColor = "#10b981"; // Green
        else if (item.category === "emergency") pinColor = "#ef4444"; // Red

        // Adjust for current active journey step or highlights
        if (isActive) {
          pinSize = "34px";
          ringEffect = "animate-ping opacity-60 absolute duration-1000 inline-flex h-full w-full rounded-full bg-slate-900";
        } else if (isHighlight) {
          pinSize = "32px";
          ringEffect = "ring-4 ring-offset-2 ring-violet-500 animate-pulse";
        }

        const iconHtml = `
          <div class="relative flex items-center justify-center" style="width: ${pinSize}; height: ${pinSize};">
            <div class="${ringEffect}" style="background-color: ${pinColor}; border-radius: 50%; width: 100%; height: 100%; position: absolute; opacity: 0.25;"></div>
            <div class="flex items-center justify-center text-[10px] text-white font-bold rounded-full shadow-lg border border-white relative z-10" style="background-color: ${pinColor}; width: 80%; height: 80%;">
              ${index + 1}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-leaflet-pin",
          iconSize: [parseInt(pinSize), parseInt(pinSize)],
          iconAnchor: [parseInt(pinSize) / 2, parseInt(pinSize) / 2],
        });

        // Instantiate leaflet marker
        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);

        // Standard neat popup details
        marker.bindPopup(`
          <div class="p-2 font-sans max-w-[200px]">
            <span class="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white mb-1.5" style="background-color: ${pinColor};">
              ${item.category.replace("_", " ")}
            </span>
            <h4 class="font-bold text-slate-800 text-xs">${item.title}</h4>
            <p class="text-[10px] text-slate-500 mt-1">${item.description.slice(0, 80)}...</p>
            <div class="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-600 font-mono">
              <span>Duration: ${item.estimatedDurationMinutes}m</span>
              <span class="font-bold text-slate-900">Est. Cost: ₹{item.costEstimation}</span>
            </div>
          </div>
        `);

        markersRef.current.push(marker);
      });

      // Draw routing paths (Location Intelligence core visualization)
      if (coords.length > 1) {
        polylineRef.current = L.polyline(coords, {
          color: "#0f172a", // Sleek charcoal slate route
          weight: 4,
          opacity: 0.85,
          dashArray: "8, 12", // Clean futuristic dash
        }).addTo(map);
      }

      // Draw Radius Geofence Bound circle if configured (radius in KM)
      if (radiusKm && radiusKm < 100 && coords.length > 0) {
        const center = centerCoords || coords[0];
        circleRef.current = L.circle(center, {
          radius: radiusKm * 1000,
          color: "#4f46e5",
          fillColor: "#4f46e5",
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: "4, 6",
        }).addTo(map);
      }

      // Automatically adjust camera focus bounds
      if (highlightedItem) {
        map.setView([highlightedItem.lat, highlightedItem.lng], 15);
      } else {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.18));
      }
    }
  }, [items, activeIndex, highlightedItem, radiusKm, isAdminMode, heatmapPoints]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-10">
      <div ref={mapContainerRef} className="w-full h-full min-h-[350px] md:min-h-[450px]" id="trippilot-live-map" />
      
      {/* Absolute floating legend overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/80 shadow-md z-[500] text-[10px] font-sans text-slate-700 space-y-1 max-w-[150px] pointer-events-none">
        <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1 mb-1">Location Legend</p>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Attractions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span>Restaurants</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>Hidden Gems</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
          <span>Shopping</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
          <span>Rest Points</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Emergencies</span>
        </div>
      </div>
    </div>
  );
}
