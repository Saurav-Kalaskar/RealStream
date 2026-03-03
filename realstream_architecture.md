# RealStream — Complete Low-Level Architecture Documentation

> **Deep-dive technical reference** — covers every binding point, data flow, design decision, and coding standard used across the entire project.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Production Infrastructure](#3-production-infrastructure)
4. [Microservices Inventory](#4-microservices-inventory)
5. [Service Binding & Proxy Routing](#5-service-binding--proxy-routing)
6. [Authentication — Google OAuth2 + JWT (Deep Dive)](#6-authentication--google-oauth2--jwt-deep-dive)
7. [Content Pipeline — Scraper → Storage → Feed](#7-content-pipeline--scraper--storage--feed)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Database Design](#9-database-design)
10. [Docker Compose Deployment Model](#10-docker-compose-deployment-model)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Coding Standards & Low-Level Design Principles](#12-coding-standards--low-level-design-principles)
13. [Component Interaction Map](#13-component-interaction-map)
14. [How Video Streaming Works](#14-how-video-streaming-works)
15. [Concurrency & Multithreading Model](#15-concurrency--multithreading-model)
16. [Environment Variable Management & Security](#16-environment-variable-management--security)
17. [Database Choice Rationale — PostgreSQL vs MongoDB](#17-database-choice-rationale--postgresql-vs-mongodb)
18. [Production Database Access Guide](#18-production-database-access-guide)
19. [Production Operations](#19-production-operations)

---

## 1. System Overview

**RealStream** is a short-form video streaming platform inspired by TikTok/YouTube Shorts. It follows a **polyglot microservices architecture** where each concern is isolated into a dedicated service:

| Concern | Technology |
|---|---|
| Frontend SPA | **Next.js 16** + **React 19** + **TypeScript** |
| Authentication | **Java 21** / Spring Boot 3 + OAuth2 + JWT |
| User Profiles | **Java 21** / Spring Boot 3 |
| Content (Videos) | **Java 21** / Spring Boot 3 + MongoDB |
| Comments | **Java 21** / Spring Boot 3 + PostgreSQL |
| Interactions (Likes) | **Java 21** / Spring Boot 3 + PostgreSQL |
| Video Scraping | **Python 3** / FastAPI + YouTube Data API v3 |
| Reverse Proxy / Gateway | **Nginx** |
| Datastores | **PostgreSQL 15** (relational) + **MongoDB 6** (documents) |
| Containerization | **Docker Compose** |
| Cloud Hosting | **Digital Ocean Droplet** (Ubuntu 24.04 LTS) |
| SSL / TLS | **Let's Encrypt** (auto-renewed via cron + certbot) |
| Domain | **realstream.site** → A record → `164.92.81.126` |
| CI/CD | **GitHub Actions** (`appleboy/ssh-action@v1`) |

---

## 2. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph Internet
        USER[🌐 User Browser]
        GOOGLE[Google OAuth2<br/>accounts.google.com]
        YOUTUBE[YouTube Data API v3]
        GH[GitHub Actions<br/>CI/CD]
    end

    subgraph "Digital Ocean Droplet (164.92.81.126)"
        LE[Let's Encrypt<br/>certbot auto-renewal]

        subgraph "Docker Network (realstream)"
            NGINX[Nginx :80/:443<br/>Reverse Proxy + SSL Termination<br/>Dynamic DNS resolver]
            
            subgraph "Frontend"
                FE[Next.js 16 :3000<br/>React 19 + TailwindCSS v4]
            end

            subgraph "Java Spring Boot Microservices"
                AUTH[auth-service :8081<br/>OAuth2 + JWT]
                USER_SVC[user-service :8082<br/>User Profiles]
                CONTENT[content-service :8083<br/>Videos REST]
                COMMENT[comment-service :8084<br/>Comments]
                INTERACTION[interaction-service :8085<br/>Likes]
            end

            subgraph "Python Service"
                SCRAPER[scraper-service :8000<br/>FastAPI + YouTube Client]
            end

            subgraph "Databases"
                PG[(PostgreSQL 15<br/>auth, users, comments, likes)]
                MONGO[(MongoDB 6<br/>videos/content)]
            end
        end
    end

    USER -->|HTTPS :443| NGINX
    GH -->|SSH deploy| NGINX
    LE -->|certs| NGINX
    NGINX -->|/| FE
    NGINX -->|/api/auth/*| AUTH
    NGINX -->|/api/content/*| CONTENT
    NGINX -->|/api/comments/*| COMMENT
    NGINX -->|/api/interactions/*| INTERACTION
    NGINX -->|/api/users/*| USER_SVC
    NGINX -->|/api/scraper/*| SCRAPER

    AUTH -->|Google OAuth2 flow| GOOGLE
    AUTH --- PG
    USER_SVC --- PG
    COMMENT --- PG
    INTERACTION --- PG
    CONTENT --- MONGO
    SCRAPER -->|YouTube Data API v3| YOUTUBE
    SCRAPER -->|POST /videos| CONTENT
```

---

## 3. Production Infrastructure

### 3.1 Hosting — Digital Ocean Droplet

| Property | Value |
|---|---|
| Provider | **Digital Ocean** |
| Plan | Basic Droplet |
| OS | Ubuntu 24.04.4 LTS |
| IP Address | `164.92.81.126` |
| Hostname | `realstream-prod-01` |
| Domain | `realstream.site` + `www.realstream.site` |
| DNS | A records pointing to `164.92.81.126` |

> **Migration note:** The project was originally hosted locally on a developer machine and exposed to the internet through a **Cloudflare Tunnel**. This was replaced with a standalone Digital Ocean Droplet for reliability, independent uptime, and proper production infrastructure.

### 3.2 SSL / TLS — Let's Encrypt

| Property | Value |
|---|---|
| Certificate Authority | Let's Encrypt |
| Certificate location (host) | `certbot/certs/fullchain.pem`, `certbot/certs/privkey.pem` |
| Certificate location (container) | `/etc/ssl/fullchain.pem`, `/etc/ssl/privkey.pem` |
| Auto-renewal | Cron job (weekly, Monday 3am) via `deployment/renew-certs.sh` |
| Certbot container | Runs in Docker, shared volumes with nginx |

**Certificate flow:**
```
certbot issues/renews cert
    → writes to certbot/conf/live/realstream.site/
    → deployment/renew-certs.sh copies flat files to certbot/certs/
    → nginx reads from /etc/ssl/ (bind-mounted from certbot/certs/)
    → nginx reload picks up new certs
```

> **Why flat cert copies?** Docker bind mounts don't follow symlinks across volume boundaries. Let's Encrypt stores certs as symlinks in `live/` pointing to `archive/`. Copying resolves the symlinks into flat files that Docker can mount reliably.

### 3.3 Domain & DNS

```
realstream.site      → A record → 164.92.81.126
www.realstream.site  → A record → 164.92.81.126
```

Nginx handles both hostnames. HTTP (`:80`) redirects to HTTPS (`:443`). The `/.well-known/acme-challenge/` path is excluded from the redirect for Let's Encrypt domain validation.

### 3.4 Nginx — Reverse Proxy & SSL Termination

Nginx is the **single entry point** for all external traffic. It handles:
- SSL termination (TLS 1.2 / 1.3)
- HTTP → HTTPS redirect
- Path-based routing to backend microservices
- Let's Encrypt ACME challenge serving
- `X-Forwarded-*` header injection for backend services

**Dynamic DNS Resolution (critical for zero-502 deploys):**

Nginx by default resolves Docker hostnames once at startup and caches the IP forever. When containers restart during deploys and get new IPs, nginx tries the stale IPs → `Connection refused` → **502 Bad Gateway**.

The fix uses Docker's internal DNS with forced re-resolution:

```nginx
# In the server block:
resolver 127.0.0.11 valid=10s ipv6=off;   # Docker's embedded DNS
resolver_timeout 5s;

# In each location block:
location /api/auth/ {
    set $upstream_auth http://auth-service:8081;  # Variable forces DNS lookup per request
    rewrite ^/api/auth/?(.*) /$1 break;
    proxy_pass $upstream_auth;
    proxy_set_header X-Forwarded-Prefix /api/auth;  # Tells Spring the original path prefix
}
```

**Why `set $upstream` works:** When `proxy_pass` receives a hardcoded string, nginx resolves it once. When it receives a **variable**, nginx must use the `resolver` directive to resolve on every request. This is a well-known nginx pattern for dynamic upstreams.

### 3.5 Firewall (UFW)

```
Port 80/tcp   — HTTP (redirects to HTTPS)
Port 443/tcp  — HTTPS (main traffic)
Port 22/tcp   — SSH (OpenSSH)
```

All other ports are blocked. Backend services (8081-8085, 8000, 5432, 27017) are **not exposed** externally — they communicate only within the Docker network.

### 3.6 systemd — Auto-Start on Reboot

```ini
# /etc/systemd/system/realstream.service
[Unit]
Description=RealStream Production Stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/RealStream
ExecStart=docker compose -f docker-compose.prod.yml up -d
ExecStop=docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
```

The entire Docker Compose stack auto-starts when the server reboots.

---

## 4. Microservices Inventory

### 4.1 auth-service (`:8081`)

**Language:** Java 21 · **Framework:** Spring Boot 3.x  
**Package root:** `com.realstream.auth`

| Class | Role |
|---|---|
| `SecurityConfig` | Central Spring Security filter chain — wires CORS, CSRF-off, session policy, OAuth2 login, JWT filter |
| `CustomOAuth2UserService` | Extension of `DefaultOAuth2UserService`; upserts users from Google profile on first login |
| `OAuth2AuthenticationSuccessHandler` | After successful Google login, mints a JWT and redirects to frontend `/oauth2/redirect?token=...` |
| `TokenProvider` | Issues and validates HS256 JWTs using JJWT 0.11.5; expiry and secret from `AppProperties` |
| `JwtAuthenticationFilter` | `OncePerRequestFilter` — reads `Authorization: Bearer <token>`, validates, sets `SecurityContextHolder` |
| `UserPrincipal` | `OAuth2User` adapter that bridges Spring Security principal with auth `User` entity |
| `AuthController` | `GET /user/me` — returns `{id, email, name, pictureUrl}` for authenticated user |
| `UserRepository` | `JpaRepository<User, UUID>` — `findByEmail`, `findById` |
| `User` (model) | `id (UUID) · email · fullName · imageUrl · provider (GOOGLE) · role (USER)` |

**Key dependencies (pom.xml):**
- `spring-boot-starter-security`
- `spring-boot-starter-oauth2-client`
- `spring-boot-starter-data-jpa`
- `jjwt-api / jjwt-impl / jjwt-jackson` (v0.11.5)
- `postgresql` (runtime)
- `lombok`

---

### 4.2 user-service (`:8082`)

**Language:** Java 21 · **Package root:** `com.realstream.user`

| Class | Role |
|---|---|
| `UserProfileController` | `GET /me`, `PUT /me`, `GET /{userId}` — identity passed via `X-User-Id` header |
| `UserProfileService` | Business logic: `getOrCreateProfile(UUID)`, `updateProfile(UUID, dto)` |
| `UserProfile` (model) | Extended profile separate from auth `User` — bio, avatar, etc. |
| `UserProfileRepository` | JPA repo keyed on `userId (UUID)` |

> **Design principle:** Auth identity (`User`) is owned by `auth-service`; extended profile (`UserProfile`) is owned by `user-service`. Services share only the `userId` UUID as a contract, never a foreign-key dependency across databases.

---

### 4.3 content-service (`:8083`)

**Language:** Java 21 · **Package root:** `com.realstream.content`  
**Database:** MongoDB (`realstream_content` database)

| Class | Role |
|---|---|
| `VideoController` | `POST /videos` (upsert), `GET /videos` (paginated, filter by hashtag/channel), `GET /videos/{id}` |
| `Video` (model) | `id · videoId (YouTube ID) · title · description · url · hashtags[] · thumbnailUrl · channelTitle · duration · viewCount` |
| `VideoRepository` | `MongoRepository<Video, String>` — custom: `findByHashtagsIn`, `findByChannelTitle`, pageable |

**Pagination Design:** Uses Spring Data's `Pageable` (page/size) returning a Spring `Page<Video>`. Frontend maps this to its own `Page<T>` interface.

---

### 4.4 comment-service (`:8084`)

**Language:** Java 21 · **Package root:** `com.realstream.comment`  
**Database:** PostgreSQL

| Endpoint | Method | Identity | Description |
|---|---|---|---|
| `/` (mapped to `/comments`) | `POST` | `X-User-Id` header | Create comment |
| `/comments` (query `?videoId=`) | `GET` | — | List comments for video (desc by date) |
| `/comments/count` | `GET` | — | Count for a videoId |
| `/comments/{id}` | `DELETE` | `X-User-Id` header | Delete own comment |

**Model:** `id (UUID) · userId (UUID) · videoId (String) · content · createdAt`  
Uses Lombok `@Builder` for clean object construction.

---

### 4.5 interaction-service (`:8085`)

**Language:** Java 21 · **Package root:** `com.realstream.interaction`  
**Database:** PostgreSQL

**Toggle-Like Pattern:**
```java
// Idempotent toggle — no separate like/unlike endpoints
@PostMapping("/likes/{videoId}")
@Transactional
public ResponseEntity<LikeStatus> toggleLike(UUID userId, String videoId) {
    boolean exists = likeRepository.existsByUserIdAndVideoId(userId, videoId);
    if (exists) likeRepository.deleteByUserIdAndVideoId(userId, videoId);
    else        likeRepository.save(Like.builder().userId(userId).videoId(videoId).build());
    return ResponseEntity.ok(LikeStatus.builder()
        .isLiked(!exists)
        .likeCount(likeRepository.countByVideoId(videoId))
        .build());
}
```

**LikeStatus DTO:** `{ isLiked: boolean, likeCount: long }` — returned from both GET and POST.

---

### 4.6 scraper-service (`:8000`)

**Language:** Python 3 · **Framework:** FastAPI  
**Files:** `main.py`, `youtube_client.py`, `requirements.txt`

**`YouTubeClient`** wraps `google-api-python-client`:
- `search_videos(query, limit)` — biases toward Shorts by appending `"shorts"` to query + `videoDuration=short`
- `get_channel_videos(channel_name, limit)` — resolves channel handle → channel ID first, then fetches latest short videos
- `_map_video_data(item, source_query)` — normalizes YouTube API response to internal `Video` format

**Scrape Pipeline:**
```
POST /scrape { hashtag?, channel?, limit }
    ├── YouTubeClient.search_videos() OR get_channel_videos()
    └── For each result → POST http://content-service:8083/videos
            └── Returns { message, count, saved_count, videos[] }
```

**CONTENT_SERVICE_URL env var** resolves Docker hostname `content-service:8083` in prod, `localhost:8083` in dev.

---

## 5. Service Binding & Proxy Routing

### 5.1 Nginx Reverse Proxy (Production — Primary Router)

In production, **nginx is the single entry point** for all traffic. It terminates SSL, strips the `/api/<service>` prefix, and forwards to the correct backend container.

**Routing table:**

| External Path | Rewrite | Backend Target | Notes |
|---|---|---|---|
| `/` | (none) | `frontend:3000` | Next.js app |
| `/api/auth/*` | strip `/api/auth` | `auth-service:8081` | + `X-Forwarded-Prefix: /api/auth` for OAuth |
| `/api/content/*` | strip `/api/content` | `content-service:8083` | |
| `/api/comments/*` | strip `/api/comments` | `comment-service:8084` | |
| `/api/interactions/*` | pass-through | `interaction-service:8085` | Uses `$request_uri` (no rewrite) |
| `/api/users/*` | strip `/api/users` | `user-service:8082` | |
| `/api/scraper/*` | strip `/api/scraper` | `scraper-service:8000` | |

**Auth service special handling:**
The auth service receives `X-Forwarded-Prefix: /api/auth` so that Spring Security (with `forward-headers-strategy: framework`) reconstructs the correct `{baseUrl}` for OAuth2 redirect URIs:
```
X-Forwarded-Proto: https  +  Host: realstream.site  +  X-Forwarded-Prefix: /api/auth
→ {baseUrl} = https://realstream.site/api/auth
→ redirect_uri = https://realstream.site/api/auth/login/oauth2/code/google
```

### 5.2 Next.js Reverse Proxy (Dev + Docker Internal Fallback)

`next.config.ts` rewrites all `/api/*` paths to internal Docker hostnames. This is the **single source of truth** for frontend→backend routing:

```typescript
// next.config.ts
rewrites() {
  return [
    { source: "/api/auth/:path*",         destination: "http://auth-service:8081/auth/:path*" },
    { source: "/api/users/:path*",        destination: "http://user-service:8082/users/:path*" },
    { source: "/api/videos/:path*",       destination: "http://content-service:8083/:path*" },
    { source: "/api/comments/:path*",     destination: "http://comment-service:8084/comments/:path*" },
    { source: "/api/interactions/:path*", destination: "http://interaction-service:8085/interactions/:path*" },
    { source: "/api/scraper/:path*",      destination: "http://scraper-service:8000/:path*" },
  ];
}
```

> **Why this matters:** The frontend only ever calls `/api/*`. Whether running locally or in Docker, Next.js transparently proxies to the correct backend. No CORS issues, no hardcoded backend URLs in client code.

### 5.3 Frontend API Client Binding (`lib/api.ts`)

All HTTP calls go through a single Axios instance:

```typescript
const api = axios.create({ baseURL: "/api" });

// Request interceptor — auto-injects JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
```

**`X-User-Id` Header Pattern:**  
For comment and interaction services, the user ID is extracted client-side by decoding the JWT payload (not a network round-trip):
```typescript
function getUserId(): string {
    const token = localStorage.getItem("token");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub; // JWT subject = user UUID
}
// Then passed as: headers: { "X-User-Id": userId }
```

> This means **auth-service is not involved in every secured request** — the JWT is self-contained. Other services trust the `X-User-Id` header (a common microservice pattern for internal trust boundaries).

### 5.4 CORS Configuration

`SecurityConfig.corsConfigurationSource()` allows:
- `http://localhost:3000` (local dev)
- `http://localhost:80` (Docker local)
- `${app.oauth2.frontend-url}` (env-configured production URL, e.g., `https://realstream.site`)

`allowCredentials: true` is required for session cookies used during the OAuth2 handshake.

---

## 6. Authentication — Google OAuth2 + JWT (Deep Dive)

### Complete OAuth2 Flow (Production)

```mermaid
sequenceDiagram
    participant U as User Browser
    participant NX as Nginx (SSL termination)
    participant AUTH as auth-service :8081
    participant G as Google OAuth2
    participant FE as Next.js Frontend :3000

    U->>NX: GET https://realstream.site/api/auth/oauth2/authorization/google
    NX->>NX: Strip /api/auth prefix, add X-Forwarded-Prefix header
    NX->>AUTH: GET /oauth2/authorization/google
    AUTH->>AUTH: customAuthorizationRequestResolver adds prompt=select_account
    AUTH->>AUTH: Resolve {baseUrl} from X-Forwarded-* headers = https://realstream.site/api/auth
    AUTH->>G: HTTP 302 → Google consent screen<br/>redirect_uri=https://realstream.site/api/auth/login/oauth2/code/google
    G->>U: Google account chooser
    U->>G: Selects account, grants consent
    G->>NX: GET https://realstream.site/api/auth/login/oauth2/code/google?code=...
    NX->>AUTH: GET /login/oauth2/code/google?code=...
    AUTH->>G: Exchange code for tokens + fetch user profile
    AUTH->>AUTH: CustomOAuth2UserService.processOAuth2User()
    AUTH->>AUTH: Upsert User in PostgreSQL (findByEmail → create or update)
    AUTH->>AUTH: OAuth2AuthenticationSuccessHandler.onAuthenticationSuccess()
    AUTH->>AUTH: TokenProvider.createToken() → HS256 JWT (sub=userId)
    AUTH->>U: HTTP 302 → https://realstream.site/oauth2/redirect?token=<JWT>
    U->>NX: GET https://realstream.site/oauth2/redirect?token=<JWT>
    NX->>FE: Proxy to frontend
    FE->>FE: /oauth2/redirect/page.tsx captures ?token from URL
    FE->>FE: localStorage.setItem("token", token)
    FE->>NX: GET /api/auth/user/me (Bearer token)
    NX->>AUTH: GET /user/me
    AUTH->>AUTH: JwtAuthenticationFilter validates JWT → sets SecurityContext
    AUTH->>FE: {id, email, name, pictureUrl}
    FE->>FE: setUser(userData) → UI updates to logged-in state
    FE->>FE: router.push("/")
```

### Session Strategy

`SessionCreationPolicy.ALWAYS` is set in `SecurityConfig`. This keeps an HTTP session alive on the auth service **only during the OAuth2 handshake** (Google requires state param persistence). Once the JWT is issued, all subsequent requests are **stateless** — only the JWT matters.

### JWT Structure

| Field | Value |
|---|---|
| Algorithm | HS256 |
| Library | JJWT 0.11.5 |
| Subject (`sub`) | `userId` (UUID string) |
| Expiry | Configured via `app.auth.tokenExpirationMsec` (AppProperties) |
| Secret | Base64-encoded secret in `app.auth.tokenSecret` (AppProperties) |

### Security Filter Chain Order

```
Request → JwtAuthenticationFilter (OncePerRequestFilter)
              ↓ if valid JWT
         Sets SecurityContextHolder authentication
              ↓
         UsernamePasswordAuthenticationFilter (Spring default, skipped for OAuth2)
              ↓
         Controller endpoint
```

Public endpoints (`/`, `/login**`, `/error**`, `/oauth2/**`) bypass authentication. All others require a valid JWT.

---

## 7. Content Pipeline — Scraper → Storage → Feed

```
User enters topic/channel on Onboarding screen
    ↓
page.tsx: useMutation → scraperService.scrape(topic, channel)
    ↓
POST /api/scraper/scrape → [Next.js proxy] → scraper-service:8000/scrape
    ↓
YouTubeClient:
  - search_videos(query + "shorts", limit=10, videoDuration=short)
  OR
  - get_channel_videos(channel) → resolve channelId → fetch latest shorts
    ↓
For each video found:
  POST http://content-service:8083/videos (upsert by videoId)
    ↓
content-service saves to MongoDB (realstream_content)
    ↓
Mutation onSuccess → queryClient.invalidateQueries(["videos"])
    ↓
useInfiniteQuery re-fetches → GET /api/content/videos?hashtag=...&page=0
    ↓
VideoPlayer renders YouTube iframe embed:
  https://www.youtube.com/embed/{videoId}?autoplay=1&loop=1&mute=0...
```

**Infinite Scroll Implementation:**
```typescript
// page.tsx — scroll event on the feed container
const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    const index = Math.round(scrollTop / clientHeight); // snap-based index
    setActiveIndex(index); // drives which VideoPlayer is "isActive"
    
    // Load next page when within 1.5x viewport height of bottom
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }
};
```

**VideoPlayer lazy loading:** `isActive` prop controls a 300ms timeout before mounting the YouTube iframe, allowing CSS scroll-snap to settle visually before loading the embed.

---

## 8. Frontend Architecture

### 8.1 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | App Router, SSR/SSG, API rewrites, image optimization |
| **React** | 19.2.3 | Latest concurrent features, RSC support |
| **TypeScript** | 5.x | Type safety across all components and API interfaces |
| **TailwindCSS** | 4.x | Utility-first CSS with `@theme` custom tokens (new v4 API) |
| **TanStack Query** | 5.x | Server state management, infinite queries, mutations, cache invalidation |
| **Axios** | 1.13.5 | HTTP client with request interceptors for auth headers |
| **Framer Motion** | 12.x | Physics-based animations, spring transitions |
| **Lucide React** | 0.563.0 | Icon system |
| **Radix UI** | Slot primitive | Accessible, unstyled UI primitives |
| **clsx / tailwind-merge** | Latest | Conditional class composition |

### 8.2 Application Structure

```
frontend/src/
├── app/
│   ├── layout.tsx          ← Root layout: Inter font, RetroGrid bg, Providers wrapper
│   ├── page.tsx            ← Main app shell — all state logic lives here
│   ├── globals.css         ← Design system: CSS custom properties, TailwindCSS v4 @theme
│   └── oauth2/
│       └── redirect/
│           └── page.tsx    ← OAuth2 callback handler — captures ?token, stores to localStorage
├── components/
│   ├── Header.tsx          ← Top nav: logo, topic label, auth buttons
│   ├── Onboarding.tsx      ← Search/topic entry screen (initial state)
│   ├── VideoPlayer.tsx     ← YouTube iframe with poster fallback + lazy mount
│   ├── ActionBar.tsx       ← Like/Comment/Share vertical button rail
│   ├── VideoMetadata.tsx   ← Channel name, caption, hashtags overlay
│   ├── CommentDrawer.tsx   ← Slide-up comment panel
│   ├── LoginModal.tsx      ← Login prompt modal
│   ├── UserProfile.tsx     ← Profile slide panel
│   ├── Providers.tsx       ← QueryClientProvider + AuthProvider tree
│   └── ui/
│       └── retro-grid.tsx  ← Animated SVG grid background
├── context/
│   └── AuthContext.tsx     ← Global auth state: user, login(), logout(), checkUser()
└── lib/
    ├── api.ts              ← All service clients: videoService, interactionService, commentService, scraperService, userService
    └── utils.ts            ← Utility helpers (clsx/twMerge)
```

### 8.3 State Management Architecture

**Provider tree (set up in `Providers.tsx`):**
```
<QueryClientProvider>          ← TanStack Query cache (staleTime: 60s)
  <AuthProvider>               ← Global auth state via React Context
    {children}                 ← Page components
  </AuthProvider>
</QueryClientProvider>
```

**State classification:**

| State Type | How Managed |
|---|---|
| Server / async (videos, comments, likes) | TanStack Query (`useInfiniteQuery`, `useMutation`) |
| Global auth | React Context (`AuthContext`) |
| Session persistence (onboarded, topic, channel) | `sessionStorage` (survives page refresh within session) |
| JWT token | `localStorage` |
| UI state (modals, active index) | Local `useState` |

### 8.4 Design System

**Tailwind v4 `@theme` (in `globals.css`):**
```css
@theme {
  --color-primary: #257bf4;           /* Brand blue */
  --color-neon-cyan: #257bf4;         /* Alias */
  --color-neon-magenta: #FF0050;      /* Accent red (TikTok-inspired) */
  --color-surface: #101722;           /* Dark card background */
  --color-background-dark: #101722;   /* Page background */
  --font-inter: var(--font-inter);    /* Google Inter font */
}
```

**Custom CSS components:**
- `.glass-panel` — `background: rgba(34, 50, 73, 0.4)` + `backdrop-filter: blur(12px)` + inner highlight border
- `.rainbow-glow` — conic gradient blur for accent effects
- `.no-scrollbar` — hides scroll chrome on the video feed
- `.animate-grid` — 15s CSS translate animation for the retro grid background
- `RetroGrid` component — animated SVG line grid creating a cyberpunk depth effect

**Typography:** `Inter` loaded via `next/font/google` (subsetting Latin, display: swap). `Material Symbols Outlined` loaded via `<link>` for icon variants.

---

## 9. Database Design

### PostgreSQL — Relational Schema (auth, user, comment, interaction services)

```
auth DB schema (auth-service):
┌──────────────────────────────────────┐
│ users                                │
│  id          UUID  PK                │
│  email       TEXT  UNIQUE NOT NULL   │
│  full_name   TEXT                    │
│  image_url   TEXT                    │
│  provider    ENUM (GOOGLE)           │
│  provider_id TEXT                    │
│  role        ENUM (USER, ADMIN)      │
└──────────────────────────────────────┘

user-service schema:
┌──────────────────────────────────────┐
│ user_profiles                        │
│  id          UUID  PK (= auth userId)│
│  bio         TEXT                    │
│  avatar_url  TEXT                    │
│  [other profile fields]              │
└──────────────────────────────────────┘

comment-service schema:
┌──────────────────────────────────────┐
│ comments                             │
│  id          UUID  PK                │
│  user_id     UUID  (FK by convention)│
│  video_id    TEXT  (MongoDB _id)     │
│  content     TEXT                    │
│  created_at  TIMESTAMP               │
└──────────────────────────────────────┘

interaction-service schema:
┌──────────────────────────────────────┐
│ likes                                │
│  id          UUID  PK                │
│  user_id     UUID                    │
│  video_id    TEXT                    │
│  UNIQUE(user_id, video_id)           │
└──────────────────────────────────────┘
```

### MongoDB — Document Schema (content-service)

```json
// realstream_content.videos
{
  "_id": "<ObjectId>",
  "videoId": "dQw4w9WgXcY",         // YouTube video ID (unique)
  "title": "This video title",
  "description": "...",
  "url": "https://youtube.com/shorts/...",
  "hashtags": ["#trending", "#music"], // Array field → indexed for findByHashtagsIn
  "thumbnailUrl": "https://i.ytimg.com/...",
  "channelTitle": "MrBeast",
  "duration": 60,
  "viewCount": 0
}
```

**Why MongoDB for content?** Videos are schema-flexible (hashtags are a variable-length array), and `findByHashtagsIn` with pagination is a natural MongoDB use case. PostgreSQL's array support is feasible but MongoDB's document model is a better fit.

---

## 10. Docker Compose Deployment Model

**File:** `docker-compose.prod.yml` (11 services, 2 named volumes)

```mermaid
graph TD
    subgraph "Digital Ocean Droplet"
        NGINX["nginx :80/:443<br/>SSL termination + dynamic DNS"] --> FE[frontend :3000]
        NGINX --> AUTH[auth-service :8081]
        NGINX --> USER_SVC[user-service :8082]
        NGINX --> CONTENT[content-service :8083]
        NGINX --> COMMENT[comment-service :8084]
        NGINX --> INTERACTION[interaction-service :8085]
        NGINX --> SCRAPER[scraper-service :8000]
        AUTH --> PG[(postgres :5432)]
        USER_SVC --> PG
        COMMENT --> PG
        INTERACTION --> PG
        CONTENT --> MONGO[(mongo :27017)]
        SCRAPER -->|depends_on: healthy| CONTENT
        CERTBOT[certbot] -.->|writes certs| NGINX
    end
```

**Health checks (critical for reliability):**

| Service | Health Check | Purpose |
|---|---|---|
| `postgres` | `pg_isready -U $$POSTGRES_USER` | Interval 10s, retries 5 |
| `mongo` | `mongosh --eval "db.adminCommand('ping')"` | Interval 10s, retries 5 |
| `content-service` | TCP port 8083 reachable | `start_period: 30s` (Spring Boot startup) |

**Service startup order (depends_on with health checks):**
1. `postgres` (healthcheck: `pg_isready`) + `mongo` (healthcheck: `mongosh ping`) — start in parallel
2. `auth-service`, `user-service`, `comment-service`, `interaction-service` → after `postgres: service_healthy`
3. `content-service` → after `mongo: service_healthy`
4. `scraper-service` → after `content-service: service_healthy` (prevents Connection Refused on first scrape)
5. `frontend` → after `auth-service: service_started`, `content-service: service_started`
6. `nginx` → after `frontend: service_started`, `auth-service: service_started`
7. `certbot` → after `nginx: service_started` (needs ACME challenge path)

**Why `scraper-service` depends on `content-service: service_healthy`:**
The scraper immediately calls `content-service /api/videos` on startup. Without a health check gate, the scraper starts before Spring Boot finishes initializing → Connection Refused → empty feed → "Error loading feed" on the frontend. The `start_period: 30s` gives content-service time to compile and start its Tomcat listener before Docker marks it healthy.

**Environment variables surfaced via `.env`:**

| Variable | Consumed By |
|---|---|
| `POSTGRES_USER / PASSWORD` | All Spring Boot JPA services |
| `GOOGLE_CLIENT_ID / SECRET` | auth-service |
| `FRONTEND_URL` | auth-service (`APP_OAUTH2_FRONTEND_URL`) |
| `YOUTUBE_API_KEY` | scraper-service |

**Volumes:**
- `postgres-data` — persistent PostgreSQL data (users, comments, likes)
- `mongo-data` — persistent MongoDB data (video content)
- Bind mount: `./nginx/nginx.conf` → `/etc/nginx/nginx.conf` (⚠️ see CI/CD section on inode issues)
- Bind mount: `./certbot/certs/` → `/etc/ssl/` (flat cert copies, no symlinks)

**Build contexts:** Each Java service Dockerfile is at `./backend/<service>/Dockerfile` with context `./backend` (parent dir) so Maven multi-module build works. Scraper uses its own directory context.

---

## 11. CI/CD Pipeline

### 11.1 Overview

Continuous deployment via **GitHub Actions** — every push to `main` triggers an automated deploy to the Digital Ocean Droplet. No manual SSH required for routine deploys.

**File:** `.github/workflows/deploy.yml`

### 11.2 Workflow Architecture

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH as GitHub (main branch)
    participant GA as GitHub Actions Runner
    participant DO as Digital Ocean Droplet

    DEV->>GH: git push origin main
    GH->>GA: Trigger deploy workflow
    GA->>DO: SSH (appleboy/ssh-action@v1)
    DO->>DO: git pull origin main
    DO->>DO: docker compose up -d --build (backends)
    DO->>DO: Wait for content-service healthy (loop 30×2s)
    DO->>DO: docker compose up -d --force-recreate nginx
    DO->>DO: curl localhost → verify HTTP response
    DO-->>GA: Exit code + deploy timestamp
```

### 11.3 Deploy Strategy — Why Backends First, Nginx Last

The deploy uses a **two-phase strategy** to avoid downtime:

**Phase 1 — Rebuild backends:**
```bash
docker compose -f docker-compose.prod.yml up -d --build \
  postgres mongo \
  auth-service user-service content-service comment-service interaction-service \
  scraper-service frontend
```
This rebuilds all application services with updated code. The `--build` flag forces Docker to rebuild images from updated source. Nginx is excluded because it doesn't need rebuilding — it uses the stock `nginx:alpine` image.

**Phase 2 — Wait for health, then force-recreate nginx:**
```bash
# Wait for content-service to be healthy (Spring Boot takes ~30s)
for i in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml ps content-service | grep -q healthy; then
    break
  fi
  sleep 2
done

# Force-recreate nginx to pick up config changes
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

### 11.4 The Bind Mount Inode Problem

**Why `--force-recreate` instead of `nginx -s reload`:**

When `git pull` updates `nginx/nginx.conf`, the file system creates a **new inode** (file identity). But the running nginx container still has a bind mount pointing to the **old inode**. Running `docker exec nginx nginx -s reload` reloads from the old file — the config update is invisible.

`--force-recreate` destroys and recreates the container, establishing a fresh bind mount that points to the new inode.

### 11.5 GitHub Secrets

| Secret | Value | Purpose |
|---|---|---|
| `SSH_HOST` | `164.92.81.126` | Droplet IP |
| `SSH_USER` | `root` | SSH user |
| `SSH_PRIVATE_KEY` | Deploy key (no passphrase) | Authentication |

### 11.6 Configuration

```yaml
script_stop: true      # Abort on first error (set -e behavior)
command_timeout: 10m   # Spring Boot builds can take 3-5 minutes
```

**Verification step:** After deploy, the workflow curls `http://localhost` from inside the droplet to confirm nginx is serving traffic and logs the HTTP status code.

---

## 12. Coding Standards & Low-Level Design Principles

### 12.1 Java Services — Standards Applied

**Lombok for boilerplate elimination:**
```java
@RequiredArgsConstructor   // Constructor injection (no @Autowired field injection)
@Slf4j                     // Auto-generates log field
@Builder                   // Builder pattern for model construction
```

**Dependency Injection via Constructor (not field):**
All services use `@RequiredArgsConstructor` + `final` fields. This is the Spring Boot best practice (immutability, testability).

**Repository-only access to data:**
Controllers never directly access data — they go through `Service` → `Repository`. (Some simple controllers go directly to Repository for CRUD-only cases, acceptable for thin services.)

**`@Transactional` on toggle operations:**
`InteractionController.toggleLike()` is annotated `@Transactional` to ensure the `existsByUserIdAndVideoId` check and the subsequent `save`/`delete` are atomic.

**Spring Data JPA Patterns:**
- All repos extend `JpaRepository<Entity, ID>` (PostgreSQL services) or `MongoRepository<Entity, ID>` (content-service)
- Custom queries derived from method names: `findByEmail`, `findByVideoIdOrderByCreatedAtDesc`, `countByVideoId`, `existsByUserIdAndVideoId`, `deleteByUserIdAndVideoId`

**UUID as primary key:**
All entities use `UUID` for primary keys — avoids integer sequence contention, globally unique across services, safe for distributed architecture.

**`X-User-Id` header trust model:**
Services behind the internal Docker network trust the `X-User-Id` header passed from the frontend (decoded from JWT client-side). This is secure because:
1. Services are not exposed outside Docker network
2. The header is set by frontend code that first validated the JWT
3. Nginx/auth-service is the SSL termination boundary

**AppProperties (`@ConfigurationProperties`):**
JWT secret and expiry are injected via `AppProperties` class (type-safe config binding), not raw `@Value` in business logic.

### 12.2 Python Service — Standards Applied

- **FastAPI** with Pydantic `BaseModel` for request validation (`ScrapeRequest`)
- **Environment isolation** with `python-dotenv` (`.env` file)
- **Class-based API client** (`YouTubeClient`) — `search_videos`, `get_channel_videos`, `_map_video_data` — clear separation of API interaction from business logic
- **Graceful failure:** Each video save is wrapped in try/except — one failure doesn't abort the entire scrape
- **`CONTENT_SERVICE_URL`** env var for service discovery (default: Docker hostname)

### 12.3 Frontend — Standards Applied

**Type safety everywhere:**
- `Video`, `Page<T>`, `LikeStatus`, `Comment` interfaces defined in `lib/api.ts`
- `AuthContextType` interface for context contract
- All component props are typed

**Server state vs. client state separation:**
- TanStack Query owns all async/server state
- React Context limits to auth state only
- `sessionStorage` for lightweight session persistence (not Redux/Zustand — YAGNI principle)

**`useInfiniteQuery` instead of manual pagination:**
Cleanly handles page accumulation, loading states, and "hasNextPage" detection from Spring's `Page.last` boolean.

**Axios interceptors for cross-cutting concerns:**
Auth headers are applied once at the Axios level — components never touch auth headers directly.

**No hardcoded backend URLs in components:**
All API calls go through `lib/api.ts` service objects. Components call `videoService.getVideos()`, not raw `axios.get(...)`. This is the **Service Layer pattern** applied to frontend.

**Tailwind v4 design tokens:**
Custom color, font, and animation tokens in `@theme {}` — no magic strings in components, always `text-primary`, `bg-surface`, `text-neon-cyan`.

---

## 13. Component Interaction Map

### Full Request Lifecycle: User Likes a Video

```
1. User clicks ❤️ on ActionBar

2. ActionBar.onLike() → handleInteractionAttempt() in page.tsx
   └── if !user → setIsLoginModalOpen(true) → STOP

3. if user authenticated:
   interactionService.toggleLike(videoId)
     └── api.post("/interactions/likes/{videoId}", {}, { headers: { "X-User-Id": userId } })
         └── axios interceptor adds: Authorization: Bearer <JWT>
         └── Next.js proxy: /api/interactions/* → http://interaction-service:8085/interactions/*

4. interaction-service:8085:
   JwtAuthenticationFilter: validates JWT from Authorization header
   InteractionController.toggleLike():
     @Transactional
     existsByUserIdAndVideoId() → false (first like)
     likeRepository.save(Like{userId, videoId})
     countByVideoId() → 1
     return LikeStatus{isLiked: true, likeCount: 1}

5. Frontend receives LikeStatus → ActionBar updates UI state ✓
```

### Full Request Lifecycle: OAuth2 Login

```
1. LoginModal → AuthContext.login()
   window.location.href = "/api/auth/oauth2/authorization/google"

2. Next.js proxy → auth-service:8081/auth/oauth2/authorization/google
   → SecurityConfig: oauth2Login configured, customAuthorizationRequestResolver adds prompt=select_account
   → redirect to Google

3. Google → user consents → callback to auth-service:8081/login/oauth2/code/google

4. auth-service:
   CustomOAuth2UserService.loadUser():
     fetchs Google user profile
     findByEmail() → not found → registerNewUser() → save to PostgreSQL
     return UserPrincipal

   OAuth2AuthenticationSuccessHandler.onAuthenticationSuccess():
     TokenProvider.createToken(authentication) → JWT
     redirect → {frontendUrl}/oauth2/redirect?token=<JWT>

5. Browser lands on /oauth2/redirect:
   page.tsx reads searchParams.get("token")
   localStorage.setItem("token", token)
   AuthContext.checkUser() → GET /api/auth/user/me
   
6. auth-service returns {id, email, name, pictureUrl}
   setUser() → React re-render → user is logged in ✓
   router.push("/")
```

---

*Generated via deep code analysis of RealStream codebase — February 2026*

---

## 14. How Video Streaming Works

> **Key insight: RealStream does NOT stream video itself.** It delegates 100% of video delivery to YouTube's global CDN infrastructure.

### What the app actually stores

MongoDB holds only **metadata** — `videoId`, `title`, `thumbnailUrl`, `channelTitle`, `hashtags`. Not a single video byte is stored or served by RealStream.

### The streaming model

```
User scrolls to a video
    ↓
VideoPlayer.tsx mounts a YouTube iframe:
  src="https://www.youtube.com/embed/{videoId}
       ?autoplay=1&loop=1&mute=0
       &controls=0       ← hides YouTube chrome (TikTok feel)
       &playsinline=1    ← plays inline on mobile (no forced fullscreen)
       &rel=0            ← no "related videos" recommendations after
       &modestbranding=1 ← minimal YouTube logo
       &playlist={id}    ← required for loop=1 to actually loop"
    ↓
YouTube's CDN delivers the video stream directly to the user's browser
RealStream's servers are NOT in the video data path at all
```

### Lazy loading — how only 1 video plays at a time

```typescript
// VideoPlayer.tsx
useEffect(() => {
    if (isActive) {
        // Wait 300ms for CSS scroll-snap to settle BEFORE loading iframe
        // Prevents loading a video you're already scrolling past
        const timer = setTimeout(() => setShowEmbed(true), 300);
        return () => clearTimeout(timer);
    } else {
        setShowEmbed(false);  // DESTROY iframe when scrolled away → frees memory + bandwidth
    }
}, [isActive]);
```

- `isActive` is driven by `activeIndex` state in `page.tsx`, which is updated on every scroll event
- At any moment there is at most **1 active iframe** in the DOM
- Scrolling away from a video **immediately tears down the player** — no background autoplay

### Before the iframe loads — poster image

While the iframe isn't mounted yet, the component shows the `thumbnailUrl` (a static image from YouTube's CDN) with a play button overlay. This gives instant visual feedback with zero load time.

### Why this approach is production-quality

| Concern | How it's handled |
|---|---|
| Bandwidth cost | Zero — YouTube CDN pays for all video delivery |
| Latency | YouTube has edge nodes everywhere; better than any custom solution |
| Legal/licensing | Videos remain on YouTube; no copyright issues from hosting |
| Scalability | Scales to millions of users without touching RealStream's servers |
| DRM/ads | YouTube handles these automatically inside the iframe |

---

## 15. Concurrency & Multithreading Model

> We have **not written explicit threading code** anywhere in the codebase. Concurrency is fully managed by the frameworks chosen.

### Per-layer breakdown

| Layer | Concurrency mechanism | Detail |
|---|---|---|
| **Spring Boot (all Java services)** | Tomcat embedded thread pool | Each HTTP request is dispatched to one of 200 default worker threads. `@Transactional` acquires row-level DB locks automatically. Zero manual thread management needed. |
| **`@Transactional toggleLike()`** | Database-level locking | The check-then-insert/delete is wrapped in one transaction — RDBMS ensures atomic execution across concurrent requests |
| **FastAPI (Python scraper)** | Uvicorn ASGI async I/O | Uvicorn uses an event loop — concurrent scrape requests don't block each other. FastAPI `async def` endpoints are non-blocking. |
| **Next.js (frontend server)** | Node.js event loop | Next.js API rewrites and SSR run on Node's async event loop — no blocking per user |
| **React 19 (browser)** | Concurrent rendering | React 19's concurrent mode can interrupt, pause, and resume renders. `useTransition` and `Suspense` boundaries handle async state without freezing the UI |
| **TanStack Query** | Background refetching | While you watch a video, `useInfiniteQuery` prefetches the next page in the background. Cache invalidation after mutations is handled on a separate async tick |

### The one place atomicity was explicitly enforced

```java
@PostMapping("/likes/{videoId}")
@Transactional   // ← Marks a DB transaction boundary
public ResponseEntity<LikeStatus> toggleLike(UUID userId, String videoId) {
    // These two operations are ATOMIC — no race condition possible
    boolean exists = likeRepository.existsByUserIdAndVideoId(userId, videoId);
    if (exists) {
        likeRepository.deleteByUserIdAndVideoId(userId, videoId);
    } else {
        likeRepository.save(Like.builder().userId(userId).videoId(videoId).build());
    }
    // ...
}
```

Without `@Transactional`, two simultaneous like-clicks from the same user could both pass the `exists` check and insert two rows. The `@Transactional` annotation + the DB-level `UNIQUE(user_id, video_id)` constraint are a two-layer defence.

---

## 16. Environment Variable Management & Security

### The three-layer system

```
.env                    ← Real secrets (NEVER committed to Git)
.env.example            ← Template with placeholders (committed to Git)
docker-compose.prod.yml ← Bridge: reads .env, injects into containers
```

### Layer 1: `.env` — the secret vault

```dotenv
# Database Credentials
POSTGRES_USER=user
POSTGRES_PASSWORD=password

# Google OAuth (Required for Login)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# YouTube API (Required for Scraper)
YOUTUBE_API_KEY=AIzaSy...

# Deployment
FRONTEND_URL=https://realstream.site
```

**Protected by `.gitignore`:**
```gitignore
.env
.env.*   ← blocks .env.local, .env.production, etc. too
```

### Layer 2: `.env.example` — the onboarding guide

Safe to commit. Documents what variables are needed without exposing values:
```dotenv
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
YOUTUBE_API_KEY=your_youtube_api_key_here
```

New developers: copy → rename to `.env` → fill in real values.

### Layer 3: Docker Compose injection

```yaml
# docker-compose.prod.yml
auth-service:
  environment:
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}       # ← reads from .env at runtime
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    APP_OAUTH2_FRONTEND_URL: ${FRONTEND_URL}

scraper-service:
  environment:
    YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
```

Docker Compose reads `.env` from the same directory at `docker-compose up` time and substitutes the `${VAR}` references. The secrets live only in container environment memory — never written to disk inside the container.

### How each service reads env vars

**Java Spring Boot (auth-service):**
```yaml
# application.yml / application.properties (auto-resolved by Spring)
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
```
Spring Boot reads directly from the process environment. `AppProperties` class provides type-safe access via `@ConfigurationProperties`.

**Python FastAPI (scraper-service):**
```python
from dotenv import load_dotenv
load_dotenv()                              # reads .env in dev
API_KEY = os.getenv("YOUTUBE_API_KEY")    # reads env var in prod (Docker)
```

**Next.js (frontend):**
```
NEXT_PUBLIC_API_URL=/api   ← not secret (just "/api"), safe to expose
```

### Security guarantee chain

```
.env ─(gitignored)─► never reaches GitHub
  │
  └─► docker-compose reads at startup time
        └─► injected into container process environment
              └─► Spring Boot / Python reads os.environ
                    └─► never logged, never returned in API response body
```

> ⚠️ **Important:** Never use `NEXT_PUBLIC_` prefix for secrets in Next.js. Variables with that prefix are **baked into the client-side JavaScript bundle** and visible to anyone who opens browser DevTools. Only non-sensitive config (like `/api`) should use `NEXT_PUBLIC_`.

---

## 17. Database Choice Rationale — PostgreSQL vs MongoDB

### Why PostgreSQL for: auth, user, comment, interaction services

| Reason | Concrete example in RealStream |
|---|---|
| **Fixed, stable schema** | `User` always has `id, email, fullName, imageUrl, provider, role`. No variable fields. Relational table is the natural fit. |
| **ACID transactions** | `toggleLike()` must check-then-insert atomically. PostgreSQL row-level locking guarantees this. MongoDB multi-doc transactions are possible but heavier. |
| **Unique constraints** | `UNIQUE(user_id, video_id)` on likes — one like per user per video. A single SQL constraint enforces this at the DB level, impossible to violate. |
| **Relational aggregation** | `COUNT(*)`, `EXISTS()`, `ORDER BY created_at DESC` — all trivial SQL, fast with standard indexes. |
| **Referential integrity** | `users.id` is referenced by `comments.user_id` and `likes.user_id` across services (by convention, not FK — but the semantics are relational). |

### Why MongoDB for: content-service (videos)

| Reason | Concrete example in RealStream |
|---|---|
| **Variable-length arrays as first-class fields** | `hashtags: ["#trending", "#music", "#shorts"]` is a native MongoDB array. `findByHashtagsIn(["#trending"])` becomes a single `$in` index scan. In PostgreSQL you'd need a `video_hashtags` join table. |
| **Schema flexibility** | YouTube API can add new metadata fields at any time. MongoDB documents absorb new fields without a migration. |
| **Upsert-heavy write pattern** | Scraper pushes videos in bulk — `findByVideoId → update or insert`. This is a natural MongoDB upsert (`findOneAndReplace`). |
| **No joins needed** | The feed query is just "give me $N videos matching this hashtag, paginated." A single MongoDB collection scan with a pageable is all that's needed. |
| **Horizontal scalability potential** | Video content will grow the largest. MongoDB's sharding model lets the content store scale independently from user/interaction data. |

### The core matching principle

```
Data is relational, structured, transactional?  →  PostgreSQL
Data is document-shaped, array-heavy, flexible?  →  MongoDB
```

Putting videos in PostgreSQL would require a `video_hashtags` join table for every feed query. Putting likes in MongoDB would lose the `@Transactional` ACID guarantee needed for toggle atomicity. Each database does exactly what it was designed for.

---

## 18. Production Database Access Guide

### Accessing the production server

The production databases run inside Docker containers on the Digital Ocean Droplet. You must first SSH into the server:

```bash
# SSH into the production server
ssh -o IdentitiesOnly=yes -i SSh-KEY/deploy-key root@164.92.81.126
cd /root/RealStream
```

### PostgreSQL (users, comments, likes, interactions)

All login/comment/like data is stored in the Docker PostgreSQL container, persisted via the `postgres-data` named volume.

```bash
# Run queries directly against the running container
docker exec realstream-postgres-1 psql -U user -d realstream \
  -c "SELECT id, email, full_name, provider, role FROM users;"
```

### MongoDB (video content)

```bash
# Access the MongoDB shell
docker exec -it realstream-mongo-1 mongosh realstream

# Example queries inside mongosh:
db.videos.countDocuments()
db.videos.find().sort({publishedAt: -1}).limit(5)
```

### Useful production queries

```bash
# All registered users
docker exec realstream-postgres-1 psql -U user -d realstream \
  -c "SELECT id, email, full_name, provider, role FROM users ORDER BY id;"

# Total user count
docker exec realstream-postgres-1 psql -U user -d realstream \
  -c "SELECT COUNT(*) as total_users FROM users;"

# All likes (videoId + who liked it)
docker exec realstream-postgres-1 psql -U user -d realstream \
  -c "SELECT * FROM likes ORDER BY id;"

# All comments
docker exec realstream-postgres-1 psql -U user -d realstream \
  -c "SELECT * FROM comments ORDER BY created_at DESC;"

# Likes per video (most liked)
docker exec realstream-postgres-1 psql -U user -d realstream \
  -c "SELECT video_id, COUNT(*) as like_count FROM likes GROUP BY video_id ORDER BY like_count DESC;"
```

### Daily database backups

A cron job runs daily at 2:00 AM UTC, dumping PostgreSQL to `/root/backups/`:

```bash
# Check existing backups
ls -la /root/backups/

# Manual backup
docker exec realstream-postgres-1 pg_dump -U user -d realstream > /root/backups/realstream_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat /root/backups/realstream_YYYYMMDD.sql | docker exec -i realstream-postgres-1 psql -U user -d realstream
```

### Why some login attempts don't create users

Google OAuth in **Testing mode** (Google Cloud Console → OAuth consent screen → not Published) only allows accounts **manually added as Test Users**. Anyone else sees "This app isn't verified" and cannot proceed past Google's screen — their data never reaches `auth-service`, so no user row is created.

**Fix:** Add all tester emails at:  
Google Cloud Console → APIs & Services → OAuth Consent Screen → **Test users → Add users**

---

## 19. Production Operations

### 19.1 SSL Certificate Renewal

Let's Encrypt certificates expire every 90 days. A cron job handles automated renewal:

```bash
# Cron (runs every Monday at 3:00 AM UTC)
0 3 * * 1 /root/RealStream/deployment/renew-certs.sh >> /var/log/cert-renewal.log 2>&1
```

**Renewal flow:**
1. Certbot runs with `--webroot` against the `certbot/www/` directory
2. nginx serves `/.well-known/acme-challenge/` from this directory (configured in nginx.conf)
3. After renewal, certs are copied flat (no symlinks) to `certbot/certs/`
4. nginx is reloaded to pick up the new certs

**Why flat copies:** Docker bind mounts don't follow symlinks that point outside the mounted tree. Let's Encrypt stores certs as symlinks in `/etc/letsencrypt/live/` → `/etc/letsencrypt/archive/`. Copying the actual files avoids this issue.

### 19.2 Database Backups

```bash
# Cron (runs daily at 2:00 AM UTC)
0 2 * * * docker exec realstream-postgres-1 pg_dump -U user -d realstream > /root/backups/realstream_$(date +\%Y\%m\%d).sql 2>> /var/log/backup.log
```

Backups are stored at `/root/backups/` on the droplet. Old backups should be rotated periodically.

### 19.3 Health Monitoring

```bash
# Cron (runs every 5 minutes)
*/5 * * * * /root/RealStream/deployment/health-check.sh >> /var/log/health-check.log 2>&1
```

The health check script curls critical endpoints and can send notifications on failure.

### 19.4 Log Management

```bash
# View logs for a specific service
docker compose -f docker-compose.prod.yml logs -f --tail=100 auth-service

# View all service logs
docker compose -f docker-compose.prod.yml logs -f --tail=50

# Docker log rotation (configured via /etc/docker/daemon.json)
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 19.5 Common Operations

```bash
# SSH into the production server
ssh -o IdentitiesOnly=yes -i SSh-KEY/deploy-key root@164.92.81.126

# Check service status
docker compose -f docker-compose.prod.yml ps

# Restart a specific service
docker compose -f docker-compose.prod.yml restart auth-service

# Full stack restart
docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d

# Check disk usage
df -h && docker system df

# Clean up unused Docker resources
docker system prune -f
```

### 19.6 Troubleshooting Checklist

| Symptom | Likely Cause | Fix |
|---|---|---|
| 502 Bad Gateway | nginx cached stale container IP | `docker compose up -d --force-recreate nginx` |
| "Error loading feed" | scraper started before content-service | Restart scraper: `docker compose restart scraper-service` |
| OAuth returns 502 | auth-service still starting (~48s) | Wait for startup, check `docker compose logs auth-service` |
| SSL cert expired | Renewal cron failed | Run `deployment/renew-certs.sh` manually, check logs |
| Disk full | Docker images/logs | `docker system prune -af && docker volume prune -f` |

---

## Appendix: Port Reference

| Service | Internal Port | Docker Hostname |
|---|---|---|
| nginx | 80, 443 | nginx |
| frontend (Next.js) | 3000 | frontend |
| auth-service | 8081 | auth-service |
| user-service | 8082 | user-service |
| content-service | 8083 | content-service |
| comment-service | 8084 | comment-service |
| interaction-service | 8085 | interaction-service |
| scraper-service | 8000 | scraper-service |
| PostgreSQL | 5432 | postgres |
| MongoDB | 27017 | mongo |

---

*Last updated: March 2026 — migrated from local + Cloudflare Tunnel to standalone Digital Ocean Droplet with Let's Encrypt SSL, GitHub Actions CI/CD, nginx dynamic DNS resolution, health-check-gated startup ordering, and production operations automation.*

