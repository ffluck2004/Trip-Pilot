package com.trippilot.service;

import com.trippilot.entity.Place;
import com.trippilot.repository.PlaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
public class PlaceService {

    private final PlaceRepository placeRepo;

    public PlaceService(PlaceRepository placeRepo) {
        this.placeRepo = placeRepo;
    }

    public List<Place> getPlaces(String featured, String type, String category) {
        if ("true".equalsIgnoreCase(featured)) {
            return placeRepo.findByType("DESTINATION");
        }
        if (type != null && category != null) {
            return placeRepo.findByTypeAndCategoryIgnoreCase(type, category);
        }
        if (type != null) return placeRepo.findByType(type);
        if (category != null) return placeRepo.findByCategoryIgnoreCase(category);
        return placeRepo.findAll();
    }

    public Place getPlace(String id) {
        return placeRepo.findById(id).orElseGet(() -> {
            Place fallback = new Place();
            fallback.setId(id);
            fallback.setTitle("Charming Discovery Spot");
            fallback.setDestination("Spontaneous Target");
            fallback.setType("ATTRACTION");
            fallback.setCategory("attraction");
            fallback.setLat(18.922);
            fallback.setLng(72.8347);
            fallback.setAddress("Central Point Location");
            return fallback;
        });
    }

    public List<Map<String, Object>> getNearbyPlaces(double lat, double lng) {
        // Generate 5 synthetic nearby places
        String[] titles = {"Local Food Court", "City Park", "Shopping District", "Heritage Cafe", "Medical Centre"};
        String[] cats = {"restaurant", "attraction", "shopping", "restaurant", "emergency"};
        double[][] offsets = {{0.003, 0.002}, {-0.002, 0.004}, {0.005, -0.001}, {-0.003, -0.003}, {0.001, 0.005}};

        List<Map<String, Object>> places = new java.util.ArrayList<>();
        for (int i = 0; i < 5; i++) {
            places.add(Map.ofEntries(
                Map.entry("id", "nearby-" + (i + 1)),
                Map.entry("title", titles[i]),
                Map.entry("destination", "Nearby"),
                Map.entry("type", "LOCAL"),
                Map.entry("category", cats[i]),
                Map.entry("price", 200 + i * 100),
                Map.entry("rating", 4.0 + (i % 3) * 0.3),
                Map.entry("description", "A popular " + cats[i] + " spot near your location."),
                Map.entry("tags", List.of("Popular", "Local")),
                Map.entry("address", "Near " + lat + ", " + lng),
                Map.entry("lat", lat + offsets[i][0]),
                Map.entry("lng", lng + offsets[i][1])
            ));
        }
        return places;
    }
}
