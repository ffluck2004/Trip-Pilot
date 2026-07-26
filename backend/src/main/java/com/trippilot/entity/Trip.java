package com.trippilot.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "trips")
public class Trip {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    @JsonIgnore
    private String destination;

    @Column(name = "duration_days", nullable = false)
    @JsonIgnore
    private Integer durationDays;

    @Column(name = "duration_hours")
    @JsonIgnore
    private Integer durationHours;

    @JsonIgnore
    private BigDecimal budget;

    @Column(name = "people_count")
    @JsonIgnore
    private Integer peopleCount = 1;

    @Column(name = "travel_radius_km")
    @JsonIgnore
    private BigDecimal travelRadiusKm = BigDecimal.valueOf(5);

    @JsonIgnore
    private String interests;

    @JsonIgnore
    private String travelStyle;

    @JsonIgnore
    private String preferencesText;

    @Column(name = "planned_budget")
    private BigDecimal plannedBudget;

    @Column(name = "actual_spending")
    private BigDecimal actualSpending = BigDecimal.ZERO;

    private String status = "planning";

    @Column(name = "current_location_idx")
    private Integer currentLocationIdx = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("sortOrder ASC")
    private List<ItineraryItem> itinerary = new ArrayList<>();

    public Trip() {}

    // ── JSON "input" nested object ──────────────────────────────
    @JsonProperty("input")
    public Map<String, Object> getInput() {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("destination", destination);
        input.put("durationInDays", durationDays);
        if (durationHours != null) input.put("durationInHours", durationHours);
        input.put("budget", budget);
        input.put("peopleCount", peopleCount);
        input.put("travelRadiusKm", travelRadiusKm);
        input.put("interests", interests != null && !interests.isBlank()
                ? List.of(interests.split("\\s*,\\s*"))
                : List.of());
        input.put("travelStyle", travelStyle);
        input.put("preferences", preferencesText);
        return input;
    }

    // ── JSON "optimizedOrder" (itinerary item IDs in order) ─────
    @JsonProperty("optimizedOrder")
    public List<String> getOptimizedOrder() {
        return itinerary.stream()
                .map(ItineraryItem::getId)
                .toList();
    }

    // ── Getters / Setters (flat fields, used by JPA) ────────────
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
    public Integer getDurationHours() { return durationHours; }
    public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    public Integer getPeopleCount() { return peopleCount; }
    public void setPeopleCount(Integer peopleCount) { this.peopleCount = peopleCount; }
    public BigDecimal getTravelRadiusKm() { return travelRadiusKm; }
    public void setTravelRadiusKm(BigDecimal travelRadiusKm) { this.travelRadiusKm = travelRadiusKm; }
    public String getInterests() { return interests; }
    public void setInterests(String interests) { this.interests = interests; }
    public String getTravelStyle() { return travelStyle; }
    public void setTravelStyle(String travelStyle) { this.travelStyle = travelStyle; }
    public String getPreferencesText() { return preferencesText; }
    public void setPreferencesText(String preferencesText) { this.preferencesText = preferencesText; }
    public BigDecimal getPlannedBudget() { return plannedBudget; }
    public void setPlannedBudget(BigDecimal plannedBudget) { this.plannedBudget = plannedBudget; }
    public BigDecimal getActualSpending() { return actualSpending; }
    public void setActualSpending(BigDecimal actualSpending) { this.actualSpending = actualSpending; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCurrentLocationIdx() { return currentLocationIdx; }
    public void setCurrentLocationIdx(Integer currentLocationIdx) { this.currentLocationIdx = currentLocationIdx; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<ItineraryItem> getItinerary() { return itinerary; }
    public void setItinerary(List<ItineraryItem> itinerary) { this.itinerary = itinerary; }
}
