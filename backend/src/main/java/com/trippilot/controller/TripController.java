package com.trippilot.controller;

import com.trippilot.dto.request.*;
import com.trippilot.entity.ItineraryItem;
import com.trippilot.entity.Trip;
import com.trippilot.service.TripService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) { this.tripService = tripService; }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateTrip(@RequestBody GenerateTripRequest req) {
        Trip trip = tripService.generateTrip(req);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("usedAI", false);
        resp.put("trip", trip);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Trip>> getTripsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(tripService.getTripsByUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Trip> getTrip(@PathVariable String id) {
        return ResponseEntity.ok(tripService.getTrip(id));
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable String id, @RequestBody TripStatusRequest req) {
        Trip trip = tripService.updateTripStatus(id, req.getStatus(), req.getCurrentLocationIdx());
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("trip", trip);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/itinerary/add")
    public ResponseEntity<Map<String, Object>> addItem(@PathVariable String id, @RequestBody AddItineraryItemRequest req) {
        Trip trip = tripService.addItineraryItem(id, req);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("trip", trip);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/itinerary/{itemId}/toggle")
    public ResponseEntity<Map<String, Object>> toggleItem(@PathVariable String id, @PathVariable String itemId, @RequestBody ToggleItemRequest req) {
        ItineraryItem item = tripService.toggleItem(id, itemId, req.getCompleted());
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("item", item);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/itinerary/{itemId}/swap")
    public ResponseEntity<Map<String, Object>> swapItem(@PathVariable String id, @PathVariable String itemId) {
        Trip trip = tripService.swapItineraryItem(id, itemId);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("trip", trip);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/itinerary/{itemId}/vote")
    public ResponseEntity<Map<String, Object>> voteItem(@PathVariable String id, @PathVariable String itemId, @RequestBody VoteRequest req) {
        ItineraryItem item = tripService.voteItem(id, itemId, req.getVote());
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("item", item);
        return ResponseEntity.ok(resp);
    }
}
