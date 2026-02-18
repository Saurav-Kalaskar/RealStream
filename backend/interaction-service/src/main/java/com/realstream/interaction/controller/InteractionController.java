package com.realstream.interaction.controller;

import com.realstream.interaction.dto.LikeStatus;
import com.realstream.interaction.model.Like;
import com.realstream.interaction.repository.LikeRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
//@RequestMapping("/interactions")
@RequiredArgsConstructor
public class InteractionController {

    private final LikeRepository likeRepository;

    @PostMapping("/likes/{videoId}")
    @Transactional
    public ResponseEntity<LikeStatus> toggleLike(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable String videoId) {
        
        boolean exists = likeRepository.existsByUserIdAndVideoId(userId, videoId);
        
        if (exists) {
            likeRepository.deleteByUserIdAndVideoId(userId, videoId);
        } else {
            likeRepository.save(Like.builder()
                    .userId(userId)
                    .videoId(videoId)
                    .build());
        }
        
        return ResponseEntity.ok(LikeStatus.builder()
                .isLiked(!exists)
                .likeCount(likeRepository.countByVideoId(videoId))
                .build());
    }

    @GetMapping("/likes/{videoId}")
    public ResponseEntity<LikeStatus> getLikeStatus(
            @RequestHeader(value = "X-User-Id", required = false) UUID userId,
            @PathVariable String videoId) {
        
        boolean isLiked = userId != null && likeRepository.existsByUserIdAndVideoId(userId, videoId);
        
        return ResponseEntity.ok(LikeStatus.builder()
                .isLiked(isLiked)
                .likeCount(likeRepository.countByVideoId(videoId))
                .build());
    }
}
