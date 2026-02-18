package com.realstream.user.service;

import com.realstream.user.dto.UserProfileDto;
import com.realstream.user.model.UserProfile;
import com.realstream.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;

    public UserProfile getOrCreateProfile(UUID userId) {
        return userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile profile = new UserProfile();
                    profile.setUserId(userId);
                    return userProfileRepository.save(profile);
                });
    }

    @Transactional
    public UserProfile updateProfile(UUID userId, UserProfileDto dto) {
        UserProfile profile = getOrCreateProfile(userId);

        if (dto.getUsername() != null)
            profile.setUsername(dto.getUsername());
        if (dto.getBio() != null)
            profile.setBio(dto.getBio());
        if (dto.getProfileImageUrl() != null)
            profile.setProfileImageUrl(dto.getProfileImageUrl());
        if (dto.getFollowedHashtags() != null)
            profile.setFollowedHashtags(dto.getFollowedHashtags());

        return userProfileRepository.save(profile);
    }
}
