"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        YT: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onYouTubeIframeAPIReady: any;
    }
}

// Global script loading state
let apiLoadPromise: Promise<void> | null = null;
const loadYouTubeAPI = () => {
    if (apiLoadPromise) return apiLoadPromise;

    apiLoadPromise = new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            document.head.appendChild(tag);
        }

        window.onYouTubeIframeAPIReady = () => {
            resolve();
        };
    });

    return apiLoadPromise;
};

interface FeedPlayerProps {
    videoId: string | null;
    isMuted: boolean;
    isPlaying: boolean;
    onPlayingChange: (isPlaying: boolean) => void;
}

export default function FeedPlayer({ videoId, isMuted, isPlaying, onPlayingChange }: FeedPlayerProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const notPlayingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // 1. Initialize Player once
    useEffect(() => {
        let isMounted = true;

        const initPlayer = async () => {
            await loadYouTubeAPI();
            if (!isMounted || !containerRef.current || playerRef.current) return;

            containerRef.current.innerHTML = "";
            const playerDiv = document.createElement("div");
            playerDiv.style.width = "100%";
            playerDiv.style.height = "100%";
            containerRef.current.appendChild(playerDiv);

            playerRef.current = new window.YT.Player(playerDiv, {
                videoId: videoId || "", // initialize empty if no video yet
                playerVars: {
                    autoplay: 1, // Crucial: tell YouTube we want to autoplay
                    loop: 1,
                    playlist: videoId || "",
                    controls: 0,
                    playsinline: 1,
                    rel: 0,
                    showinfo: 0,
                    modestbranding: 1,
                    fs: 0,
                    disablekb: 1,
                    mute: 1 // Crucial: ALWAYS start muted to bypass iOS restrictions
                },
                events: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onReady: (event: any) => {
                        if (!isMounted) return;
                        setIsPlayerReady(true);

                        // Start playing immediately if we have a video
                        if (videoId) {
                            event.target.playVideo();
                        }
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onStateChange: (event: any) => {
                        if (!isMounted) return;
                        if (event.data === 1) { // Playing
                            // Clear any pending "not playing" timer
                            if (notPlayingTimerRef.current) {
                                clearTimeout(notPlayingTimerRef.current);
                                notPlayingTimerRef.current = null;
                            }
                            onPlayingChange(true);
                        } else if (event.data === 2 || event.data === -1 || event.data === 3) {
                            // Paused, Unstarted, or Buffering — debounce to avoid poster flash
                            if (!notPlayingTimerRef.current) {
                                notPlayingTimerRef.current = setTimeout(() => {
                                    onPlayingChange(false);
                                    notPlayingTimerRef.current = null;
                                }, 500);
                            }
                        } else if (event.data === 0) { // Ended
                            event.target.playVideo(); // Force loop
                        }
                    }
                }
            });
        };

        initPlayer();

        return () => {
            isMounted = false;
            if (notPlayingTimerRef.current) {
                clearTimeout(notPlayingTimerRef.current);
                notPlayingTimerRef.current = null;
            }
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch { /* ignore */ }
                playerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run on mount only!

    // 2. Handle Video URL Swaps
    useEffect(() => {
        if (!isPlayerReady || !playerRef.current || !videoId) return;

        // When the videoId changes, tell the SAME player instance to load the new video.
        // This is the core magic that bypasses the iOS generic autoplay block.
        try {
            playerRef.current.loadVideoById({
                videoId: videoId
            });
            // We ensure it stays looping the new video
            playerRef.current.setLoop(true);
        } catch { /* ignore */ }
    }, [videoId, isPlayerReady]);

    // 3. Handle Mute State securely
    useEffect(() => {
        if (!isPlayerReady || !playerRef.current) return;

        try {
            if (isMuted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
                // Sometimes unmuting forces a pause on some strict browsers, so enforce playing
                playerRef.current.playVideo();
            }
        } catch { /* ignore */ }
    }, [isMuted, isPlayerReady]);

    // 4. Handle Play/Pause State securely
    useEffect(() => {
        if (!isPlayerReady || !playerRef.current) return;

        try {
            const playerState = playerRef.current.getPlayerState();
            if (isPlaying && playerState !== 1) { // 1 is playing
                playerRef.current.playVideo();
            } else if (!isPlaying && playerState === 1) {
                playerRef.current.pauseVideo();
            }
        } catch { /* ignore */ }
    }, [isPlaying, isPlayerReady]);


    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full border-0 pointer-events-auto overflow-hidden z-0"
        >
            {/* The YouTube iframe gets injected here exactly once */}
        </div>
    );
}
