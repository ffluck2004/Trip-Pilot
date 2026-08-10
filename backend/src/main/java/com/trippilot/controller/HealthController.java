package com.trippilot.controller;

import com.trippilot.config.FailoverDataSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        if (dataSource instanceof FailoverDataSource failover) {
            body.put("database", failover.activeMode());
            body.put("fallbackActive", failover.usingFallback());
        }
        return ResponseEntity.ok(body);
    }
}
