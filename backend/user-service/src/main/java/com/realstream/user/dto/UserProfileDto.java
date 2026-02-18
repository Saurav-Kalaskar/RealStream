package com.realstream.user.dto;

import lombok.Data;
import java.util.Set;

@Data
public class UserProfileDto {
    private String username;
    private String bio;
    private String profileImageUrl;
    private Set<String> followedHashtags;
}
