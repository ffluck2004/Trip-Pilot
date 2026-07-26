package com.trippilot.service;

import com.trippilot.dto.request.CreateAdminPlaceRequest;
import com.trippilot.entity.AdminPlace;
import com.trippilot.entity.Expense;
import com.trippilot.entity.Trip;
import com.trippilot.entity.User;
import com.trippilot.exception.ResourceNotFoundException;
import com.trippilot.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepo;
    private final TripRepository tripRepo;
    private final ExpenseRepository expenseRepo;
    private final AdminPlaceRepository adminPlaceRepo;

    public AdminService(UserRepository userRepo, TripRepository tripRepo, ExpenseRepository expenseRepo, AdminPlaceRepository adminPlaceRepo) {
        this.userRepo = userRepo;
        this.tripRepo = tripRepo;
        this.expenseRepo = expenseRepo;
        this.adminPlaceRepo = adminPlaceRepo;
    }

    public Map<String, Object> getAnalytics() {
        long totalUsers = userRepo.count();
        long totalTrips = tripRepo.count();
        List<Trip> allTrips = tripRepo.findAll();
        long activeTrips = allTrips.stream().filter(t -> "live".equals(t.getStatus())).count();
        long activeUsers = Math.max(1, Math.round(totalUsers * 0.7));

        // Popular destinations
        Map<String, Long> destCounts = allTrips.stream()
            .collect(Collectors.groupingBy(Trip::getDestination, Collectors.counting()));
        List<Map<String, Object>> popularDestinations = destCounts.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(5)
            .map(e -> Map.<String, Object>of("name", e.getKey(), "count", e.getValue()))
            .toList();

        // Category distribution from itinerary items
        Map<String, Long> catCounts = allTrips.stream()
            .flatMap(t -> t.getItinerary().stream())
            .collect(Collectors.groupingBy(i -> i.getCategory() != null ? i.getCategory() : "other", Collectors.counting()));
        List<Map<String, Object>> categoryDistribution = catCounts.entrySet().stream()
            .map(e -> Map.<String, Object>of("category", e.getKey(), "value", e.getValue()))
            .toList();

        // Heatmap from itinerary coordinates
        List<Map<String, Object>> heatmapPoints = allTrips.stream()
            .flatMap(t -> t.getItinerary().stream())
            .filter(i -> i.getLat() != null && i.getLng() != null)
            .limit(50)
            .map(i -> Map.<String, Object>of("lat", i.getLat(), "lng", i.getLng(), "intensity", 0.5 + Math.random() * 0.5, "label", i.getTitle()))
            .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalUsers", totalUsers);
        result.put("activeUsers", activeUsers);
        result.put("totalTrips", totalTrips);
        result.put("activeTrips", activeTrips);
        result.put("popularDestinations", popularDestinations);
        result.put("popularRoutes", List.of(
            Map.of("from", "Mumbai", "to", "Goa", "count", 45),
            Map.of("from", "Delhi", "to", "Jaipur", "count", 38),
            Map.of("from", "Bangalore", "to", "Coorg", "count", 29)
        ));
        result.put("categoryDistribution", categoryDistribution);
        result.put("userGrowth", List.of(
            Map.of("date", "Jan", "users", 120), Map.of("date", "Feb", "users", 250),
            Map.of("date", "Mar", "users", 420), Map.of("date", "Apr", "users", 580),
            Map.of("date", "May", "users", 750), Map.of("date", "Jun", "users", 920)
        ));
        result.put("revenueData", List.of(
            Map.of("month", "Jan", "income", 15000), Map.of("month", "Feb", "income", 28000),
            Map.of("month", "Mar", "income", 42000), Map.of("month", "Apr", "income", 55000)
        ));
        result.put("heatmapPoints", heatmapPoints);
        return result;
    }

    public List<AdminPlace> getAdminPlaces() { return adminPlaceRepo.findAll(); }

    public AdminPlace createAdminPlace(CreateAdminPlaceRequest req) {
        AdminPlace place = new AdminPlace();
        place.setId("ap-" + UUID.randomUUID().toString().substring(0, 8));
        place.setTitle(req.getTitle());
        place.setCategory(req.getCategory());
        place.setLat(req.getLat());
        place.setLng(req.getLng());
        place.setAddress(req.getAddress());
        place.setRating(req.getRating() != null ? req.getRating() : BigDecimal.valueOf(4.5));
        return adminPlaceRepo.save(place);
    }

    public void deleteAdminPlace(String id) {
        if (!adminPlaceRepo.existsById(id)) throw new ResourceNotFoundException("Place not found.");
        adminPlaceRepo.deleteById(id);
    }

    public List<Map<String, Object>> getUsers() {
        return userRepo.findAll().stream().map(u -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole());
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).toList();
    }
}
