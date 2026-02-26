package com.realstream.interaction.dto;

import lombok.Builder;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
public class LikeStatus {
    @JsonProperty("isLiked")
    private boolean isLiked;
    private long likeCount;
}
