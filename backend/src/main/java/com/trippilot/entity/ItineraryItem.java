package com.trippilot.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "itinerary_items")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ItineraryItem {
    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Trip trip;

    @Column(name = "\"day\"")
    private Integer day;
    private String timeSlot;

    @Column(nullable = false)
    private String title;

    private String description;
    private String category;
    private Double lat;
    private Double lng;

    @Column(name = "cost_estimation")
    private BigDecimal costEstimation = BigDecimal.ZERO;

    @Column(name = "duration_minutes")
    @JsonProperty("estimatedDurationMinutes")
    private Integer durationMinutes = 60;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "distance_prev_km")
    @JsonProperty("distanceFromPreviousKm")
    private BigDecimal distancePrevKm = BigDecimal.ZERO;

    @Column(name = "travel_time_prev_min")
    @JsonProperty("travelTimeFromPreviousMinutes")
    private Integer travelTimePrevMin = 0;

    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    private Integer upvotes = 1;
    private Integer downvotes = 0;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    public ItineraryItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Trip getTrip() { return trip; }
    public void setTrip(Trip trip) { this.trip = trip; }
    public Integer getDay() { return day; }
    public void setDay(Integer day) { this.day = day; }
    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public BigDecimal getCostEstimation() { return costEstimation; }
    public void setCostEstimation(BigDecimal costEstimation) { this.costEstimation = costEstimation; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public BigDecimal getDistancePrevKm() { return distancePrevKm; }
    public void setDistancePrevKm(BigDecimal distancePrevKm) { this.distancePrevKm = distancePrevKm; }
    public Integer getTravelTimePrevMin() { return travelTimePrevMin; }
    public void setTravelTimePrevMin(Integer travelTimePrevMin) { this.travelTimePrevMin = travelTimePrevMin; }
    public Boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(Boolean isCompleted) { this.isCompleted = isCompleted; }
    public Integer getUpvotes() { return upvotes; }
    public void setUpvotes(Integer upvotes) { this.upvotes = upvotes; }
    public Integer getDownvotes() { return downvotes; }
    public void setDownvotes(Integer downvotes) { this.downvotes = downvotes; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
