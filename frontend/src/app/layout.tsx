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
  title: "RealStream",
  description: "The next generation of short-form video.",
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
