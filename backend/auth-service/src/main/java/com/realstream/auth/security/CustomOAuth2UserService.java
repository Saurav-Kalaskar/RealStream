package com.realstream.auth.security;

import com.realstream.auth.model.AuthProvider;
import com.realstream.auth.model.Role;
import com.realstream.auth.model.User;
import com.realstream.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (Exception ex) {
            throw new OAuth2AuthenticationException(ex.getMessage());
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest oAuth2UserRequest, OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        Optional<User> userOptional = userRepository.findByEmail(email);
        User user;
        if (userOptional.isPresent()) {
            user = userOptional.get();
            user = updateExistingUser(user, oAuth2User);
        } else {
            user = registerNewUser(oAuth2UserRequest, oAuth2User);
        }
        return UserPrincipal.create(user, oAuth2User.getAttributes());
    }

    private User registerNewUser(OAuth2UserRequest oAuth2UserRequest, OAuth2User oAuth2User) {
        User user = new User();
        user.setProvider(AuthProvider.GOOGLE);
        user.setProviderId(oAuth2User.getName());
        user.setFullName(oAuth2User.getAttribute("name"));
        user.setEmail(oAuth2User.getAttribute("email"));
        user.setImageUrl(oAuth2User.getAttribute("picture"));
        user.setRole(Role.USER);
        return userRepository.save(user);
    }

    private User updateExistingUser(User existingUser, OAuth2User oAuth2User) {
        existingUser.setFullName(oAuth2User.getAttribute("name"));
        existingUser.setImageUrl(oAuth2User.getAttribute("picture"));
        return userRepository.save(existingUser);
    }
}
