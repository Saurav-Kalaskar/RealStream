import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import RetroGrid from "@/components/ui/retro-grid";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://realstream.site"),
  title: {
    default: "RealStream — Discover & Binge Short-Form Videos",
    template: "%s | RealStream",
  },
  description:
    "Discover and binge trending short-form videos on any topic. Swipe through a personalized video feed powered by YouTube — the TikTok-style experience for every interest.",
  keywords: [
    "short-form video",
    "video discovery",
    "trending videos",
    "video feed",
    "swipe videos",
    "RealStream",
    "YouTube shorts",
    "video streaming",
    "personalized feed",
    "binge watch",
  ],
  authors: [{ name: "RealStream" }],
  creator: "RealStream",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://realstream.site",
    siteName: "RealStream",
    title: "RealStream — Discover & Binge Short-Form Videos",
    description:
      "Swipe through a personalized feed of trending short-form videos on any topic. Powered by YouTube.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RealStream — Short-Form Video Discovery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RealStream — Discover & Binge Short-Form Videos",
    description:
      "Swipe through a personalized feed of trending short-form videos on any topic.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://realstream.site",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "RealStream",
  url: "https://realstream.site",
  description:
    "Discover and binge trending short-form videos on any topic with a TikTok-style swipe experience.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://realstream.site/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} antialiased bg-background-dark text-white font-display overflow-x-hidden`}>
        {/* Background Structural Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <RetroGrid />
          {/* Floating 3D shapes for depth - Keeping these as they add nice depth over the grid */}
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
