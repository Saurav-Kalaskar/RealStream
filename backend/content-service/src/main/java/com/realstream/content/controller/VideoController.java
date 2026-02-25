package com.realstream.content.controller;

import com.realstream.content.model.Video;
import com.realstream.content.repository.VideoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.List;

@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoRepository videoRepository;

    @PostMapping
    public ResponseEntity<Video> createOrUpdateVideo(@RequestBody Video video) {
        return videoRepository.findByVideoId(video.getVideoId())
                .map(existing -> {
                    // Update existing
                    existing.setViewCount(video.getViewCount());
                    existing.setHashtags(video.getHashtags());
                    return ResponseEntity.ok(videoRepository.save(existing));
                })
                .orElseGet(() -> {
                    // Create new
                    return ResponseEntity.ok(videoRepository.save(video));
                });
    }

    @GetMapping
    public ResponseEntity<Page<Video>> getAllVideos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String hashtag,
            @RequestParam(required = false) String channel) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

        if (hashtag != null && !hashtag.isBlank()) {
            // Normalize to combined hashtag format: "Amazon DSA" → "#amazon-dsa"
            // This matches exactly what the scraper stores
            String normalized = "#" + hashtag.trim().toLowerCase().replaceAll("\\s+", "-");
            Page<Video> videos = videoRepository.findByHashtagsIn(List.of(normalized), pageable);
            return ResponseEntity.ok(videos);
        }

        if (channel != null && !channel.isBlank()) {
            // Filter by channel title
            // Note: This is an exact match. For partial match, we'd need a regex or text index in Mongo.
            Page<Video> videos = videoRepository.findByChannelTitle(channel, pageable);
            return ResponseEntity.ok(videos);
        }

        return ResponseEntity.ok(videoRepository.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Video> getVideo(@PathVariable String id) {
        return videoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
