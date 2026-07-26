package com.trippilot.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "places")
public class Place {
    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    private String destination;
    private String type;
    private String category;
    private String flightTime;

    private BigDecimal price;
    private BigDecimal rating;
    private String ratingBadge;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String tags;
    private String address;
    private Double lat;
    private Double lng;
    private String hours;
    private String metro;

    @Column(columnDefinition = "TEXT")
    private String gallery;

    private String amenities;

    public Place() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getFlightTime() { return flightTime; }
    public void setFlightTime(String flightTime) { this.flightTime = flightTime; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
    public String getRatingBadge() { return ratingBadge; }
    public void setRatingBadge(String ratingBadge) { this.ratingBadge = ratingBadge; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public String getHours() { return hours; }
    public void setHours(String hours) { this.hours = hours; }
    public String getMetro() { return metro; }
    public void setMetro(String metro) { this.metro = metro; }
    public String getGallery() { return gallery; }
    public void setGallery(String gallery) { this.gallery = gallery; }
    public String getAmenities() { return amenities; }
    public void setAmenities(String amenities) { this.amenities = amenities; }
}
