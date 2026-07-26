package com.trippilot.controller;

import com.trippilot.dto.request.LoginRequest;
import com.trippilot.dto.request.RegisterRequest;
import com.trippilot.dto.request.PreferencesRequest;
import com.trippilot.dto.response.AuthResponse;
import com.trippilot.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) { this.authService = authService; }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        AuthResponse resp = authService.register(req);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse resp = authService.login(req);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/profile/{id}")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable String id) {
        return ResponseEntity.ok(authService.getProfile(id));
    }

    @PostMapping("/profile/{id}/preferences")
    public ResponseEntity<Map<String, Object>> updatePreferences(@PathVariable String id, @RequestBody PreferencesRequest req) {
        return ResponseEntity.ok(authService.updatePreferences(id, req.getStyles(), req.getInterests()));
    }
}
