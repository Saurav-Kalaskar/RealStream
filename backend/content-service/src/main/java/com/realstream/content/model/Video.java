package com.realstream.content.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "videos")
public class Video {

    @Id
    private String id;

    @Indexed(unique = true)
    private String videoId; // External ID (e.g., YouTube ID)

    private String title;
    private String url;
    private String thumbnailUrl;
    private Integer duration; // in seconds
    private Long viewCount;

    private String channelTitle;

    @Indexed
    private List<String> hashtags;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
