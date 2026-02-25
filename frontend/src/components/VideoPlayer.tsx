"use client";

import { Volume2, VolumeX } from "lucide-react";

interface VideoOverlayProps {
    isActive: boolean;
    isPlaying: boolean;
    isMuted: boolean;
    onToggleMute: (e: React.MouseEvent) => void;
}

export default function VideoOverlay({
    isActive,
    isPlaying,
    isMuted,
    onToggleMute
}: VideoOverlayProps) {

    return (
        <div className="relative w-full h-full bg-transparent overflow-hidden group">

            {/* Mute/Unmute Toggle Button */}
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

            {/* Unmute prompt */}
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
