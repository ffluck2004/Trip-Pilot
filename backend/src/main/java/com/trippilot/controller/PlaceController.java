package com.trippilot.controller;

import com.trippilot.entity.Place;
import com.trippilot.service.PlaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/places")
public class PlaceController {

    private final PlaceService placeService;

    public PlaceController(PlaceService placeService) { this.placeService = placeService; }

    @GetMapping
    public ResponseEntity<List<Place>> getPlaces(
            @RequestParam(required = false) String featured,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(placeService.getPlaces(featured, type, category));
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<Map<String, Object>>> getNearby(
            @RequestParam(defaultValue = "18.9220") double lat,
            @RequestParam(defaultValue = "72.8347") double lng) {
        return ResponseEntity.ok(placeService.getNearbyPlaces(lat, lng));
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchPlaces(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "5000") int radius) {
        return ResponseEntity.ok(Map.of("success", true, "places", List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Place> getPlace(@PathVariable String id) {
        return ResponseEntity.ok(placeService.getPlace(id));
    }
}
