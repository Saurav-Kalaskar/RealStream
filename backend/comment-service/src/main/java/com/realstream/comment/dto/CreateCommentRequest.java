package com.realstream.comment.dto;

import lombok.Data;

@Data
public class CreateCommentRequest {
    private String videoId;
    private String content;
    private String displayName;
}
