"use client";

import { Play, Volume2, VolumeX } from "lucide-react";

interface VideoOverlayProps {
    poster?: string;
    isActive: boolean;
    isPlaying: boolean;
    isMuted: boolean;
    onToggleMute: (e: React.MouseEvent) => void;
}

export default function VideoOverlay({
    poster,
    isActive,
    isPlaying,
    isMuted,
    onToggleMute
}: VideoOverlayProps) {

    return (
        <div className="relative w-full h-full bg-transparent overflow-hidden group">

            {/* 1. Loading / Poster Fallback — always present, fades out when playing */}
            {poster && (
                <div className={`absolute inset-0 z-0 flex items-center justify-center bg-transparent pointer-events-none transition-opacity duration-500 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={poster} alt="" className="w-full h-full object-cover" />
                    {isActive && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-md p-4 rounded-full animate-pulse">
                                <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 2. Mute/Unmute Toggle Button */}
            {/* Positioned cleanly out of the way, similar to Reels/TikTok native volume controls */}
            {isActive && (
                <button
                    onClick={onToggleMute}
                    className="absolute top-[80px] right-4 z-30 p-3 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white shadow-lg active:scale-90 transition-transform flex items-center justify-center pointer-events-auto"
                >
                    {isMuted ? (
                        <VolumeX className="w-6 h-6" />
                    ) : (
                        <Volume2 className="w-6 h-6" />
                    )}
                </button>
            )}

            {/* Optional Unmute prompt if they haven't figured it out yet */}
            {isActive && isMuted && isPlaying && (
                <div className="absolute top-[88px] right-[70px] z-20 pointer-events-none animate-pulse">
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-lg flex items-center whitespace-nowrap">
                        Tap to unmute
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-black/60 ml-2"></div>
                    </span>
                </div>
            )}


        </div>
    );
}
