"use client";

import { useState, useEffect } from "react";
import { Play } from "lucide-react";

interface VideoPlayerProps {
    videoId: string; // YouTube video ID
    poster?: string;
    isActive: boolean;
}

export default function VideoPlayer({ videoId, poster, isActive }: VideoPlayerProps) {
    const [showEmbed, setShowEmbed] = useState(false);

    useEffect(() => {
        if (isActive) {
            // Small delay so scroll snap settles before loading iframe
            const timer = setTimeout(() => setShowEmbed(true), 300);
            return () => clearTimeout(timer);
        } else {
            setShowEmbed(false);
        }
    }, [isActive]);

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&mute=0&controls=0&playsinline=1&rel=0&showinfo=0&modestbranding=1&playlist=${videoId}`;

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {showEmbed ? (
                <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ pointerEvents: "auto" }}
                />
            ) : (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer"
                    onClick={() => setShowEmbed(true)}
                >
                    {poster ? (
                        <img src={poster} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-surface" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
                            <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Gradient Overlay for bottom text readability */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>
    );
}
