package com.realstream.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
public class AppProperties {
    private final Auth auth = new Auth();
    private final OAuth2 oauth2 = new OAuth2();

    @Getter
    @Setter
    public static class Auth {
        // Override in production via APP_AUTH_TOKEN_SECRET env var
        private String tokenSecret = "default-dev-secret-change-me-in-production";
        private long tokenExpirationMsec = 86400000;
    }

    @Getter
    @Setter
    public static class OAuth2 {
        private List<String> authorizedRedirectUris = new ArrayList<>();
    }
}
