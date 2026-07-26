package com.trippilot.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.util.Map;
import java.net.http.HttpResponse;

@Service
public class GeminiService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generateContent(String prompt) {
        if (!isAvailable()) return null;
        try {
            String body = mapper.writeValueAsString(Map.of(
                "contents", Map.of("parts", prompt),
                "generationConfig", Map.of(
                    "responseMimeType", "application/json",
                    "temperature", 0.8
                )
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode data = mapper.readTree(response.body());
            return data.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
        } catch (Exception e) {
            System.err.println("Gemini API error: " + e.getMessage());
            return null;
        }
    }

    public String generateWithSystem(String systemPrompt, String userMessage) {
        if (!isAvailable()) return null;
        try {
            String body = mapper.writeValueAsString(Map.of(
                "contents", Map.of("parts", userMessage),
                "systemInstruction", Map.of("parts", systemPrompt),
                "generationConfig", Map.of("temperature", 0.7)
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode data = mapper.readTree(response.body());
            return data.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText(null);
        } catch (Exception e) {
            System.err.println("Gemini API error: " + e.getMessage());
            return null;
        }
    }
}
