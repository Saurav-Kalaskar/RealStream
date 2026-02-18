package com.realstream.interaction.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LikeStatus {
    private boolean isLiked;
    private long likeCount;
}
