package com.trippilot.dto.response;

import java.util.Map;

public class ChatResponse {
    private String text;
    private Map<String, Object> proposedTrip;

    public ChatResponse() {}

    public ChatResponse(String text, Map<String, Object> proposedTrip) {
        this.text = text;
        this.proposedTrip = proposedTrip;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public Map<String, Object> getProposedTrip() { return proposedTrip; }
    public void setProposedTrip(Map<String, Object> proposedTrip) { this.proposedTrip = proposedTrip; }
}
