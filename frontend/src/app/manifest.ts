import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "RealStream — Short-Form Video Discovery",
        short_name: "RealStream",
        description:
            "Discover and binge trending short-form videos on any topic. Swipe through a personalized feed powered by YouTube.",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a0f",
        theme_color: "#00e5ff",
        icons: [
            {
                src: "/favicon.ico",
                sizes: "any",
                type: "image/x-icon",
            },
        ],
    };
}
