package com.trippilot.service;

import com.trippilot.entity.Reservation;
import com.trippilot.entity.Trip;
import com.trippilot.repository.ReservationRepository;
import com.trippilot.repository.TripRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ReservationService {

    private final ReservationRepository reservationRepo;
    private final TripRepository tripRepo;
    private final GeminiService geminiService;

    public ReservationService(ReservationRepository reservationRepo, TripRepository tripRepo, GeminiService geminiService) {
        this.reservationRepo = reservationRepo;
        this.tripRepo = tripRepo;
        this.geminiService = geminiService;
    }

    public List<Reservation> getReservationsByUser(String userId) {
        return reservationRepo.findByUserId(userId);
    }

    public Reservation createReservation(String userId, String tripId, String type, String title,
                                          String confirmationCode, String dateTime, String details, BigDecimal cost) {
        Reservation res = new Reservation();
        res.setId("res-" + UUID.randomUUID().toString().substring(0, 8));
        res.setUserId(userId);
        res.setTripId(tripId);
        res.setType(type);
        res.setTitle(title);
        res.setConfirmationCode(confirmationCode != null ? confirmationCode : "CONF-" + (int)(100000 + Math.random() * 900000));
        if (dateTime != null && !dateTime.isBlank()) {
            try { res.setDateTime(LocalDateTime.parse(dateTime)); }
            catch (Exception e) { res.setDateTime(LocalDateTime.now().plusDays(2)); }
        } else {
            res.setDateTime(LocalDateTime.now().plusDays(2));
        }
        res.setDetails(details);
        res.setCost(cost != null ? cost : BigDecimal.ZERO);
        reservationRepo.save(res);

        if (tripId != null && cost != null) {
            tripRepo.findById(tripId).ifPresent(trip -> {
                trip.setActualSpending(trip.getActualSpending().add(cost));
                tripRepo.save(trip);
            });
        }

        return res;
    }

    public Map<String, Object> parseReservationText(String rawText) {
        Map<String, Object> parsed = new LinkedHashMap<>();
        parsed.put("type", "Hotel");
        parsed.put("title", "Confirmed Stay");
        parsed.put("confirmationCode", "CONF-" + (int)(100000 + Math.random() * 900000));
        parsed.put("dateTime", LocalDateTime.now().plusDays(2).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        parsed.put("details", rawText.length() > 120 ? rawText.substring(0, 120) : rawText);
        parsed.put("cost", 4500);

        String lower = rawText.toLowerCase();
        if (lower.contains("flight") || lower.contains("indigo") || lower.contains("air") || lower.contains("pnr")) {
            parsed.put("type", "Transport");
            parsed.put("title", "Flight Booking Confirmation");
        } else if (lower.contains("hotel") || lower.contains("taj") || lower.contains("resort") || lower.contains("marriott")) {
            parsed.put("type", "Hotel");
            parsed.put("title", "Hotel Lodging Confirmation");
        } else if (lower.contains("airbnb")) {
            parsed.put("type", "Airbnb");
            parsed.put("title", "Airbnb Stay");
        } else if (lower.contains("table") || lower.contains("restaurant") || lower.contains("dinner")) {
            parsed.put("type", "Restaurant");
            parsed.put("title", "Dining Reservation");
        }

        Pattern codePattern = Pattern.compile("(?:pnr|ref|code|conf|booking id)[:\\s]*([a-zA-Z0-9\\-]+)", Pattern.CASE_INSENSITIVE);
        Matcher codeMatcher = codePattern.matcher(rawText);
        if (codeMatcher.find()) {
            parsed.put("confirmationCode", codeMatcher.group(1).toUpperCase());
        }

        Pattern costPattern = Pattern.compile("(?:₹|inr|rs\\.?|\\$)\\s*([\\d,]+)", Pattern.CASE_INSENSITIVE);
        Matcher costMatcher = costPattern.matcher(rawText);
        if (costMatcher.find()) {
            parsed.put("cost", Integer.parseInt(costMatcher.group(1).replace(",", "")));
        }

        return parsed;
    }

    // ============================================================
    // TRANSPORT & HOTEL SEARCH
    // ============================================================

    private static final Set<String> INDIAN_CITIES = Set.of(
        "delhi", "mumbai", "bangalore", "chennai", "kolkata", "hyderabad",
        "pune", "jaipur", "goa", "agra", "varanasi", "lucknow", "bhopal",
        "patna", "kochi", "ahmedabad", "surat", "indore", "nagpur",
        "udaipur", "jodhpur", "manali", "shimla", "thane", "nashik",
        "raipur", "ranchi", "guwahati", "amritsar", "dehradun", "mysore",
        "ajmer", "jaisalmer", "rishikesh", "darjeeling", "pondicherry",
        "ooty", "coorg", "kodaikanal", "munnar", "alleppey",
        "hampi", "mahabaleshwar", "lonavala", "mount-abu", "pushkar"
    );

    private boolean isIndianRoute(String from, String to) {
        return INDIAN_CITIES.contains(from.toLowerCase()) && INDIAN_CITIES.contains(to.toLowerCase());
    }

    public Map<String, Object> searchTransportAndHotels(String destination, String type, String from, String date) {
        Map<String, Object> results = new LinkedHashMap<>();
        String dest = destination != null ? destination : "Mumbai";
        String origin = (from != null && !from.isBlank()) ? from : "Delhi";
        boolean domestic = isIndianRoute(origin, dest);

        if ("all".equals(type) || "flight".equals(type)) {
            results.put("flights", domestic ? generateDomesticFlights(dest, origin) : generateInternationalFlights(dest, origin));
        }
        if ("all".equals(type) || "train".equals(type)) {
            if (domestic) {
                results.put("trains", generateTrainSuggestions(dest, origin));
            }
        }
        if ("all".equals(type) || "hotel".equals(type)) {
            results.put("hotels", domestic ? generateIndianHotels(dest) : generateInternationalHotels(dest));
        }
        return results;
    }

    private List<Map<String, Object>> generateDomesticFlights(String dest, String from) {
        String fromCode = getAirportCode(from);
        String destCode = getAirportCode(dest);
        List<Map<String, Object>> flights = new ArrayList<>();
        String[] airlines = {"IndiGo", "Air India", "SpiceJet", "Vistara", "AirAsia India"};
        int[][] times = {{6, 15}, {9, 30}, {12, 45}, {15, 20}, {18, 55}};
        for (int i = 0; i < 5; i++) {
            int[] t = times[i];
            int price = 2800 + new Random().nextInt(4000);
            String flightNo = airlines[i].substring(0, 2).toUpperCase() + "-" + (100 + new Random().nextInt(900));
            flights.add(Map.<String, Object>of(
                "airline", airlines[i], "flightNumber", flightNo,
                "from", from + " (" + fromCode + ")", "to", dest + " (" + destCode + ")",
                "departure", String.format("%02d:%02d", t[0], t[1]),
                "arrival", String.format("%02d:%02d", (t[0] + 2) % 24, (t[1] + 10) % 60),
                "price", price, "duration", "2h " + (10 + new Random().nextInt(30)) + "m",
                "stops", i == 0 ? "Non-stop" : (new Random().nextInt(2) + 1) + " stop(s)",
                "class", "Economy"
            ));
        }
        return flights;
    }

    private List<Map<String, Object>> generateInternationalFlights(String dest, String from) {
        String fromCode = getAirportCode(from);
        String destCode = getAirportCode(dest);
        List<Map<String, Object>> flights = new ArrayList<>();
        String[] airlines = {"Emirates", "Qatar Airways", "Singapore Airlines", "Lufthansa", "British Airways"};
        int[][] times = {{1, 30}, {4, 45}, {8, 15}, {14, 30}, {22, 0}};
        for (int i = 0; i < 5; i++) {
            int[] t = times[i];
            int price = 25000 + new Random().nextInt(50000);
            String flightNo = airlines[i].substring(0, 2).toUpperCase() + "-" + (1000 + new Random().nextInt(9000));
            int flightHours = 6 + new Random().nextInt(12);
            flights.add(Map.<String, Object>of(
                "airline", airlines[i], "flightNumber", flightNo,
                "from", from + " (" + fromCode + ")", "to", dest + " (" + destCode + ")",
                "departure", String.format("%02d:%02d", t[0], t[1]),
                "arrival", String.format("%02d:%02d", (t[0] + flightHours) % 24, (t[1] + 30) % 60),
                "price", price, "duration", flightHours + "h " + (10 + new Random().nextInt(50)) + "m",
                "stops", i < 2 ? "Non-stop" : "1 stop (" + (i == 2 ? "Dubai" : i == 3 ? "Frankfurt" : "London") + ")",
                "class", "Economy"
            ));
        }
        return flights;
    }

    private List<Map<String, Object>> generateTrainSuggestions(String dest, String from) {
        List<Map<String, Object>> trains = new ArrayList<>();
        String[][] trainData = {
            {"Rajdhani Express", "12301", "06:00", "14:30", "2A"},
            {"Shatabdi Express", "12002", "08:15", "16:45", "CC"},
            {"Duronto Express", "12259", "22:30", "08:00", "3A"},
            {"Garib Rath", "12909", "14:00", "23:30", "CC"},
            {"Superfast Express", "12823", "18:45", "05:15", "SL"}
        };

        for (String[] t : trainData) {
            int price = 650 + new Random().nextInt(2500);
            trains.add(Map.<String, Object>of(
                "name", t[0],
                "number", t[1],
                "from", from,
                "to", dest,
                "departure", t[2],
                "arrival", t[3],
                "class", t[4],
                "price", price,
                "duration", calculateDuration(t[2], t[3]),
                "runs", "Daily"
            ));
        }
        return trains;
    }

    private List<Map<String, Object>> generateIndianHotels(String dest) {
        List<Map<String, Object>> hotels = new ArrayList<>();
        String[][] hotelData = {
            {"Taj Hotels", "Taj " + dest + " Palace", "5", "22000", "Luxury", "Heritage suites with panoramic city views, world-class spa, and fine dining."},
            {"ITC Hotels", "ITC Grand " + dest, "5", "18500", "Luxury", "Sustainable luxury with award-winning restaurants and wellness center."},
            {"Oberoi Hotels", "The Oberoi " + dest, "5", "25000", "Luxury", "Iconic hospitality with elegant rooms and personalized butler service."},
            {"Radisson Blu", "Radisson Blu " + dest + " City Center", "4", "8500", "Business", "Modern business hotel with rooftop pool and conference facilities."},
            {"Lemon Tree", "Lemon Tree Premier " + dest, "3", "4200", "Budget", "Comfortable and affordable with complimentary breakfast and Wi-Fi."}
        };
        for (String[] h : hotelData) {
            hotels.add(Map.<String, Object>of(
                "chain", h[0], "name", h[1], "stars", Integer.parseInt(h[2]),
                "pricePerNight", Integer.parseInt(h[3]), "category", h[4],
                "description", h[5], "amenities", "Free Wi-Fi, Breakfast, AC, Room Service",
                "location", "City Center, " + dest
            ));
        }
        return hotels;
    }

    private List<Map<String, Object>> generateInternationalHotels(String dest) {
        List<Map<String, Object>> hotels = new ArrayList<>();
        String[][] hotelData = {
            {"Hilton", "Hilton " + dest, "5", "180 USD", "Luxury", "World-class luxury hotel with premium amenities, spa, and rooftop bar."},
            {"Marriott", "Marriott " + dest + " Resort", "5", "150 USD", "Luxury", "Elegant resort with infinity pool, fine dining, and ocean views."},
            {"Hyatt", "Hyatt Regency " + dest, "5", "160 USD", "Luxury", "Premium business and leisure hotel with state-of-the-art facilities."},
            {"InterContinental", "InterContinental " + dest, "4", "120 USD", "Business", "Iconic hotel brand with Michelin-star restaurants and executive lounges."},
            {"Novotel", "Novotel " + dest + " Centre", "4", "90 USD", "Business", "Modern mid-range hotel with conference rooms and central location."},
            {"Ibis", "Ibis Budget " + dest, "3", "55 USD", "Budget", "Smart and affordable hotel with comfortable rooms and breakfast included."}
        };
        for (String[] h : hotelData) {
            hotels.add(Map.<String, Object>of(
                "chain", h[0], "name", h[1], "stars", Integer.parseInt(h[2]),
                "pricePerNight", h[3], "category", h[4],
                "description", h[5], "amenities", "Free Wi-Fi, Breakfast, AC, Room Service",
                "location", "City Center, " + dest
            ));
        }
        return hotels;
    }

    private String getAirportCode(String city) {
        return switch (city.toLowerCase()) {
            // India
            case "delhi" -> "DEL";
            case "mumbai" -> "BOM";
            case "bangalore" -> "BLR";
            case "chennai" -> "MAA";
            case "kolkata" -> "CCU";
            case "hyderabad" -> "HYD";
            case "pune" -> "PNQ";
            case "jaipur" -> "JAI";
            case "goa" -> "GOI";
            case "agra" -> "AGR";
            case "varanasi" -> "VNS";
            case "lucknow" -> "LKO";
            case "bhopal" -> "BHO";
            case "patna" -> "PAT";
            case "kochi" -> "COK";
            case "ahmedabad" -> "AMD";
            case "surat" -> "STV";
            case "indore" -> "IDR";
            case "nagpur" -> "NAG";
            case "udaipur" -> "UDR";
            case "jodhpur" -> "JDH";
            case "manali" -> "KUU";
            case "shimla" -> "SLV";
            case "thane" -> "BOM";
            // International
            case "paris" -> "CDG";
            case "london" -> "LHR";
            case "new york", "nyc" -> "JFK";
            case "tokyo" -> "NRT";
            case "dubai" -> "DXB";
            case "bangkok" -> "BKK";
            case "singapore" -> "SIN";
            case "rome" -> "FCO";
            case "barcelona" -> "BCN";
            case "greece", "athens" -> "ATH";
            case "berlin" -> "BER";
            case "amsterdam" -> "AMS";
            case "istanbul" -> "IST";
            case "sydney" -> "SYD";
            case "hong kong" -> "HKG";
            case "toronto" -> "YYZ";
            default -> city.substring(0, Math.min(3, city.length())).toUpperCase();
        };
    }

    private String calculateDuration(String dep, String arr) {
        try {
            String[] depParts = dep.split(":");
            String[] arrParts = arr.split(":");
            int depMins = Integer.parseInt(depParts[0]) * 60 + Integer.parseInt(depParts[1]);
            int arrMins = Integer.parseInt(arrParts[0]) * 60 + Integer.parseInt(arrParts[1]);
            int diff = arrMins - depMins;
            if (diff < 0) diff += 24 * 60;
            return (diff / 60) + "h " + (diff % 60) + "m";
        } catch (Exception e) {
            return "8h 00m";
        }
        };
    }
