package com.trippilot.dto.request;

public class ChatRequest {
    private String message;
    private String tripContextJson;

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTripContextJson() { return tripContextJson; }
    public void setTripContextJson(String tripContextJson) { this.tripContextJson = tripContextJson; }
}
