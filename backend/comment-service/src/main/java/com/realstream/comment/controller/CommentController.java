package com.realstream.comment.controller;

import com.realstream.comment.dto.CreateCommentRequest;
import com.realstream.comment.model.Comment;
import com.realstream.comment.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
//@RequestMapping("/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;

    @PostMapping
    public ResponseEntity<Comment> addComment(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody CreateCommentRequest request) {
        
        Comment comment = Comment.builder()
                .userId(userId)
                .videoId(request.getVideoId())
                .content(request.getContent())
                .displayName(request.getDisplayName())
                .build();
                
        return ResponseEntity.ok(commentRepository.save(comment));
    }

    @GetMapping
    public ResponseEntity<List<Comment>> getComments(@RequestParam String videoId) {
        return ResponseEntity.ok(commentRepository.findByVideoIdOrderByCreatedAtDesc(videoId));
    }

    @GetMapping("/count")
    public ResponseEntity<Long> getCommentCount(@RequestParam String videoId) {
        return ResponseEntity.ok(commentRepository.countByVideoId(videoId));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @RequestHeader("X-User-Id") UUID userId, 
            @PathVariable UUID id) {
        // In a real app, verify that userId matches comment.userId or is Admin
        commentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
