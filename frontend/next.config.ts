import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://auth-service:8081/auth/:path*",
      },
      {
        source: "/api/users/:path*",
        destination: "http://user-service:8082/users/:path*",
      },
      {
        source: "/api/videos/:path*",
        destination: "http://content-service:8083/:path*",
      },
      {
        source: "/api/comments/:path*",
        destination: "http://comment-service:8084/comments/:path*",
      },
      {
        source: "/api/interactions/:path*",
        destination: "http://interaction-service:8085/interactions/:path*",
      },
      {
        source: "/api/scraper/:path*",
        destination: "http://scraper-service:8000/:path*",
      },
    ];
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  } as any,
};

export default nextConfig;
