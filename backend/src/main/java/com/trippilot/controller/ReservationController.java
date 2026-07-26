package com.trippilot.controller;

import com.trippilot.dto.request.CreateReservationRequest;
import com.trippilot.dto.request.ParseReservationRequest;
import com.trippilot.entity.Reservation;
import com.trippilot.service.ReservationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) { this.reservationService = reservationService; }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Reservation>> getReservations(@PathVariable String userId) {
        return ResponseEntity.ok(reservationService.getReservationsByUser(userId));
    }

    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parseReservation(@RequestBody ParseReservationRequest req) {
        Map<String, Object> parsed = reservationService.parseReservationText(req.getRawText());
        return ResponseEntity.ok(Map.of("success", true, "parsed", parsed));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReservation(@RequestBody CreateReservationRequest req) {
        Reservation res = reservationService.createReservation(
            req.getUserId(), req.getTripId(), req.getType(), req.getTitle(),
            req.getConfirmationCode(), req.getDateTime(), req.getDetails(), req.getCost());
        return ResponseEntity.ok(Map.of("success", true, "reservation", res));
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchTransportAndHotels(
            @RequestParam String destination,
            @RequestParam(defaultValue = "all") String type,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String date) {
        Map<String, Object> results = reservationService.searchTransportAndHotels(destination, type, from, date);
        return ResponseEntity.ok(Map.of("success", true, "results", results));
    }
}
