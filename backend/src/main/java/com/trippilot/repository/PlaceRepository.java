package com.trippilot.repository;

import com.trippilot.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlaceRepository extends JpaRepository<Place, String> {
    List<Place> findByType(String type);
    List<Place> findByCategoryIgnoreCase(String category);
    List<Place> findByTypeAndCategoryIgnoreCase(String type, String category);
}
