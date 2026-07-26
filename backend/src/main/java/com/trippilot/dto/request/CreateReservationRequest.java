package com.trippilot.dto.request;

import java.math.BigDecimal;

public class CreateReservationRequest {
    private String userId;
    private String tripId;
    private String type;
    private String title;
    private String confirmationCode;
    private String dateTime;
    private String details;
    private BigDecimal cost;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTripId() { return tripId; }
    public void setTripId(String tripId) { this.tripId = tripId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getConfirmationCode() { return confirmationCode; }
    public void setConfirmationCode(String c) { this.confirmationCode = c; }
    public String getDateTime() { return dateTime; }
    public void setDateTime(String d) { this.dateTime = d; }
    public String getDetails() { return details; }
    public void setDetails(String d) { this.details = d; }
    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }
}
