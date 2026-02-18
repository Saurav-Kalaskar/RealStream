package com.realstream.comment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "comments")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String videoId; // External ID from Content Service

    @Column(nullable = false)
    private UUID userId; // External ID from Auth Service

    @Column(nullable = false, length = 1000)
    private String content;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
