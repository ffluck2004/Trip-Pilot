package com.trippilot.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trippilot.dto.request.ChatRequest;
import com.trippilot.dto.response.ChatResponse;
import com.trippilot.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/gemini")
public class GeminiController {

    private final GeminiService geminiService;
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiController(GeminiService geminiService) { this.geminiService = geminiService; }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest req) {
        if (!geminiService.isAvailable()) {
            // Fallback: detect destination keywords
            String msg = req.getMessage().toLowerCase();
            Map<String, Object> proposed = detectTripFromMessage(msg);
            String responseText = proposed != null
                ? "I'd love to help you plan a trip! I've prepared an itinerary based on your request."
                : "I can help you plan trips! Tell me a destination, number of days, and your interests.";
            return ResponseEntity.ok(new ChatResponse(responseText, proposed));
        }

        try {
            String systemPrompt = "You are TripPilot, an intelligent travel assistant. " +
                "When a user wants to plan a trip, return a JSON with 'text' (your conversational response) " +
                "and 'proposedTrip' (an object with destination, durationInDays, durationInHours, budget, " +
                "peopleCount, travelRadiusKm, interests, travelStyle, preferences). " +
                "If the user is just chatting, return 'proposedTrip' as null. Return only valid JSON.";

            String response = geminiService.generateWithSystem(systemPrompt, req.getMessage());
            if (response != null) {
                String cleaned = response.replaceFirst("(?s)^```json\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
                JsonNode parsed = mapper.readTree(cleaned);
                String text = parsed.path("text").asText("I'm here to help with your travel plans!");
                Map<String, Object> proposed = null;
                if (parsed.has("proposedTrip") && !parsed.get("proposedTrip").isNull()) {
                    proposed = mapper.convertValue(parsed.get("proposedTrip"), Map.class);
                }
                return ResponseEntity.ok(new ChatResponse(text, proposed));
            }
        } catch (Exception e) {
            System.err.println("Gemini chat error: " + e.getMessage());
        }

        // Fallback
        String msg = req.getMessage().toLowerCase();
        Map<String, Object> proposed = detectTripFromMessage(msg);
        String text = proposed != null
            ? "Great choice! I've prepared an itinerary suggestion for you. Click confirm to generate the full plan!"
            : "I'd be happy to help plan your next adventure! Tell me where you'd like to go.";
        return ResponseEntity.ok(new ChatResponse(text, proposed));
    }

    private Map<String, Object> detectTripFromMessage(String msg) {
        String[] destinations = {"mumbai", "delhi", "jaipur", "goa", "varanasi", "manali", "london", "paris", "thane", "nagpur", "bhopal", "lucknow"};
        for (String dest : destinations) {
            if (msg.contains(dest)) {
                Map<String, Object> trip = new LinkedHashMap<>();
                trip.put("destination", dest.substring(0, 1).toUpperCase() + dest.substring(1));
                trip.put("durationInDays", 3);
                trip.put("budget", 15000);
                trip.put("peopleCount", 2);
                trip.put("travelRadiusKm", 25);
                trip.put("interests", "Food, Sightseeing");
                trip.put("travelStyle", "Balanced");
                return trip;
            }
        }
        return null;
    }
}
