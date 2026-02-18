package com.realstream.auth.config;

import com.realstream.auth.security.CustomOAuth2UserService;
import com.realstream.auth.security.JwtAuthenticationFilter;
import com.realstream.auth.security.OAuth2AuthenticationSuccessHandler;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final ClientRegistrationRepository clientRegistrationRepository;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/", "/login**", "/error**", "/oauth2/**").permitAll()
                                                .anyRequest().authenticated())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(
                                                                org.springframework.security.config.http.SessionCreationPolicy.ALWAYS))
                                .oauth2Login(oauth2 -> oauth2
                                                .authorizationEndpoint(authz -> authz
                                                                .authorizationRequestResolver(
                                                                                customAuthorizationRequestResolver()))
                                                .userInfoEndpoint(userInfo -> userInfo
                                                                .userService(customOAuth2UserService))
                                                .successHandler(oAuth2AuthenticationSuccessHandler))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        /**
         * Custom resolver that adds prompt=select_account to every Google OAuth
         * request,
         * forcing the account chooser to appear every time.
         */
        private OAuth2AuthorizationRequestResolver customAuthorizationRequestResolver() {
                DefaultOAuth2AuthorizationRequestResolver defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                                clientRegistrationRepository, "/oauth2/authorization");

                return new OAuth2AuthorizationRequestResolver() {
                        @Override
                        public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                                return addSelectAccountPrompt(defaultResolver.resolve(request));
                        }

                        @Override
                        public OAuth2AuthorizationRequest resolve(HttpServletRequest request,
                                        String clientRegistrationId) {
                                return addSelectAccountPrompt(defaultResolver.resolve(request, clientRegistrationId));
                        }

                        private OAuth2AuthorizationRequest addSelectAccountPrompt(OAuth2AuthorizationRequest request) {
                                if (request == null)
                                        return null;
                                Map<String, Object> extraParams = new HashMap<>(request.getAdditionalParameters());
                                extraParams.put("prompt", "select_account");
                                return OAuth2AuthorizationRequest.from(request)
                                                .additionalParameters(extraParams)
                                                .build();
                        }
                };
        }

        @Value("${app.oauth2.frontend-url:http://localhost:3000}")
        private String frontendUrl;

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:80", frontendUrl));
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
