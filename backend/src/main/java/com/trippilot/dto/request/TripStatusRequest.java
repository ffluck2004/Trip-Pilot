package com.trippilot.dto.request;

public class TripStatusRequest {
    private String status;
    private Integer currentLocationIdx;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCurrentLocationIdx() { return currentLocationIdx; }
    public void setCurrentLocationIdx(Integer i) { this.currentLocationIdx = i; }
}
