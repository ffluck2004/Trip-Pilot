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
        String[] destinations = {"mumbai", "delhi", "jaipur", "goa", "varanasi", "manali", "shimla", "agra", "udaipur", "kerala", "kochi", "ladakh", "kashmir", "thane", "nagpur", "bhopal", "lucknow", "london", "paris", "tokyo", "bangkok", "thailand", "bali", "singapore", "dubai", "amsterdam", "switzerland", "new york", "rome"};
        String dest = null;
        for (String d : destinations) {
            if (msg.contains(d)) { dest = d; break; }
        }
        if (dest == null) return null;

        Map<String, Object> trip = new LinkedHashMap<>();
        trip.put("destination", dest.substring(0, 1).toUpperCase() + dest.substring(1));

        // Parse duration like "3 days" / "5-day" / "weekend" (default 3)
        int days = 3;
        java.util.regex.Matcher dayMatch = java.util.regex.Pattern.compile("(\\d+)\\s*(?:-?\\s*)?(?:days?|day)").matcher(msg);
        if (dayMatch.find()) days = Math.min(30, Math.max(1, Integer.parseInt(dayMatch.group(1))));
        else if (msg.contains("weekend")) days = 2;
        trip.put("durationInDays", days);

        // Parse budget like "20000", "₹50,000", "budget of 20000", "20k", "1 lakh" (default 15000)
        long budget = 15000;
        String lowerMsg = msg.toLowerCase();
        long raw = -1;
        String unit = null;
        java.util.regex.Matcher budMatch = java.util.regex.Pattern.compile("(?:budget\\s*(?:of\\s*)?|₹|inr\\s*|rs\\s*)(\\d+(?:[.,]\\d+)?)").matcher(lowerMsg);
        if (budMatch.find()) {
            raw = Long.parseLong(budMatch.group(1).replaceAll("[.,]", ""));
        } else {
            java.util.regex.Matcher shortMatch = java.util.regex.Pattern.compile("(\\d+)\\s*(k|lakh)").matcher(lowerMsg);
            if (shortMatch.find()) {
                raw = Long.parseLong(shortMatch.group(1));
                unit = shortMatch.group(2);
            } else {
                java.util.regex.Matcher plainMatch = java.util.regex.Pattern.compile("(\\d{4,7})").matcher(lowerMsg);
                if (plainMatch.find()) raw = Long.parseLong(plainMatch.group(1));
            }
        }
        if (raw > 0) {
            if (unit != null && unit.startsWith("k")) raw *= 1000;
            if (unit != null && unit.startsWith("lakh")) raw *= 100000;
            budget = Math.max(2000, Math.min(2000000, raw));
        }
        trip.put("budget", budget);
        trip.put("peopleCount", 2);
        trip.put("travelRadiusKm", 25);

        // Extract interests from message keywords
        java.util.List<String> interests = new java.util.ArrayList<>();
        if (msg.contains("food") || msg.contains("restaurant") || msg.contains("dhaba")) interests.add("Food");
        if (msg.contains("beach")) interests.add("Beach");
        if (msg.contains("shopping") || msg.contains("mall")) interests.add("Shopping");
        if (msg.contains("temple") || msg.contains("heritage") || msg.contains("culture") || msg.contains("history")) interests.add("Heritage");
        if (msg.contains("nightlife") || msg.contains("party") || msg.contains("club")) interests.add("Nightlife");
        if (msg.contains("nature") || msg.contains("trek") || msg.contains("hike") || msg.contains("mountain")) interests.add("Nature");
        if (msg.contains("photography") || msg.contains("photo")) interests.add("Photography");
        if (interests.isEmpty()) interests.add("Sightseeing");
        trip.put("interests", interests);

        // Travel style from message keywords
        String style = "Balanced";
        if (msg.contains("luxury") || msg.contains("5 star")) style = "Luxury";
        else if (msg.contains("budget") || msg.contains("cheap") || msg.contains("affordable")) style = "Budget";
        else if (msg.contains("adventure") || msg.contains("trek") || msg.contains("hike")) style = "Adventure";
        else if (msg.contains("family") || msg.contains("kids")) style = "Family";
        else if (msg.contains("solo")) style = "Solo";
        trip.put("travelStyle", style);
        trip.put("preferences", "Spontaneous request: " + msg);
        return trip;
    }
}
