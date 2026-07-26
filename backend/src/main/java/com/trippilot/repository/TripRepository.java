package com.trippilot.repository;

import com.trippilot.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TripRepository extends JpaRepository<Trip, String> {
    List<Trip> findByUserIdOrderByCreatedAtDesc(String userId);
}
