package com.realstream.user.controller;

import com.realstream.user.dto.UserProfileDto;
import com.realstream.user.model.UserProfile;
import com.realstream.user.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
// @RequestMapping("/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<UserProfile> getMyProfile(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(userProfileService.getOrCreateProfile(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfile> updateMyProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody UserProfileDto dto) {
        return ResponseEntity.ok(userProfileService.updateProfile(userId, dto));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfile> getUserProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(userProfileService.getOrCreateProfile(userId));
    }
}
