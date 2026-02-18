package com.realstream.comment.repository;

import com.realstream.comment.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByVideoIdOrderByCreatedAtDesc(String videoId);
    long countByVideoId(String videoId);
}
