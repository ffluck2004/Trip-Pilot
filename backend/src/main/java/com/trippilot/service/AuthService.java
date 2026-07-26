package com.trippilot.service;

import com.trippilot.dto.request.LoginRequest;
import com.trippilot.dto.request.RegisterRequest;
import com.trippilot.dto.response.AuthResponse;
import com.trippilot.entity.User;
import com.trippilot.exception.BadRequestException;
import com.trippilot.exception.UnauthorizedException;
import com.trippilot.repository.UserRepository;
import com.trippilot.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtProvider;

    public AuthService(UserRepository userRepo, PasswordEncoder passwordEncoder, JwtTokenProvider jwtProvider) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmailIgnoreCase(req.getEmail())) {
            return AuthResponse.fail("User with this email already registered.");
        }

        User user = new User(
            "u-" + randomId(),
            req.getEmail().toLowerCase(),
            passwordEncoder.encode(req.getPassword()),
            req.getName(),
            "USER"
        );
        if (req.getPreferencesStyles() != null) user.setPreferencesStyles(req.getPreferencesStyles());
        if (req.getPreferencesInterests() != null) user.setPreferencesInterests(req.getPreferencesInterests());
        userRepo.save(user);

        String token = jwtProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return AuthResponse.ok(userMap(user), token);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmailIgnoreCase(req.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        String token = jwtProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        return AuthResponse.ok(userMap(user), token);
    }

    public Map<String, Object> getProfile(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new com.trippilot.exception.ResourceNotFoundException("User not found."));
        Map<String, Object> map = userMap(user);
        map.remove("role");
        return map;
    }

    public Map<String, Object> updatePreferences(String userId, String styles, String interests) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new com.trippilot.exception.ResourceNotFoundException("User not found."));
        user.setPreferencesStyles(styles);
        user.setPreferencesInterests(interests);
        userRepo.save(user);
        return Map.of("success", true, "styles", styles != null ? styles : "", "interests", interests != null ? interests : "");
    }

    private Map<String, Object> userMap(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("email", user.getEmail());
        map.put("name", user.getName());
        map.put("role", user.getRole());
        Map<String, Object> prefs = new LinkedHashMap<>();
        prefs.put("styles", user.getPreferencesStyles() != null ? user.getPreferencesStyles().split(",") : new String[]{});
        prefs.put("interests", user.getPreferencesInterests() != null ? user.getPreferencesInterests().split(",") : new String[]{});
        map.put("preferences", prefs);
        return map;
    }

    private String randomId() {
        return java.util.UUID.randomUUID().toString().substring(0, 8);
    }
}
