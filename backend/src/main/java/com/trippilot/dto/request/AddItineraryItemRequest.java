package com.trippilot.dto.request;

import java.math.BigDecimal;

public class AddItineraryItemRequest {
    private String title;
    private String description;
    private String category;
    private Double lat;
    private Double lng;
    private BigDecimal costEstimation;
    private Integer estimatedDurationMinutes;
    private String address;
    private Integer day;

    public String getTitle() { return title; }
    public void setTitle(String t) { this.title = t; }
    public String getDescription() { return description; }
    public void setDescription(String d) { this.description = d; }
    public String getCategory() { return category; }
    public void setCategory(String c) { this.category = c; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public BigDecimal getCostEstimation() { return costEstimation; }
    public void setCostEstimation(BigDecimal c) { this.costEstimation = c; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer d) { this.estimatedDurationMinutes = d; }
    public String getAddress() { return address; }
    public void setAddress(String a) { this.address = a; }
    public Integer getDay() { return day; }
    public void setDay(Integer d) { this.day = d; }
}
