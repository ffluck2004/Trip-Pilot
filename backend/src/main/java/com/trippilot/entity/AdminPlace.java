package com.trippilot.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "admin_places")
public class AdminPlace {
    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    private String category;
    private Double lat;
    private Double lng;
    private String address;

    private BigDecimal rating = BigDecimal.valueOf(4.5);

    public AdminPlace() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
}
