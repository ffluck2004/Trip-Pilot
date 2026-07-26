package com.trippilot.controller;

import com.trippilot.dto.request.CreateAdminPlaceRequest;
import com.trippilot.entity.AdminPlace;
import com.trippilot.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) { this.adminService = adminService; }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(adminService.getAnalytics());
    }

    @GetMapping("/places")
    public ResponseEntity<List<AdminPlace>> getPlaces() {
        return ResponseEntity.ok(adminService.getAdminPlaces());
    }

    @PostMapping("/places")
    public ResponseEntity<Map<String, Object>> createPlace(@RequestBody CreateAdminPlaceRequest req) {
        AdminPlace place = adminService.createAdminPlace(req);
        return ResponseEntity.ok(Map.of("success", true, "place", place));
    }

    @DeleteMapping("/places/{id}")
    public ResponseEntity<Map<String, Object>> deletePlace(@PathVariable String id) {
        adminService.deleteAdminPlace(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers() {
        return ResponseEntity.ok(adminService.getUsers());
    }
}
