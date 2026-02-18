package com.realstream.user.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID userId; // Linked to Auth Service User ID

    private String username; // Display name (can differ from auth name)

    private String bio;

    private String profileImageUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_hashtags", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "hashtag")
    @Builder.Default
    private Set<String> followedHashtags = new HashSet<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
