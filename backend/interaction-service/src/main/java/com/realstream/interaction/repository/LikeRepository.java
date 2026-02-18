package com.realstream.interaction.repository;

import com.realstream.interaction.model.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LikeRepository extends JpaRepository<Like, UUID> {
    long countByVideoId(String videoId);
    boolean existsByUserIdAndVideoId(UUID userId, String videoId);
    void deleteByUserIdAndVideoId(UUID userId, String videoId);
}
