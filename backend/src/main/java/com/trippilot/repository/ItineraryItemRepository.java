package com.trippilot.repository;

import com.trippilot.entity.ItineraryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, String> {
    List<ItineraryItem> findByTripIdOrderBySortOrderAsc(String tripId);
}
