package com.trippilot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trippilot.dto.request.GenerateTripRequest;
import com.trippilot.entity.ItineraryItem;
import com.trippilot.entity.Trip;
import com.trippilot.exception.BadRequestException;
import com.trippilot.exception.ResourceNotFoundException;
import com.trippilot.repository.TripRepository;
import com.trippilot.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class TripService {

    private final TripRepository tripRepo;
    private final UserRepository userRepo;
    private final GeminiService geminiService;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .executor(Executors.newFixedThreadPool(4))
            .build();

    // In-memory cache for geocoding and Overpass results (5 min TTL)
    private final ConcurrentHashMap<String, CacheEntry<?>> geoCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 5 * 60 * 1000;
    private record CacheEntry<T>(T value, long ts) { boolean isFresh() { return System.currentTimeMillis() - ts < CACHE_TTL_MS; } }

    public TripService(TripRepository tripRepo, UserRepository userRepo, GeminiService geminiService) {
        this.tripRepo = tripRepo;
        this.userRepo = userRepo;
        this.geminiService = geminiService;
    }

    // ============================================================
    // INTEREST → OVERPASS QUERY MAPPING
    // ============================================================

    private record OverpassClause(String key, String values) {}

    private List<OverpassClause> getOverpassClausesForInterests(String interests) {
        if (interests == null || interests.isBlank()) {
            return getDefaultClauses();
        }

        String lower = interests.toLowerCase();
        List<OverpassClause> clauses = new ArrayList<>();

        if (lower.contains("food") || lower.contains("restaurant") || lower.contains("dhaba")) {
            clauses.add(new OverpassClause("amenity", "restaurant|fast_food|food_court"));
            clauses.add(new OverpassClause("amenity", "bar|pub"));
            clauses.add(new OverpassClause("shop", "bakery"));
        }
        if (lower.contains("cafe")) {
            clauses.add(new OverpassClause("amenity", "cafe"));
        }
        if (lower.contains("street food")) {
            clauses.add(new OverpassClause("amenity", "fast_food|food_court"));
            clauses.add(new OverpassClause("amenity", "marketplace"));
        }
        if (lower.contains("beach")) {
            clauses.add(new OverpassClause("natural", "beach"));
            clauses.add(new OverpassClause("leisure", "beach_resort"));
        }
        if (lower.contains("hotel")) {
            clauses.add(new OverpassClause("tourism", "hotel|hostel|motel|guest_house"));
        }
        if (lower.contains("heritage") || lower.contains("history")) {
            clauses.add(new OverpassClause("historic", "monument|memorial|castle|fort|archaeological_site"));
            clauses.add(new OverpassClause("tourism", "museum"));
        }
        if (lower.contains("temple")) {
            clauses.add(new OverpassClause("amenity", "place_of_worship"));
            clauses.add(new OverpassClause("religion", "hindu"));
        }
        if (lower.contains("mosque")) {
            clauses.add(new OverpassClause("amenity", "place_of_worship"));
            clauses.add(new OverpassClause("religion", "muslim"));
        }
        if (lower.contains("photography") || lower.contains("sightseeing")) {
            clauses.add(new OverpassClause("tourism", "attraction|viewpoint|artwork|gallery"));
            clauses.add(new OverpassClause("historic", "monument|memorial|castle|fort"));
            clauses.add(new OverpassClause("natural", "peak|spring"));
        }
        if (lower.contains("nightlife")) {
            clauses.add(new OverpassClause("amenity", "bar|pub|nightclub"));
            clauses.add(new OverpassClause("amenity", "biergarten"));
        }
        if (lower.contains("nature")) {
            clauses.add(new OverpassClause("leisure", "park|garden|nature_reserve"));
            clauses.add(new OverpassClause("natural", "wood|water|spring|peak"));
            clauses.add(new OverpassClause("landuse", "forest|recreation_ground"));
        }
        if (lower.contains("shopping") || lower.contains("street shopping")) {
            clauses.add(new OverpassClause("shop", "supermarket|mall|clothes|jewelry|gift|handicraft|books|shoes|fashion"));
            clauses.add(new OverpassClause("amenity", "marketplace"));
        }
        if (lower.contains("mall")) {
            clauses.add(new OverpassClause("shop", "mall"));
            clauses.add(new OverpassClause("building", "retail|mall"));
        }
        if (lower.contains("hidden spot") || lower.contains("hidden_spot")) {
            clauses.add(new OverpassClause("tourism", "viewpoint|attraction"));
            clauses.add(new OverpassClause("natural", "spring|cave|rock|tree"));
            clauses.add(new OverpassClause("leisure", "garden|nature_reserve"));
        }
        if (lower.contains("spa") || lower.contains("parlour") || lower.contains("nail")) {
            clauses.add(new OverpassClause("shop", "beauty|hairdresser|cosmetics"));
            clauses.add(new OverpassClause("amenity", "spa|beauty"));
        }
        if (lower.contains("fun activity") || lower.contains("arcade") || lower.contains("game zone") || lower.contains("game")) {
            clauses.add(new OverpassClause("leisure", "amusement_arcade|video_arcade|bowling_alley|escape_game|water_park"));
            clauses.add(new OverpassClause("leisure", "amusement_ride|summer_camp|game_centre"));
        }
        if (lower.contains("cycling")) {
            clauses.add(new OverpassClause("leisure", "pitch|track"));
            clauses.add(new OverpassClause("shop", "bicycle|bicycle_rental"));
            clauses.add(new OverpassClause("amenity", "bicycle_rental"));
        }
        if (lower.contains("scooty") || lower.contains("scooter") || lower.contains("rental")) {
            clauses.add(new OverpassClause("shop", "motorcycle|scooter"));
            clauses.add(new OverpassClause("amenity", "motorcycle_rental"));
        }

        if (clauses.isEmpty()) {
            return getDefaultClauses();
        }
        return clauses;
    }

    private List<OverpassClause> getDefaultClauses() {
        return List.of(
            new OverpassClause("tourism", "attraction|museum|artwork|viewpoint"),
            new OverpassClause("amenity", "restaurant|cafe|fast_food|bar|pub|food_court"),
            new OverpassClause("shop", "supermarket|mall|clothes"),
            new OverpassClause("leisure", "park|garden|nature_reserve"),
            new OverpassClause("historic", "monument|memorial|castle|fort|temple|shrine")
        );
    }

    // ============================================================
    // TRIP GENERATION
    // ============================================================

    public Trip generateTrip(GenerateTripRequest req) {
        if (req.getDestination() == null || req.getDestination().isBlank() || req.getDurationInDays() == null) {
            throw new BadRequestException("Destination and duration are required.");
        }

        List<Map<String, Object>> itinerary = new ArrayList<>();
        boolean usedAI = false;

        // Try curated landmarks first for known destinations (instant, no API calls)
        itinerary = getCuratedSpots(req);

        // Try Gemini AI (only if API key is available and curated didn't cover it)
        if (itinerary.isEmpty() && geminiService.isAvailable()) {
            try {
                String prompt = buildGeminiPrompt(req);
                String response = geminiService.generateContent(prompt);
                if (response != null && !response.isBlank()) {
                    String cleaned = response.replaceFirst("(?s)^```json\\s*", "").replaceFirst("(?s)```\\s*$", "").trim();
                    JsonNode parsed = mapper.readTree(cleaned);
                    if (parsed.has("itinerary") && parsed.get("itinerary").isArray()) {
                        for (JsonNode item : parsed.get("itinerary")) {
                            itinerary.add(mapper.convertValue(item, Map.class));
                        }
                        usedAI = true;
                    }
                }
            } catch (Exception e) {
                System.err.println("Gemini AI failed, using Overpass: " + e.getMessage());
            }
        }

        // Fetch from Overpass with interest-based queries (parallel)
        if (itinerary.isEmpty()) {
            try {
                Map<String, Object> geo = geocodeDestination(req.getDestination());
                double lat = (double) geo.get("lat");
                double lng = (double) geo.get("lng");
                int requested = Math.max(req.getDurationInDays() * 6, 24);
                itinerary = fetchOverpassPlacesByInterests(lat, lng, req.getTravelRadiusKm(), req.getInterests(), requested);
            } catch (Exception e) {
                System.err.println("Overpass failed, using fallback: " + e.getMessage());
            }
        }

        // Final fallback with generic interest-based spots
        if (itinerary.isEmpty()) {
            itinerary = generateInterestSpots(req);
        }

        // Budget-aware: limit spots to what's affordable
        int maxSpots = budgetAwareSpotCount(req);
        if (itinerary.size() > maxSpots) {
            itinerary = itinerary.subList(0, maxSpots);
        }

        // Interleave categories for variety across days
        itinerary = interleaveByCategory(itinerary);

        // Build itinerary items with TSP optimization
        List<Map<String, Object>> spots = buildItinerarySlots(itinerary, req.getDurationInDays(), req.getDurationInHours());

        // TSP route optimization per day
        spots = optimizeRoutes(spots);

        // Persist
        Trip trip = new Trip();
        trip.setId("trip-" + randomId());
        String userId = req.getUserId();
        if (userId == null || userId.isBlank() || !userRepo.existsById(userId)) {
            userId = "guest-id";
        }
        trip.setUserId(userId);
        trip.setDestination(req.getDestination());
        trip.setDurationDays(req.getDurationInDays());
        trip.setDurationHours(req.getDurationInHours());
        trip.setBudget(req.getBudget());
        trip.setPeopleCount(req.getPeopleCount() != null ? req.getPeopleCount() : 1);
        trip.setTravelRadiusKm(req.getTravelRadiusKm() != null ? req.getTravelRadiusKm() : BigDecimal.valueOf(5));
        trip.setInterests(req.getInterests());
        trip.setTravelStyle(req.getTravelStyle());
        trip.setPreferencesText(req.getPreferences());
        trip.setPlannedBudget(req.getBudget());
        trip.setActualSpending(BigDecimal.ZERO);
        trip.setStatus("planning");
        trip.setCurrentLocationIdx(0);
        trip.setCreatedAt(LocalDateTime.now());

        int order = 0;
        for (Map<String, Object> itemMap : spots) {
            ItineraryItem item = new ItineraryItem();
            item.setId((String) itemMap.get("id"));
            item.setTrip(trip);
            item.setDay(toInt(itemMap.get("day")));
            item.setTimeSlot((String) itemMap.get("timeSlot"));
            item.setTitle((String) itemMap.get("title"));
            item.setDescription((String) itemMap.get("description"));
            item.setCategory((String) itemMap.get("category"));
            item.setLat(toDouble(itemMap.get("lat")));
            item.setLng(toDouble(itemMap.get("lng")));
            item.setCostEstimation(toBigDecimal(itemMap.get("costEstimation")));
            item.setDurationMinutes(toInt(itemMap.get("estimatedDurationMinutes")));
            item.setAddress((String) itemMap.get("address"));
            item.setImageUrl((String) itemMap.get("imageUrl"));
            item.setIsCompleted(false);
            item.setUpvotes(1);
            item.setDownvotes(0);
            item.setSortOrder(order++);
            trip.getItinerary().add(item);
        }

        return tripRepo.save(trip);
    }

    private int budgetAwareSpotCount(GenerateTripRequest req) {
        if (req.getBudget() == null || req.getBudget().compareTo(BigDecimal.ZERO) <= 0) return 999;
        double budget = req.getBudget().doubleValue();
        int people = req.getPeopleCount() != null ? req.getPeopleCount() : 1;
        double perPerson = budget / people;
        int avgCost = 200;
        return Math.max(4, (int) (perPerson / avgCost));
    }

    private List<Map<String, Object>> interleaveByCategory(List<Map<String, Object>> spots) {
        Map<String, List<Map<String, Object>>> groups = new LinkedHashMap<>();
        for (Map<String, Object> spot : spots) {
            String cat = (String) spot.getOrDefault("category", "attraction");
            groups.computeIfAbsent(cat, k -> new ArrayList<>()).add(spot);
        }
        if (groups.size() <= 1) return spots;

        List<Map<String, Object>> interleaved = new ArrayList<>();
        int maxGroupSize = groups.values().stream().mapToInt(List::size).max().orElse(1);
        for (int i = 0; i < maxGroupSize; i++) {
            for (List<Map<String, Object>> group : groups.values()) {
                if (i < group.size()) {
                    interleaved.add(group.get(i));
                }
            }
        }
        return interleaved;
    }

    private List<Map<String, Object>> buildItinerarySlots(List<Map<String, Object>> itinerary, int days, Integer hoursPerDay) {
        List<Map<String, Object>> slots = new ArrayList<>();
        int counter = 1;
        int totalSpots = itinerary.size();
        int activeHours = hoursPerDay != null && hoursPerDay > 0 ? hoursPerDay : 8;
        int slotsPerDay = totalSpots > 0 ? Math.max(2, Math.min((int) Math.ceil((double) totalSpots / days), activeHours / 2)) : 4;
        int spotIdx = 0;

        for (int d = 1; d <= days; d++) {
            int daySlots = Math.min(slotsPerDay, totalSpots - spotIdx);
            if (daySlots <= 0 && spotIdx < totalSpots) daySlots = 1;
            if (daySlots <= 0) break;

            for (int s = 0; s < daySlots; s++) {
                if (spotIdx >= totalSpots) break;
                Map<String, Object> spot = itinerary.get(spotIdx++);
                int startHour = 9 + s * 2;
                int endHour = Math.min(startHour + 2, 9 + activeHours);
                String timeSlot = String.format("%02d:00 - %02d:00", startHour, endHour);

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", "it-" + d + "-" + counter++);
                item.put("day", d);
                item.put("timeSlot", timeSlot);
                item.put("title", spot.getOrDefault("title", "Place"));
                item.put("description", spot.getOrDefault("desc", spot.getOrDefault("description", "Explore this place.")));
                item.put("category", spot.getOrDefault("category", "attraction"));
                item.put("lat", toDouble(spot.getOrDefault("lat", 0)));
                item.put("lng", toDouble(spot.getOrDefault("lng", 0)));
                item.put("costEstimation", toBigDecimal(spot.getOrDefault("cost", spot.getOrDefault("costEstimation", 50))));
                item.put("estimatedDurationMinutes", toInt(spot.getOrDefault("estimatedDurationMinutes", 90)));
                item.put("address", spot.getOrDefault("addr", spot.getOrDefault("address", "")));
                item.put("isCompleted", false);
                item.put("imageUrl", spot.getOrDefault("imageUrl", null));
                slots.add(item);
            }
        }
        return slots;
    }

    // ============================================================
    // OVERPASS: INTEREST-BASED PARALLEL FETCH
    // ============================================================

    private List<Map<String, Object>> fetchOverpassPlacesByInterests(double lat, double lng, BigDecimal radiusKm, String interests, int count) {
        List<OverpassClause> clauses = getOverpassClausesForInterests(interests);
        double delta = radiusKm != null ? radiusKm.doubleValue() / 111.0 : 0.1;
        String bbox = (lat - delta) + "," + (lng - delta) + "," + (lat + delta) + "," + (lng + delta);

        StringBuilder query = new StringBuilder("[out:json][timeout:20];(");
        for (OverpassClause clause : clauses) {
            query.append("node[\"").append(clause.key()).append("\"~\"").append(clause.values()).append("\"](").append(bbox).append(");");
            query.append("way[\"").append(clause.key()).append("\"~\"").append(clause.values()).append("\"](").append(bbox).append(");");
        }
        query.append(");out center tags;");

        String cacheKey = "overpass:" + lat + ":" + lng + ":" + interests + ":" + radiusKm;
        @SuppressWarnings("unchecked")
        CacheEntry<List<Map<String, Object>>> cached = (CacheEntry<List<Map<String, Object>>>) (CacheEntry<?>) geoCache.get(cacheKey);
        if (cached != null && cached.isFresh()) {
            return cached.value().stream().limit(count).toList();
        }

        try {
            String encoded = "data=" + URLEncoder.encode(query.toString(), StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://overpass-api.de/api/interpreter"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(encoded))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            if (body == null || body.isBlank() || body.trim().startsWith("<")) {
                System.err.println("Overpass returned non-JSON response (likely rate limited)");
                return List.of();
            }
            JsonNode data = mapper.readTree(body);
            List<Map<String, Object>> results = parseOverpassResponse(data);

            geoCache.put(cacheKey, new CacheEntry<>(results, System.currentTimeMillis()));

            return results.stream().limit(count).toList();
        } catch (Exception e) {
            System.err.println("Overpass API error: " + e.getMessage());
            return List.of();
        }
    }

    private List<Map<String, Object>> parseOverpassResponse(JsonNode data) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (!data.has("elements")) return results;

        Set<String> seenNames = new HashSet<>();
        for (JsonNode el : data.get("elements")) {
            if (!el.has("tags")) continue;
            JsonNode tags = el.get("tags");
            double lat = el.has("lat") ? el.get("lat").asDouble() : el.path("center").path("lat").asDouble(0);
            double lon = el.has("lon") ? el.get("lon").asDouble() : el.path("center").path("lon").asDouble(0);
            if (lat == 0 && lon == 0) continue;

            String name = getEnglishName(tags);
            if (name == null || name.isBlank()) continue;
            String nameKey = name.toLowerCase().trim();
            if (seenNames.contains(nameKey)) continue;
            seenNames.add(nameKey);

            Map<String, Object> place = new LinkedHashMap<>();
            place.put("title", name);
            place.put("lat", lat);
            place.put("lng", lon);
            place.put("category", mapOverpassCategory(tags));
            place.put("addr", buildAddress(tags));
            place.put("desc", buildDescription(name, mapOverpassCategory(tags), tags));
            place.put("cost", estimateCost(mapOverpassCategory(tags)));
            place.put("estimatedDurationMinutes", estimateDuration(mapOverpassCategory(tags)));
            results.add(place);
        }

        Collections.shuffle(results);
        return results;
    }

    private String getEnglishName(JsonNode tags) {
        // Prefer name:en (English), then name:fr, then name if it's Latin script
        if (tags.has("name:en") && !tags.get("name:en").asText().isBlank()) {
            return tags.get("name:en").asText().trim();
        }
        if (tags.has("name:fr") && !tags.get("name:fr").asText().isBlank()) {
            return tags.get("name:fr").asText().trim();
        }
        if (tags.has("name:int") && !tags.get("name:int").asText().isBlank()) {
            return tags.get("name:int").asText().trim();
        }
        if (tags.has("name")) {
            String name = tags.get("name").asText().trim();
            if (isLatinScript(name)) {
                return name;
            }
        }
        return null;
    }

    private boolean isLatinScript(String text) {
        if (text == null || text.isBlank()) return false;
        int latinCount = 0;
        int totalCount = 0;
        for (char c : text.toCharArray()) {
            if (Character.isLetter(c)) {
                totalCount++;
                if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == ' ' || c == '-' || c == '\'' || c == '.' || c == '&' || c == ',') {
                    latinCount++;
                }
            }
        }
        return totalCount > 0 && (double) latinCount / totalCount > 0.7;
    }

    private String mapOverpassCategory(JsonNode tags) {
        String amenity = tags.path("amenity").asText("");
        String tourism = tags.path("tourism").asText("");
        String shop = tags.path("shop").asText("");
        String leisure = tags.path("leisure").asText("");
        String historic = tags.path("historic").asText("");
        String natural = tags.path("natural").asText("");
        String sport = tags.path("sport").asText("");
        String building = tags.path("building").asText("");
        String religion = tags.path("religion").asText("");

        if (amenity.equals("cafe")) return "cafe";
        if (amenity.equals("fast_food") || amenity.equals("food_court")) return "street_food";
        if (List.of("restaurant","food_court").contains(amenity)) return "restaurant";
        if (List.of("bar","pub","nightclub","biergarten").contains(amenity)) return "nightlife";
        if (amenity.equals("spa") || amenity.equals("beauty")) return "spa";
        if (amenity.equals("motorcycle_rental") || amenity.equals("bicycle_rental")) return "rental";
        if (amenity.equals("place_of_worship") && religion.equals("hindu")) return "temple";
        if (amenity.equals("place_of_worship") && religion.equals("muslim")) return "mosque";
        if (amenity.equals("place_of_worship")) return "attraction";
        if (natural.equals("beach")) return "beach";
        if (List.of("hotel","hostel","motel","guest_house").contains(tourism)) return "hotel";
        if (List.of("museum","artwork","attraction","viewpoint","gallery").contains(tourism)) return "attraction";
        if (List.of("amusement_arcade","video_arcade","bowling_alley","escape_game","water_park","amusement_ride","game_centre").contains(leisure)) return "fun_activity";
        if (List.of("park","garden","nature_reserve").contains(leisure)) return "hidden_gem";
        if (List.of("bicycle","bicycle_rental","motorcycle","scooter").contains(shop)) return "rental";
        if (shop.equals("beauty") || shop.equals("hairdresser") || shop.equals("cosmetics")) return "spa";
        if (shop.equals("mall") || building.equals("mall") || building.equals("retail")) return "mall";
        if (!shop.isEmpty()) return "shopping";
        if (!historic.isEmpty()) return "attraction";
        if (!natural.isEmpty()) return "hidden_gem";
        if (!sport.isEmpty()) return "fun_activity";
        return "attraction";
    }

    private String buildAddress(JsonNode tags) {
        List<String> parts = new ArrayList<>();
        if (tags.has("addr:street")) parts.add(tags.get("addr:street").asText());
        if (tags.has("addr:housenumber")) parts.add(tags.get("addr:housenumber").asText());
        if (tags.has("addr:city")) parts.add(tags.get("addr:city").asText());
        if (tags.has("addr:state")) parts.add(tags.get("addr:state").asText());
        if (tags.has("addr:suburb")) parts.add(tags.get("addr:suburb").asText());
        return parts.isEmpty() ? tags.path("name").asText("Local Area") : String.join(", ", parts);
    }

    private String buildDescription(String name, String category, JsonNode tags) {
        String cuisine = tags.has("cuisine") ? " Specializes in " + tags.get("cuisine").asText() + " cuisine." : "";
        String opening = tags.has("opening_hours") ? " Open: " + tags.get("opening_hours").asText() + "." : "";
        String website = tags.has("website") ? " Website available." : "";
        String wheelchair = "wheelchair".equals(tags.path("wheelchair").asText()) ? " Wheelchair accessible." : "";

        return switch (category) {
            case "restaurant" -> {
                String rating = tags.has("stars") ? " Rated " + tags.get("stars").asText() + " stars." : "";
                yield "A popular dining destination in the area." + cuisine + rating + " A must-visit for food lovers." + opening + website;
            }
            case "cafe" -> "A cozy cafe perfect for coffee, light bites, and relaxation." + cuisine + opening + website;
            case "street_food" -> "A vibrant street food spot with authentic local flavors." + cuisine + opening;
            case "beach" -> "A beautiful beach destination with scenic views and serene waters. Perfect for unwinding." + opening;
            case "hotel" -> "A comfortable accommodation option with modern amenities and convenient location." + website + wheelchair;
            case "temple" -> "A sacred Hindu temple with beautiful architecture and spiritual ambiance." + opening + website;
            case "mosque" -> "A historic mosque with stunning architecture and cultural significance." + opening + website;
            case "shopping" -> {
                String brand = tags.has("brand") ? " Featuring " + tags.get("brand").asText() + "." : "";
                yield "A well-known shopping destination offering unique finds and local specialties." + brand + opening + website;
            }
            case "mall" -> "A modern shopping mall with a wide range of stores, dining, and entertainment options." + opening + website;
            case "spa" -> "A relaxing spa and wellness center offering professional beauty and rejuvenation treatments." + opening + website;
            case "fun_activity" -> "An exciting entertainment venue with fun activities and experiences for all ages." + opening + website;
            case "rental" -> "A rental service for convenient local transportation and exploration." + opening + website;
            case "nightlife" -> "A lively nightlife spot with great drinks, music, and atmosphere." + opening + website;
            case "hidden_gem" -> "A serene retreat offering peaceful surroundings and natural beauty. Perfect for relaxation and unwinding." + opening + wheelchair;
            default -> "A notable landmark and must-visit destination in the area. Rich in history and cultural significance." + opening + website;
        };
    }

    private int estimateCost(String category) {
        return switch (category) {
            case "restaurant" -> 350;
            case "cafe" -> 200;
            case "street_food" -> 100;
            case "shopping" -> 400;
            case "mall" -> 500;
            case "hotel" -> 2500;
            case "spa" -> 800;
            case "fun_activity" -> 300;
            case "rental" -> 250;
            case "nightlife" -> 600;
            case "beach" -> 0;
            case "temple" -> 0;
            case "mosque" -> 0;
            default -> 50;
        };
    }

    private int estimateDuration(String category) {
        return switch (category) {
            case "restaurant" -> 60;
            case "cafe" -> 30;
            case "street_food" -> 30;
            case "shopping" -> 45;
            case "mall" -> 90;
            case "hotel" -> 30;
            case "attraction" -> 90;
            case "beach" -> 120;
            case "temple" -> 40;
            case "mosque" -> 40;
            case "spa" -> 60;
            case "fun_activity" -> 90;
            case "rental" -> 20;
            case "nightlife" -> 120;
            case "hidden_gem" -> 45;
            default -> 60;
        };
    }

    // ============================================================
    // GEOCODING (cached)
    // ============================================================

    @SuppressWarnings("unchecked")
    public Map<String, Object> geocodeDestination(String destination) {
        String cacheKey = "geo:" + destination.toLowerCase();
        CacheEntry<Map<String, Object>> cached = (CacheEntry<Map<String, Object>>) (CacheEntry<?>) geoCache.get(cacheKey);
        if (cached != null && cached.isFresh()) {
            return cached.value();
        }

        try {
            String url = "https://nominatim.openstreetmap.org/search?q=" +
                    URLEncoder.encode(destination, StandardCharsets.UTF_8) + "&format=json&limit=1";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "TripPilot/1.0")
                    .GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode data = mapper.readTree(response.body());
            if (data.isArray() && data.size() > 0) {
                Map<String, Object> result = Map.<String, Object>of(
                    "lat", data.get(0).get("lat").asDouble(),
                    "lng", data.get(0).get("lon").asDouble(),
                    "displayName", data.get(0).get("display_name").asText()
                );
                geoCache.put(cacheKey, new CacheEntry<>(result, System.currentTimeMillis()));
                return result;
            }
        } catch (Exception e) { /* fallback */ }
        return Map.<String, Object>of("lat", 19.076, "lng", 72.8777, "displayName", destination);
    }

    // ============================================================
    // CURATED LANDMARKS FOR POPULAR DESTINATIONS
    // ============================================================

    private List<Map<String, Object>> getCuratedSpots(GenerateTripRequest req) {
        String dest = req.getDestination().toLowerCase().trim();
        String interests = req.getInterests() != null ? req.getInterests().toLowerCase() : "";
        List<Map<String, Object>> spots = new ArrayList<>();

        // GREECE / ATHENS
        if (dest.contains("greece") || dest.contains("athens")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Monastiraki Flea Market Food Hall", "category", "restaurant", "cost", 350, "desc", "Historic market area with tavernas, souvlaki joints, and traditional Greek cuisine.", "addr", "Monastiraki, Athens", "lat", 37.977, "lng", 23.726, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Psyrri Street Food District", "category", "restaurant", "cost", 250, "desc", "Trendy neighborhood with mezze bars, ouzeris, and authentic street food vendors.", "addr", "Psyrri, Athens", "lat", 37.975, "lng", 23.727, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Cafe Plaka with Acropolis View", "category", "restaurant", "cost", 400, "desc", "Charming cafe in the Plaka district with stunning views of the Acropolis.", "addr", "Plaka, Athens", "lat", 37.973, "lng", 23.728, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Varvakios Central Market", "category", "restaurant", "cost", 200, "desc", "Athens' oldest and largest food market. Fresh seafood, spices, and local delicacies.", "addr", "Athens Central Market", "lat", 37.987, "lng", 23.730, "estimatedDurationMinutes", 45));
                spots.add(Map.<String, Object>of("title", "Gazis Ouzeri", "category", "restaurant", "cost", 300, "desc", "Traditional ouzeri serving meze plates, ouzo, and classic Greek dishes.", "addr", "Koukaki, Athens", "lat", 37.971, "lng", 23.722, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "The Acropolis", "category", "attraction", "cost", 300, "desc", "Iconic ancient citadel perched on a rocky outcrop above Athens, home to the Parthenon.", "addr", "Acropolis, Athens", "lat", 37.9715, "lng", 23.7267, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Ancient Agora of Athens", "category", "attraction", "cost", 150, "desc", "Ruins of the ancient marketplace and civic center, birthplace of democracy.", "addr", "Agora, Athens", "lat", 37.974, "lng", 23.723, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Temple of Olympian Zeus", "category", "attraction", "cost", 100, "desc", "Massive ancient temple ruins with towering Corinthian columns and Hadrian's Arch.", "addr", "Athens, Greece", "lat", 37.969, "lng", 23.733, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "National Archaeological Museum", "category", "attraction", "cost", 200, "desc", "World-renowned museum with the finest collection of Greek antiquities.", "addr", "Athens, Greece", "lat", 37.989, "lng", 23.732, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Lycabettus Hill", "category", "attraction", "cost", 0, "desc", "Tallest hill in Athens with panoramic 360-degree views of the city and sea.", "addr", "Lycabettus, Athens", "lat", 37.983, "lng", 23.718, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Plaka Historic District Walk", "category", "attraction", "cost", 0, "desc", "Wander through narrow cobblestone streets lined with neoclassical buildings and bougainvillea.", "addr", "Plaka, Athens", "lat", 37.974, "lng", 23.728, "estimatedDurationMinutes", 90));
            }
            if (interests.contains("shopping")) {
                spots.add(Map.<String, Object>of("title", "Ermou Street Shopping Avenue", "category", "shopping", "cost", 400, "desc", "Athens' main commercial street with international brands and local boutiques.", "addr", "Ermou, Athens", "lat", 37.976, "lng", 23.726, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Athens Central Market", "category", "shopping", "cost", 150, "desc", "Vibrant open-air market with fresh produce, olives, cheese, and traditional goods.", "addr", "Athens, Greece", "lat", 37.987, "lng", 23.731, "estimatedDurationMinutes", 60));
            }
        }

        // JAPAN / TOKYO
        if (dest.contains("japan") || dest.contains("tokyo")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Tsukiji Outer Market", "category", "restaurant", "cost", 500, "desc", "World-famous fish market with sushi stalls, street food vendors, and fresh seafood.", "addr", "Tsukiji, Tokyo", "lat", 35.665, "lng", 139.770, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Omoide Yokocho (Memory Lane)", "category", "restaurant", "cost", 400, "desc", "Narrow alley packed with tiny yakitori and ramen shops near Shinjuku station.", "addr", "Shinjuku, Tokyo", "lat", 35.693, "lng", 139.699, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Gonpachi Restaurant", "category", "restaurant", "cost", 600, "desc", "The restaurant that inspired the Kill Bill fight scene. Traditional izakaya dining.", "addr", "Nishi-Azabu, Tokyo", "lat", 35.661, "lng", 139.719, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Harajuku Crepe Street", "category", "restaurant", "cost", 250, "desc", "Takeshita Street lined with colorful crepe shops, bubble tea, and kawaii treats.", "addr", "Harajuku, Tokyo", "lat", 35.670, "lng", 139.703, "estimatedDurationMinutes", 45));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Senso-ji Temple", "category", "attraction", "cost", 0, "desc", "Tokyo's oldest and most famous Buddhist temple with iconic Thunder Gate.", "addr", "Asakusa, Tokyo", "lat", 35.715, "lng", 139.797, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Meiji Shrine", "category", "attraction", "cost", 0, "desc", "Serene Shinto shrine surrounded by a lush forest in the heart of Shibuya.", "addr", "Harajuku, Tokyo", "lat", 35.676, "lng", 139.699, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Tokyo Skytree", "category", "attraction", "cost", 500, "desc", "World's tallest tower at 634m with observation decks and panoramic city views.", "addr", "Sumida, Tokyo", "lat", 35.710, "lng", 139.811, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Shibuya Crossing", "category", "attraction", "cost", 0, "desc", "World's busiest pedestrian crossing. Experience the organized chaos of Tokyo.", "addr", "Shibuya, Tokyo", "lat", 35.659, "lng", 139.700, "estimatedDurationMinutes", 30));
            }
        }

        // THAILAND / BANGKOK
        if (dest.contains("thailand") || dest.contains("bangkok")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Yaowarat (Chinatown) Street Food", "category", "restaurant", "cost", 200, "desc", "Bangkok's Chinatown with legendary street food, pad thai, and seafood stalls.", "addr", "Yaowarat, Bangkok", "lat", 13.738, "lng", 100.501, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Or Tor Kor Market", "category", "restaurant", "cost", 250, "desc", "Ranked among world's best fresh markets. Exotic fruits, curries, and local delicacies.", "addr", "Chatuchak, Bangkok", "lat", 13.799, "lng", 100.550, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Ratchada Rot Fai Night Market", "category", "restaurant", "cost", 150, "desc", "Retro-themed night market with food stalls, craft beer bars, and live music.", "addr", "Ratchada, Bangkok", "lat", 13.769, "lng", 100.570, "estimatedDurationMinutes", 120));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Grand Palace & Wat Phra Kaew", "category", "attraction", "cost", 500, "desc", "Thailand's most sacred temple complex housing the Emerald Buddha.", "addr", "Grand Palace, Bangkok", "lat", 13.751, "lng", 100.492, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Wat Arun (Temple of Dawn)", "category", "attraction", "cost", 100, "desc", "Iconic riverside temple with stunning porcelain-encrusted spires and river views.", "addr", "Thonburi, Bangkok", "lat", 13.744, "lng", 100.489, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Chatuchak Weekend Market", "category", "attraction", "cost", 0, "desc", "World's largest outdoor market with 15,000+ stalls covering 35 acres.", "addr", "Chatuchak, Bangkok", "lat", 13.799, "lng", 100.551, "estimatedDurationMinutes", 180));
            }
        }

        // ITALY / ROME
        if (dest.contains("italy") || dest.contains("rome") || dest.contains("milan") || dest.contains("florence") || dest.contains("venice")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Testaccio Food Market", "category", "restaurant", "cost", 350, "desc", "Rome's authentic food district with trattorias, suppli vendors, and Roman classics.", "addr", "Testaccio, Rome", "lat", 41.882, "lng", 12.475, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Roscioli Salumeria & Bakery", "category", "restaurant", "cost", 500, "desc", "Legendary deli-restaurant with curated Italian cheeses, cured meats, and pasta.", "addr", "Via dei Giubbonari, Rome", "lat", 41.893, "lng", 12.477, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Trastevere Piazza Dining", "category", "restaurant", "cost", 400, "desc", "Outdoor piazza dining in Trastevere. Pizza, pasta, gelato, and limoncello.", "addr", "Trastevere, Rome", "lat", 41.887, "lng", 12.469, "estimatedDurationMinutes", 90));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "The Colosseum", "category", "attraction", "cost", 400, "desc", "Iconic ancient amphitheater that once hosted gladiator battles for 50,000 spectators.", "addr", "Rome, Italy", "lat", 41.890, "lng", 12.492, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Vatican Museums & Sistine Chapel", "category", "attraction", "cost", 500, "desc", "Home to Michelangelo's ceiling masterpiece and the world's greatest art collection.", "addr", "Vatican City", "lat", 41.906, "lng", 12.453, "estimatedDurationMinutes", 180));
                spots.add(Map.<String, Object>of("title", "Trevi Fountain", "category", "attraction", "cost", 0, "desc", "Baroque masterpiece fountain. Toss a coin to ensure your return to Rome.", "addr", "Rome, Italy", "lat", 41.901, "lng", 12.483, "estimatedDurationMinutes", 30));
                spots.add(Map.<String, Object>of("title", "Roman Forum & Palatine Hill", "category", "attraction", "cost", 200, "desc", "Walk through the ruins of the ancient Roman Empire's political and social heart.", "addr", "Rome, Italy", "lat", 41.892, "lng", 12.485, "estimatedDurationMinutes", 120));
            }
        }

        // DUBAI / UAE
        if (dest.contains("dubai") || dest.contains("abu dhabi") || dest.contains("uae")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Al Dhiyafah Street Food Strip", "category", "restaurant", "cost", 200, "desc", "Famous street with affordable Arabic, Indian, and Filipino restaurants.", "addr", "Al Dhiyafah, Dubai", "lat", 25.228, "lng", 55.270, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Gold Souk & Spice Souk Dining", "category", "restaurant", "cost", 300, "desc", "Traditional dining near the famous gold and spice souks in Deira.", "addr", "Deira, Dubai", "lat", 25.287, "lng", 55.296, "estimatedDurationMinutes", 75));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Burj Khalifa Observation Deck", "category", "attraction", "cost", 500, "desc", "World's tallest building at 828m with observation deck on 148th floor.", "addr", "Downtown Dubai", "lat", 25.197, "lng", 55.274, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Dubai Fountain Show", "category", "attraction", "cost", 0, "desc", "World's largest choreographed fountain system with water jets up to 150m.", "addr", "Downtown Dubai", "lat", 25.196, "lng", 55.270, "estimatedDurationMinutes", 30));
                spots.add(Map.<String, Object>of("title", "Dubai Museum & Al Fahidi Fort", "category", "attraction", "cost", 100, "desc", "Dubai's oldest building housing exhibits on traditional Emirati life.", "addr", "Al Fahidi, Dubai", "lat", 25.263, "lng", 55.297, "estimatedDurationMinutes", 75));
            }
        }

        // LONDON / UK
        if (dest.contains("london") || dest.contains("uk") || dest.contains("england")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Borough Market", "category", "restaurant", "cost", 350, "desc", "London's premier artisan food market with 100+ stalls of gourmet produce.", "addr", "Southwark, London", "lat", 51.505, "lng", -0.091, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Brick Lane Curry Mile", "category", "restaurant", "cost", 300, "desc", "Famous strip of Bangladeshi curry houses and vintage brunch spots.", "addr", "Brick Lane, London", "lat", 51.521, "lng", -0.072, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Camden Market Food Court", "category", "restaurant", "cost", 250, "desc", "Eclectic food stalls with cuisines from 40+ countries. Live music vibes.", "addr", "Camden, London", "lat", 51.541, "lng", -0.146, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Tower of London", "category", "attraction", "cost", 400, "desc", "900-year-old castle, home to the Crown Jewels and the Beefeater guards.", "addr", "Tower Hill, London", "lat", 51.508, "lng", -0.076, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "British Museum", "category", "attraction", "cost", 0, "desc", "8 million artifacts spanning 2 million years of human history. Free entry.", "addr", "Bloomsbury, London", "lat", 51.519, "lng", -0.127, "estimatedDurationMinutes", 180));
                spots.add(Map.<String, Object>of("title", "Big Ben & Houses of Parliament", "category", "attraction", "cost", 0, "desc", "Iconic clock tower and seat of UK Parliament on the banks of the Thames.", "addr", "Westminster, London", "lat", 51.501, "lng", -0.125, "estimatedDurationMinutes", 45));
                spots.add(Map.<String, Object>of("title", "London Eye", "category", "attraction", "cost", 300, "desc", "Giant observation wheel with 360-degree views across London from 135m high.", "addr", "South Bank, London", "lat", 51.503, "lng", -0.119, "estimatedDurationMinutes", 60));
            }
        }

        // PARIS / FRANCE
        if (dest.contains("paris") || dest.contains("france")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Rue Montorgueil Food Street", "category", "restaurant", "cost", 400, "desc", "Historic pedestrian market street with bakeries, cheese shops, and bistros.", "addr", "2nd Arrondissement, Paris", "lat", 48.864, "lng", 2.345, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Le Marais Falafel Walk", "category", "restaurant", "cost", 250, "desc", "Famous falafel street in the Jewish quarter. Best street food in Paris.", "addr", "Rue des Rosiers, Paris", "lat", 48.857, "lng", 2.360, "estimatedDurationMinutes", 45));
                spots.add(Map.<String, Object>of("title", "Cafe de Flore", "category", "restaurant", "cost", 500, "desc", "Legendary literary cafe where Hemingway and Sartre once wrote. Classic Parisian experience.", "addr", "Saint-Germain, Paris", "lat", 48.854, "lng", 2.332, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Eiffel Tower", "category", "attraction", "cost", 350, "desc", "Iconic 330m iron lattice tower. Summit views span 72km on a clear day.", "addr", "Champ de Mars, Paris", "lat", 48.858, "lng", 2.294, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Louvre Museum", "category", "attraction", "cost", 400, "desc", "World's largest art museum. Home to Mona Lisa and 380,000+ objects.", "addr", "1st Arrondissement, Paris", "lat", 48.861, "lng", 2.338, "estimatedDurationMinutes", 180));
                spots.add(Map.<String, Object>of("title", "Notre-Dame Cathedral", "category", "attraction", "cost", 0, "desc", "Gothic masterpiece on the Seine. Marvel at the flying buttresses and rose windows.", "addr", "Ile de la Cite, Paris", "lat", 48.853, "lng", 2.350, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Montmartre & Sacre-Coeur", "category", "attraction", "cost", 0, "desc", "Bohemian hilltop neighborhood with the white-domed basilica and panoramic city views.", "addr", "Montmartre, Paris", "lat", 48.887, "lng", 2.343, "estimatedDurationMinutes", 90));
            }
        }

        // SPAIN / BARCELONA
        if (dest.contains("spain") || dest.contains("barcelona") || dest.contains("madrid")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "La Boqueria Market", "category", "restaurant", "cost", 300, "desc", "Barcelona's most famous food market with tapas bars, fresh juice, and Iberian ham.", "addr", "Las Ramblas, Barcelona", "lat", 41.382, "lng", 2.175, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "El Born Tapas Crawl", "category", "restaurant", "cost", 350, "desc", "Historic neighborhood packed with craft cocktail bars and gourmet tapas restaurants.", "addr", "El Born, Barcelona", "lat", 41.386, "lng", 2.184, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Barceloneta Seafood Boardwalk", "category", "restaurant", "cost", 400, "desc", "Beachfront seafood restaurants serving paella, fideua, and sangria.", "addr", "Barceloneta, Barcelona", "lat", 41.378, "lng", 2.192, "estimatedDurationMinutes", 90));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Sagrada Familia", "category", "attraction", "cost", 400, "desc", "Gaudi's unfinished masterpiece basilica. The most visited monument in Spain.", "addr", "Eixample, Barcelona", "lat", 41.404, "lng", 2.175, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Park Guell", "category", "attraction", "cost", 150, "desc", "Whimsical hilltop park with colorful mosaic benches and panoramic city views.", "addr", "Gracia, Barcelona", "lat", 41.415, "lng", 2.152, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "La Rambla Walk", "category", "attraction", "cost", 0, "desc", "Iconic 1.2km tree-lined boulevard from Placa Catalunya to the old harbor.", "addr", "Barcelona, Spain", "lat", 41.381, "lng", 2.173, "estimatedDurationMinutes", 60));
            }
        }

        // USA / NEW YORK
        if (dest.contains("new york") || dest.contains("nyc") || dest.contains("usa") || dest.contains("united states")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Chelsea Market Food Hall", "category", "restaurant", "cost", 400, "desc", "Converted factory building with 35+ artisanal food vendors and craft breweries.", "addr", "Chelsea, Manhattan", "lat", 40.742, "lng", -74.005, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Smorgasburg Williamsburg", "category", "restaurant", "cost", 300, "desc", "Brooklyn's open-air food market with 100+ vendors and skyline views.", "addr", "Williamsburg, Brooklyn", "lat", 40.711, "lng", -73.964, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Joe's Pizza Greenwich Village", "category", "restaurant", "cost", 150, "desc", "Iconic NYC slice shop since 1975. The quintessential New York pizza experience.", "addr", "Greenwich Village, Manhattan", "lat", 40.730, "lng", -74.000, "estimatedDurationMinutes", 30));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Statue of Liberty & Ellis Island", "category", "attraction", "cost", 350, "desc", "America's iconic symbol of freedom. Ferry access to pedestal and crown.", "addr", "Liberty Island, NYC", "lat", 40.689, "lng", -74.045, "estimatedDurationMinutes", 180));
                spots.add(Map.<String, Object>of("title", "Central Park", "category", "attraction", "cost", 0, "desc", "843-acre urban oasis with lakes, bridges, and iconic landmarks throughout.", "addr", "Manhattan, NYC", "lat", 40.783, "lng", -73.965, "estimatedDurationMinutes", 120));
                spots.add(Map.<String, Object>of("title", "Empire State Building", "category", "attraction", "cost", 400, "desc", "102-story Art Deco skyscraper with 86th floor observatory.", "addr", "Midtown, Manhattan", "lat", 40.748, "lng", -73.986, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Brooklyn Bridge Walk", "category", "attraction", "cost", 0, "desc", "Historic 1883 suspension bridge walk with stunning Manhattan skyline views.", "addr", "Brooklyn Bridge, NYC", "lat", 40.706, "lng", -73.997, "estimatedDurationMinutes", 60));
            }
        }

        // INDIA / SPECIFIC CITIES
        if (dest.contains("mumbai") || dest.contains("bombay")) {
            if (interests.contains("food") || interests.contains("restaurant") || interests.contains("street food") || interests.contains("cafe")) {
                spots.add(Map.<String, Object>of("title", "Mohammed Ali Road Night Food", "category", "street_food", "cost", 200, "desc", "Iconic late-night food street with kebabs, biryani, and Malpuas.", "addr", "Mohammed Ali Road, Mumbai", "lat", 18.954, "lng", 72.837, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Sassoon Dock Art & Food", "category", "restaurant", "cost", 250, "desc", "Historic fish dock turned art space with pop-up food stalls.", "addr", "Colaba, Mumbai", "lat", 18.920, "lng", 72.835, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Leopold Cafe", "category", "cafe", "cost", 350, "desc", "Legendary Colaba cafe since 1871. Featured in Shantaram and Slumdog Millionaire.", "addr", "Colaba, Mumbai", "lat", 18.924, "lng", 72.834, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Crawford Market Bazaar", "category", "street_food", "cost", 150, "desc", "Historic Victorian market with fresh produce, spices, and street food stalls.", "addr", "Mumbai", "lat", 18.948, "lng", 72.836, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Gateway of India", "category", "attraction", "cost", 0, "desc", "Iconic Indo-Saracenic arch overlooking the Arabian Sea. Mumbai's most photographed landmark.", "addr", "Colaba, Mumbai", "lat", 18.922, "lng", 72.835, "estimatedDurationMinutes", 45));
                spots.add(Map.<String, Object>of("title", "Marine Drive Queen's Necklace", "category", "attraction", "cost", 0, "desc", "3.6km art deco seafront promenade with stunning sunset views.", "addr", "Marine Drive, Mumbai", "lat", 18.943, "lng", 72.823, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Elephanta Caves", "category", "attraction", "cost", 200, "desc", "UNESCO World Heritage island caves with ancient Hindu and Buddhist rock art.", "addr", "Elephanta Island, Mumbai", "lat", 18.963, "lng", 72.931, "estimatedDurationMinutes", 180));
                spots.add(Map.<String, Object>of("title", "Chhatrapati Shivaji Terminus", "category", "attraction", "cost", 0, "desc", "UNESCO Heritage Victorian Gothic railway station, an architectural marvel.", "addr", "Mumbai", "lat", 18.939, "lng", 72.835, "estimatedDurationMinutes", 30));
            }
            if (interests.contains("shopping") || interests.contains("street shopping")) {
                spots.add(Map.<String, Object>of("title", "Colaba Causeway Market", "category", "shopping", "cost", 300, "desc", "Bustling street market with clothes, jewelry, antiques, and souvenirs.", "addr", "Colaba, Mumbai", "lat", 18.925, "lng", 72.833, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Linking Road Shopping", "category", "shopping", "cost", 250, "desc", "Famous street shopping hub with trendy fashion, accessories, and street food.", "addr", "Bandra, Mumbai", "lat", 19.059, "lng", 72.829, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("beach")) {
                spots.add(Map.<String, Object>of("title", "Juhu Beach", "category", "beach", "cost", 0, "desc", "Mumbai's most famous beach with street food stalls, sunsets, and celebrity homes nearby.", "addr", "Juhu, Mumbai", "lat", 19.094, "lng", 72.827, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Versova Beach", "category", "beach", "cost", 0, "desc", "Quieter alternative to Juhu, clean sand, great for morning walks.", "addr", "Versova, Mumbai", "lat", 19.100, "lng", 72.820, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("temple") || interests.contains("mosque")) {
                spots.add(Map.<String, Object>of("title", "Haji Ali Dargah", "category", "mosque", "cost", 0, "desc", "Iconic mosque on an islet in the sea, connected by a causeway. Stunning architecture.", "addr", "Mumbai", "lat", 18.982, "lng", 72.808, "estimatedDurationMinutes", 45));
                spots.add(Map.<String, Object>of("title", "Siddhivinayak Temple", "category", "temple", "cost", 0, "desc", "One of Mumbai's most revered Ganesh temples, visited by millions annually.", "addr", "Dadar, Mumbai", "lat", 19.016, "lng", 72.830, "estimatedDurationMinutes", 40));
            }
            if (interests.contains("spa") || interests.contains("parlour")) {
                spots.add(Map.<String, Object>of("title", "Jiva Spa - Taj Mahal Palace", "category", "spa", "cost", 3000, "desc", "Luxury Ayurvedic spa in the iconic Taj hotel. Signature treatments and ocean views.", "addr", "Colaba, Mumbai", "lat", 18.923, "lng", 72.834, "estimatedDurationMinutes", 120));
            }
            if (interests.contains("nightlife")) {
                spots.add(Map.<String, Object>of("title", "Trilogy Nightclub", "category", "nightlife", "cost", 800, "desc", "Premium nightclub in Juhu with international DJs and rooftop lounge.", "addr", "Juhu, Mumbai", "lat", 19.096, "lng", 72.828, "estimatedDurationMinutes", 180));
                spots.add(Map.<String, Object>of("title", "Rajdhani Night Market", "category", "street_food", "cost", 200, "desc", "Late-night street food market near Dadar with local delicacies.", "addr", "Dadar, Mumbai", "lat", 19.018, "lng", 72.842, "estimatedDurationMinutes", 90));
            }
        }

        if (dest.contains("delhi")) {
            if (interests.contains("food")) {
                spots.add(Map.<String, Object>of("title", "Chandni Chowk Paranthe Wali Gali", "category", "restaurant", "cost", 150, "desc", "Famous lane serving 30+ varieties of stuffed parathas since 1872.", "addr", "Chandni Chowk, Old Delhi", "lat", 28.651, "lng", 77.232, "estimatedDurationMinutes", 60));
                spots.add(Map.<String, Object>of("title", "Karim's Restaurant", "category", "restaurant", "cost", 400, "desc", "Mughlai restaurant since 1913, descendant of chefs of Mughal emperor Shah Jahan.", "addr", "Jama Masjid, Old Delhi", "lat", 28.650, "lng", 77.233, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Lajpat Nagar Street Food", "category", "restaurant", "cost", 200, "desc", "Bustling market area with chaat, golgappas, and tikki stalls.", "addr", "Lajpat Nagar, Delhi", "lat", 28.570, "lng", 77.237, "estimatedDurationMinutes", 60));
            }
            if (interests.contains("sightseeing") || interests.contains("heritage")) {
                spots.add(Map.<String, Object>of("title", "Red Fort", "category", "attraction", "cost", 100, "desc", "Mughal emperor Shah Jahan's magnificent red sandstone fortress, UNESCO World Heritage.", "addr", "Old Delhi", "lat", 28.656, "lng", 77.241, "estimatedDurationMinutes", 90));
                spots.add(Map.<String, Object>of("title", "Qutub Minar", "category", "attraction", "cost", 100, "desc", "73m tall victory tower from 1193. Tallest brick minaret in the world.", "addr", "Mehrauli, Delhi", "lat", 28.524, "lng", 77.186, "estimatedDurationMinutes", 75));
                spots.add(Map.<String, Object>of("title", "Humayun's Tomb", "category", "attraction", "cost", 100, "desc", "Mughal masterpiece that inspired the Taj Mahal. UNESCO World Heritage Site.", "addr", "Nizamuddin, Delhi", "lat", 28.593, "lng", 77.251, "estimatedDurationMinutes", 75));
            }
        }

        if (spots.isEmpty()) return spots;

        // Interleave by category for variety
        spots = interleaveByCategory(spots);
        // Limit by duration
        int maxSlots = (req.getDurationInDays() != null ? req.getDurationInDays() : 1) * 6;
        if (spots.size() > maxSlots) spots = spots.subList(0, maxSlots);
        return spots;
    }

    // ============================================================
    // INTEREST-AWARE FALLBACK SPOTS
    // ============================================================

    private List<Map<String, Object>> generateBasicFallback(String destination, String interests, int count) {
        GenerateTripRequest fakeReq = new GenerateTripRequest();
        fakeReq.setDestination(destination);
        fakeReq.setInterests(interests);
        return generateInterestSpots(fakeReq);
    }

    private List<Map<String, Object>> generateInterestSpots(GenerateTripRequest req) {
        String dest = req.getDestination();
        String cap = dest.substring(0, 1).toUpperCase() + dest.substring(1);
        String interests = req.getInterests() != null ? req.getInterests().toLowerCase() : "";

        // Get real coordinates for the destination
        Map<String, Object> geo = geocodeDestination(dest);
        double baseLat = (double) geo.getOrDefault("lat", 19.076);
        double baseLng = (double) geo.getOrDefault("lng", 72.8777);

        List<Map<String, Object>> spots = new ArrayList<>();

        if (interests.contains("food")) {
            spots.add(Map.<String, Object>of("title", cap + " Food Street Market", "category", "restaurant", "cost", 250, "desc", "Famous street food lane with authentic local flavors, chaat stalls, and regional snacks.", "addr", "Food Street, " + cap, "lat", baseLat + 0.003, "lng", baseLng + 0.002, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Heritage Cafe & Bistro", "category", "restaurant", "cost", 200, "desc", "A charming cafe serving traditional beverages, artisan pastries, and local snacks.", "addr", "Old Town, " + cap, "lat", baseLat - 0.002, "lng", baseLng + 0.004, "estimatedDurationMinutes", 45));
            spots.add(Map.<String, Object>of("title", cap + " Spice Bazaar Kitchen", "category", "restaurant", "cost", 400, "desc", "Authentic regional cuisine with freshly ground spices, thali meals, and traditional recipes.", "addr", "Spice Market, " + cap, "lat", baseLat + 0.005, "lng", baseLng - 0.001, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Lakeside Diner", "category", "restaurant", "cost", 350, "desc", "Riverside dining with panoramic views, serving fresh seafood and local delicacies.", "addr", "Waterfront, " + cap, "lat", baseLat - 0.004, "lng", baseLng - 0.003, "estimatedDurationMinutes", 75));
            spots.add(Map.<String, Object>of("title", cap + " Old Quarter Sweets & Snacks", "category", "restaurant", "cost", 150, "desc", "Century-old sweet shop famous for traditional mithai, chaat, and street food.", "addr", "Old Quarter, " + cap, "lat", baseLat + 0.001, "lng", baseLng - 0.005, "estimatedDurationMinutes", 45));
            spots.add(Map.<String, Object>of("title", cap + " Rooftop Grill House", "category", "restaurant", "cost", 600, "desc", "Premium rooftop dining with city skyline views, BBQ grills, and craft beverages.", "addr", "Downtown, " + cap, "lat", baseLat - 0.001, "lng", baseLng + 0.006, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Farmers Market & Cafe", "category", "restaurant", "cost", 180, "desc", "Fresh organic produce market with a cafe serving farm-to-table breakfast and lunch.", "addr", "Market Road, " + cap, "lat", baseLat + 0.006, "lng", baseLng + 0.003, "estimatedDurationMinutes", 50));
            spots.add(Map.<String, Object>of("title", cap + " Tea House & Lounge", "category", "restaurant", "cost", 120, "desc", "Traditional tea house with rare blends, pakoras, and a peaceful garden seating area.", "addr", "Garden District, " + cap, "lat", baseLat - 0.003, "lng", baseLng + 0.001, "estimatedDurationMinutes", 40));
        }
        if (interests.contains("nightlife")) {
            spots.add(Map.<String, Object>of("title", cap + " Skyline Rooftop Lounge", "category", "restaurant", "cost", 800, "desc", "Premium rooftop lounge with panoramic city views, craft cocktails, and DJ nights.", "addr", "Downtown, " + cap, "lat", baseLat + 0.002, "lng", baseLng + 0.005, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " Electric Night Club", "category", "restaurant", "cost", 500, "desc", "Popular nightclub featuring international DJs, live music, and dance floor events.", "addr", "Entertainment District, " + cap, "lat", baseLat - 0.003, "lng", baseLng + 0.004, "estimatedDurationMinutes", 150));
            spots.add(Map.<String, Object>of("title", cap + " Jazz & Blues Bar", "category", "restaurant", "cost", 400, "desc", "Intimate jazz bar with live performances, premium spirits, and a sophisticated ambiance.", "addr", "Arts District, " + cap, "lat", baseLat + 0.004, "lng", baseLng - 0.002, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " Craft Beer Brewery", "category", "restaurant", "cost", 350, "desc", "Local craft brewery with house-brewed beers, pub grub, and outdoor seating.", "addr", "Brewery Lane, " + cap, "lat", baseLat - 0.001, "lng", baseLng - 0.004, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Lakeside Cocktail Bar", "category", "restaurant", "cost", 600, "desc", "Elegant cocktail bar by the lake with live acoustic sessions and premium drinks.", "addr", "Lakefront, " + cap, "lat", baseLat + 0.005, "lng", baseLng + 0.002, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " Retro Arcade & Bar", "category", "restaurant", "cost", 300, "desc", "Retro-themed bar with vintage arcade games, themed cocktails, and nostalgia nights.", "addr", "Retro District, " + cap, "lat", baseLat - 0.004, "lng", baseLng - 0.001, "estimatedDurationMinutes", 120));
        }
        if (interests.contains("photography") || interests.contains("sightseeing")) {
            spots.add(Map.<String, Object>of("title", cap + " Panoramic Viewpoint Hill", "category", "attraction", "cost", 0, "desc", "A scenic hilltop viewpoint offering 360-degree panoramic views of the city skyline.", "addr", "Hilltop, " + cap, "lat", baseLat + 0.008, "lng", baseLng + 0.003, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Heritage Photography Trail", "category", "attraction", "cost", 0, "desc", "A guided photography walk through the most photogenic heritage parts of the old city.", "addr", "Old Quarter, " + cap, "lat", baseLat - 0.005, "lng", baseLng + 0.006, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " Golden Hour Promenade", "category", "attraction", "cost", 0, "desc", "Beautiful riverside promenade, perfect for golden hour photography and sunset captures.", "addr", "Waterfront, " + cap, "lat", baseLat + 0.002, "lng", baseLng - 0.007, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Sky Bridge Observation Deck", "category", "attraction", "cost", 50, "desc", "Elevated observation deck with glass floor and stunning aerial views for drone-style shots.", "addr", "Sky Bridge, " + cap, "lat", baseLat - 0.003, "lng", baseLng - 0.005, "estimatedDurationMinutes", 75));
            spots.add(Map.<String, Object>of("title", cap + " Colorful Street Art District", "category", "attraction", "cost", 0, "desc", "Vibrant neighborhood covered in murals, graffiti art, and Instagram-worthy installations.", "addr", "Art District, " + cap, "lat", baseLat + 0.006, "lng", baseLng - 0.002, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Mirror Lake Reflection Point", "category", "attraction", "cost", 0, "desc", "A serene lake perfectly reflecting mountains and sky - a photographer's paradise.", "addr", "Lake District, " + cap, "lat", baseLat - 0.007, "lng", baseLng + 0.001, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Night Sky Observatory", "category", "attraction", "cost", 100, "desc", "Astronomical observatory with telescope access for stunning night sky and star photography.", "addr", "Observatory Hill, " + cap, "lat", baseLat + 0.004, "lng", baseLng + 0.008, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Ancient Architecture Walk", "category", "attraction", "cost", 0, "desc", "Walking tour through centuries-old architecture with intricate carvings and facades.", "addr", "Heritage Walk, " + cap, "lat", baseLat - 0.002, "lng", baseLng + 0.007, "estimatedDurationMinutes", 120));
        }
        if (interests.contains("nature")) {
            spots.add(Map.<String, Object>of("title", cap + " Botanical Garden & Arboretum", "category", "hidden_gem", "cost", 25, "desc", "Lush botanical garden with rare tropical plants, walking trails, butterfly house, and serene ponds.", "addr", "Green Zone, " + cap, "lat", baseLat + 0.006, "lng", baseLng - 0.004, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Wildlife Nature Reserve", "category", "hidden_gem", "cost", 50, "desc", "Protected nature reserve with diverse flora, fauna, guided nature walks, and bird watching.", "addr", "Outskirts, " + cap, "lat", baseLat - 0.008, "lng", baseLng + 0.005, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " River Trail & Waterfall", "category", "hidden_gem", "cost", 30, "desc", "Scenic riverside trail leading to a hidden waterfall surrounded by lush greenery.", "addr", "River District, " + cap, "lat", baseLat + 0.003, "lng", baseLng + 0.007, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Butterfly Garden", "category", "hidden_gem", "cost", 20, "desc", "A colorful garden home to hundreds of butterfly species with walking paths and photo spots.", "addr", "Nature Park, " + cap, "lat", baseLat - 0.004, "lng", baseLng - 0.006, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Pine Forest Trek Point", "category", "hidden_gem", "cost", 0, "desc", "Gateway to a pine forest trekking trail with panoramic mountain views and fresh air.", "addr", "Forest Road, " + cap, "lat", baseLat + 0.007, "lng", baseLng + 0.004, "estimatedDurationMinutes", 120));
        }
        if (interests.contains("heritage") || interests.contains("history")) {
            spots.add(Map.<String, Object>of("title", cap + " Grand Heritage Fort", "category", "attraction", "cost", 100, "desc", "A majestic centuries-old fort showcasing local history, architecture, panoramic ramparts, and culture.", "addr", "Fort Area, " + cap, "lat", baseLat + 0.005, "lng", baseLng - 0.003, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " Royal Heritage Museum", "category", "attraction", "cost", 75, "desc", "Comprehensive museum housing rare artifacts, manuscripts, royal collections, and historical exhibits.", "addr", "Museum Road, " + cap, "lat", baseLat - 0.003, "lng", baseLng + 0.006, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Ancient Temple Complex", "category", "attraction", "cost", 0, "desc", "A serene temple complex with ancient carvings, sculptures, and centuries of spiritual heritage.", "addr", "Temple Road, " + cap, "lat", baseLat + 0.002, "lng", baseLng + 0.005, "estimatedDurationMinutes", 75));
            spots.add(Map.<String, Object>of("title", cap + " Colonial Heritage Walk", "category", "attraction", "cost", 0, "desc", "Guided walking tour through colonial-era buildings, churches, and historical landmarks.", "addr", "Colonial District, " + cap, "lat", baseLat - 0.005, "lng", baseLng - 0.002, "estimatedDurationMinutes", 120));
            spots.add(Map.<String, Object>of("title", cap + " War Memorial & Archives", "category", "attraction", "cost", 30, "desc", "Memorial honoring local heroes with war artifacts, archival documents, and interactive exhibits.", "addr", "Memorial Road, " + cap, "lat", baseLat + 0.004, "lng", baseLng - 0.006, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Archaeological Ruins Park", "category", "attraction", "cost", 40, "desc", "Excavated ruins of ancient settlements with guided tours and an on-site archaeology museum.", "addr", "Ruins Road, " + cap, "lat", baseLat - 0.006, "lng", baseLng + 0.003, "estimatedDurationMinutes", 90));
        }
        if (interests.contains("shopping")) {
            spots.add(Map.<String, Object>of("title", cap + " Artisan Craft Bazaar", "category", "shopping", "cost", 300, "desc", "Vibrant bazaar with handcrafted textiles, pottery, jewelry, and local artwork by artisans.", "addr", "Market Square, " + cap, "lat", baseLat + 0.003, "lng", baseLng + 0.004, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Vintage Flea Market", "category", "shopping", "cost", 200, "desc", "Treasure trove of vintage finds, antiques, retro collectibles, and unique memorabilia.", "addr", "Flea Market Lane, " + cap, "lat", baseLat - 0.002, "lng", baseLng - 0.005, "estimatedDurationMinutes", 75));
            spots.add(Map.<String, Object>of("title", cap + " Designer Outlet Mall", "category", "shopping", "cost", 500, "desc", "Premium outlet mall with local designer brands, international labels, and seasonal discounts.", "addr", "Mall Road, " + cap, "lat", baseLat + 0.007, "lng", baseLng - 0.001, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Silk & Spice Souk", "category", "shopping", "cost", 400, "desc", "Traditional market for premium silks, handloom fabrics, exotic spices, and specialty souvenirs.", "addr", "Souk Road, " + cap, "lat", baseLat - 0.004, "lng", baseLng + 0.003, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Night Bazaar & Street Market", "category", "shopping", "cost", 250, "desc", "Bustling night market with street vendors, food stalls, handicrafts, and live entertainment.", "addr", "Night Market, " + cap, "lat", baseLat + 0.001, "lng", baseLng - 0.007, "estimatedDurationMinutes", 90));
        }

        // Generic spots only if nothing matched
        if (spots.isEmpty()) {
            spots.add(Map.<String, Object>of("title", cap + " Central Heritage Square", "category", "attraction", "cost", 0, "desc", "The historic heart of " + cap + " with colonial architecture and street performers.", "addr", dest, "lat", baseLat + 0.001, "lng", baseLng + 0.001, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " City Central Park", "category", "hidden_gem", "cost", 0, "desc", "A beautiful green space with walking trails, fountains, and picnic areas.", "addr", "Park Area, " + cap, "lat", baseLat - 0.002, "lng", baseLng + 0.003, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Local Food Market", "category", "restaurant", "cost", 350, "desc", "A well-known local food market with authentic flavors and regional specialties.", "addr", "Dining District, " + cap, "lat", baseLat + 0.003, "lng", baseLng - 0.002, "estimatedDurationMinutes", 60));
            spots.add(Map.<String, Object>of("title", cap + " Heritage Walking Trail", "category", "attraction", "cost", 0, "desc", "A curated heritage walk through the most historic streets and landmarks.", "addr", "Old Town, " + cap, "lat", baseLat - 0.001, "lng", baseLng - 0.003, "estimatedDurationMinutes", 90));
            spots.add(Map.<String, Object>of("title", cap + " Local Artisan Market", "category", "shopping", "cost", 200, "desc", "Browse local goods, handcrafted souvenirs, and specialty regional products.", "addr", "Market Area, " + cap, "lat", baseLat + 0.004, "lng", baseLng + 0.002, "estimatedDurationMinutes", 45));
            spots.add(Map.<String, Object>of("title", cap + " Scenic Viewpoint", "category", "attraction", "cost", 0, "desc", "A stunning viewpoint offering the best panoramic views of the city.", "addr", "Viewpoint Road, " + cap, "lat", baseLat + 0.006, "lng", baseLng - 0.004, "estimatedDurationMinutes", 75));
            spots.add(Map.<String, Object>of("title", cap + " Coffee House & Bookstore", "category", "restaurant", "cost", 150, "desc", "Cozy independent coffee house with a curated bookstore and quiet reading corners.", "addr", "Library Lane, " + cap, "lat", baseLat - 0.003, "lng", baseLng + 0.005, "estimatedDurationMinutes", 45));
            spots.add(Map.<String, Object>of("title", cap + " Riverside Walk & Bridge", "category", "hidden_gem", "cost", 0, "desc", "Peaceful riverside walkway with a historic bridge and scenic water views.", "addr", "Riverside, " + cap, "lat", baseLat + 0.002, "lng", baseLng - 0.006, "estimatedDurationMinutes", 60));
        }
        return spots;
    }

    // ============================================================
    // CRUD OPERATIONS
    // ============================================================

    public List<Trip> getTripsByUser(String userId) {
        return tripRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Trip getTrip(String id) {
        return tripRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Trip not found."));
    }

    public Trip updateTripStatus(String id, String status, Integer currentLocationIdx) {
        Trip trip = getTrip(id);
        if (status != null) trip.setStatus(status);
        if (currentLocationIdx != null) trip.setCurrentLocationIdx(currentLocationIdx);
        return tripRepo.save(trip);
    }

    public Trip addItineraryItem(String tripId, com.trippilot.dto.request.AddItineraryItemRequest req) {
        Trip trip = getTrip(tripId);
        ItineraryItem item = new ItineraryItem();
        item.setId("activity-" + randomId());
        item.setTrip(trip);
        item.setDay(req.getDay() != null ? req.getDay() : 1);
        item.setTimeSlot("Flexible Time");
        item.setTitle(req.getTitle());
        item.setDescription(req.getDescription());
        item.setCategory(req.getCategory());
        item.setLat(req.getLat());
        item.setLng(req.getLng());
        item.setCostEstimation(req.getCostEstimation() != null ? req.getCostEstimation() : BigDecimal.ZERO);
        item.setDurationMinutes(req.getEstimatedDurationMinutes() != null ? req.getEstimatedDurationMinutes() : 60);
        item.setAddress(req.getAddress());
        item.setIsCompleted(false);
        item.setSortOrder(trip.getItinerary().size());
        trip.getItinerary().add(item);
        return tripRepo.save(trip);
    }

    public ItineraryItem toggleItem(String tripId, String itemId, boolean completed) {
        Trip trip = getTrip(tripId);
        ItineraryItem item = trip.getItinerary().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary item not found."));
        item.setIsCompleted(completed);
        tripRepo.save(trip);
        return item;
    }

    public ItineraryItem voteItem(String tripId, String itemId, String vote) {
        Trip trip = getTrip(tripId);
        ItineraryItem item = trip.getItinerary().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary item not found."));
        if ("up".equals(vote)) item.setUpvotes(item.getUpvotes() + 1);
        else if ("down".equals(vote)) item.setDownvotes(item.getDownvotes() + 1);
        tripRepo.save(trip);
        return item;
    }

    public Trip swapItineraryItem(String tripId, String itemId) {
        Trip trip = getTrip(tripId);
        ItineraryItem itemToSwap = trip.getItinerary().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary item not found."));

        Set<String> existingTitles = trip.getItinerary().stream()
                .map(ItineraryItem::getTitle)
                .collect(Collectors.toSet());

        double lat = itemToSwap.getLat() != null ? itemToSwap.getLat() : 19.076;
        double lng = itemToSwap.getLng() != null ? itemToSwap.getLng() : 72.8777;
        final double fLat = lat, fLng = lng;

        // Try fast: use fallback spots (instant, no network)
        List<Map<String, Object>> fallback = generateBasicFallback(trip.getDestination(), trip.getInterests(), 20);
        List<Map<String, Object>> available = fallback.stream()
                .filter(s -> !existingTitles.contains(s.getOrDefault("title", "")))
                .toList();

        Map<String, Object> newSpot;
        if (!available.isEmpty()) {
            newSpot = available.get(new Random().nextInt(available.size()));
        } else {
            // Fuzzy match: remove partial matches
            String currentItemTitle = itemToSwap.getTitle();
            available = fallback.stream()
                    .filter(s -> !s.getOrDefault("title", "").equals(currentItemTitle))
                    .toList();
            newSpot = available.isEmpty()
                ? Map.<String, Object>of(
                    "title", trip.getDestination() + " Hidden Discovery #" + (new Random().nextInt(900) + 100),
                    "category", "attraction",
                    "cost", 0,
                    "desc", "A fresh spot waiting to be explored in " + trip.getDestination() + ".",
                    "addr", trip.getDestination(),
                    "lat", lat + (new Random().nextDouble() - 0.5) * 0.02,
                    "lng", lng + (new Random().nextDouble() - 0.5) * 0.02,
                    "estimatedDurationMinutes", 60
                )
                : available.get(new Random().nextInt(available.size()));
        }

        itemToSwap.setTitle((String) newSpot.getOrDefault("title", "Swapped Spot"));
        itemToSwap.setDescription((String) newSpot.getOrDefault("desc", newSpot.getOrDefault("description", "A new exploration spot.")));
        itemToSwap.setCategory((String) newSpot.getOrDefault("category", "attraction"));
        itemToSwap.setLat(toDouble(newSpot.getOrDefault("lat", fLat)));
        itemToSwap.setLng(toDouble(newSpot.getOrDefault("lng", fLng)));
        itemToSwap.setCostEstimation(toBigDecimal(newSpot.getOrDefault("cost", newSpot.getOrDefault("costEstimation", 50))));
        itemToSwap.setDurationMinutes(toInt(newSpot.getOrDefault("estimatedDurationMinutes", 60)));
        itemToSwap.setAddress((String) newSpot.getOrDefault("addr", newSpot.getOrDefault("address", trip.getDestination())));
        itemToSwap.setImageUrl((String) newSpot.getOrDefault("imageUrl", null));

        tripRepo.save(trip);
        return trip;
    }

    // ============================================================
    // TSP ROUTE OPTIMIZATION
    // ============================================================

    private List<Map<String, Object>> optimizeRoutes(List<Map<String, Object>> items) {
        Map<Integer, List<Map<String, Object>>> dayGroups = new TreeMap<>();
        for (Map<String, Object> item : items) {
            int day = toInt(item.get("day"));
            dayGroups.computeIfAbsent(day, k -> new ArrayList<>()).add(item);
        }

        List<Map<String, Object>> optimized = new ArrayList<>();
        for (var entry : dayGroups.entrySet()) {
            List<Map<String, Object>> dayItems = new ArrayList<>(entry.getValue());
            if (dayItems.size() <= 1) { optimized.addAll(dayItems); continue; }

            List<Map<String, Object>> ordered = new ArrayList<>();
            List<Map<String, Object>> unvisited = new ArrayList<>(dayItems);
            Map<String, Object> current = unvisited.remove(0);
            ordered.add(current);

            while (!unvisited.isEmpty()) {
                int nearestIdx = 0;
                double minDist = Double.MAX_VALUE;
                for (int i = 0; i < unvisited.size(); i++) {
                    double dist = haversine(
                        toDouble(current.get("lat")), toDouble(current.get("lng")),
                        toDouble(unvisited.get(i).get("lat")), toDouble(unvisited.get(i).get("lng"))
                    );
                    if (dist < minDist) { minDist = dist; nearestIdx = i; }
                }
                current = unvisited.remove(nearestIdx);
                ordered.add(current);
            }

            for (int j = 0; j < ordered.size(); j++) {
                if (j == 0) {
                    ordered.get(j).put("distanceFromPreviousKm", 0);
                    ordered.get(j).put("travelTimeFromPreviousMinutes", 0);
                } else {
                    Map<String, Object> prev = ordered.get(j - 1);
                    Map<String, Object> curr = ordered.get(j);
                    double dist = haversine(toDouble(prev.get("lat")), toDouble(prev.get("lng")), toDouble(curr.get("lat")), toDouble(curr.get("lng")));
                    double rounded = Math.round(dist * 100.0) / 100.0;
                    int timeEst = dist > 0 ? (int) Math.round((dist / 25) * 60 + 5) : 0;
                    curr.put("distanceFromPreviousKm", rounded);
                    curr.put("travelTimeFromPreviousMinutes", timeEst);
                }
            }
            optimized.addAll(ordered);
        }
        return optimized;
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ============================================================
    // GEMINI PROMPT (interest-aware)
    // ============================================================

    private String buildGeminiPrompt(GenerateTripRequest req) {
        return """
            Generate a fully optimized day-by-day travel itinerary for destination "%s".
            Trip Details:
            - Duration: %d day(s) %s
            - Budget: %s (INR)
            - Travel style: %s
            - Number of people: %s
            - Selected Interests (ONLY return places matching these): %s

            RULES:
            - If interests include "Food" → return ONLY restaurants, cafes, street food, food markets.
            - If interests include "Nightlife" → return ONLY bars, pubs, clubs, lounges.
            - If interests include "Photography" → return ONLY viewpoints, scenic spots, heritage sites.
            - If interests include "Nature" → return ONLY parks, gardens, lakes, trekking spots.
            - If interests include "Shopping" → return ONLY markets, malls, bazaars, craft shops.
            - If interests include "Heritage" → return ONLY forts, museums, monuments, temples.
            - Do NOT return places that don't match the selected interests.
            - Provide REAL, EXACT, SPECIFIC named landmarks. 4-6 activities per day.
            - Estimate accurate lat/lng coordinates.
            Return only valid JSON: { "itinerary": [{ "day": 1, "timeSlot": "09:00 - 11:00", "title": "Name", "description": "Desc", "category": "attraction|restaurant|shopping|hidden_gem|rest|hotel", "lat": number, "lng": number, "costEstimation": number, "estimatedDurationMinutes": number, "address": "Addr" }] }
            """.formatted(
            req.getDestination(), req.getDurationInDays(),
            req.getDurationInHours() != null ? "(" + req.getDurationInHours() + " hours)" : "",
            req.getBudget(), req.getTravelStyle(), req.getPeopleCount(), req.getInterests()
        );
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private double toDouble(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        if (o instanceof String s) return Double.parseDouble(s);
        return 0;
    }
    private int toInt(Object o) {
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s) return Integer.parseInt(s);
        return 0;
    }
    private BigDecimal toBigDecimal(Object o) {
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (o instanceof String s) return new BigDecimal(s);
        return BigDecimal.ZERO;
    }
    private String randomId() { return UUID.randomUUID().toString().substring(0, 8); }
}
