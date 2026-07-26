package com.trippilot.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class GenerateTripRequest {
    private String userId;
    @NotBlank
    private String destination;
    @Positive
    private Integer durationInDays;
    private Integer durationInHours;
    private BigDecimal budget;
    private Integer peopleCount;
    private BigDecimal travelRadiusKm;
    private String interests;
    private String travelStyle;
    private String preferences;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public Integer getDurationInDays() { return durationInDays; }
    public void setDurationInDays(Integer d) { this.durationInDays = d; }
    public Integer getDurationInHours() { return durationInHours; }
    public void setDurationInHours(Integer d) { this.durationInHours = d; }
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
    public String getPreferences() { return preferences; }
    public void setPreferences(String preferences) { this.preferences = preferences; }
}
