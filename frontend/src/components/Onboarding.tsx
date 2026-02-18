"use client";

import { useState } from "react";
import { User, Play } from "lucide-react";

interface OnboardingUser {
    name: string;
    photoURL?: string;
}

interface OnboardingProps {
    onStart: (topic: string, channel?: string) => void;
    isLoading: boolean;
    onLogin?: () => void;
    onLogout?: () => void;
    user?: OnboardingUser | null;
}

export default function Onboarding({ onStart, isLoading, onLogin, onLogout, user }: OnboardingProps) {
    const [searchMode, setSearchMode] = useState<"topic" | "channel">("topic");
    const [query, setQuery] = useState("");

    const handleSubmit = () => {
        if (!query.trim()) return;
        if (searchMode === "channel") {
            onStart(query, query);
        } else {
            onStart(query);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleTrendingClick = (tag: string) => {
        onStart(tag.replace('#', ''));
    };

    return (
        <>
            {/* Main Hero Section */}
            <main className="flex-grow flex flex-col items-center justify-center px-6 pt-12 pb-32 text-center z-10 relative w-full">
                <div className="max-w-[840px] w-full relative z-20">
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight py-2 drop-shadow-2xl">
                        STREAM <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-500 italic pb-2 px-4">YOUR WAY</span>
                    </h2>
                    <p className="text-lg md:text-xl text-white/60 font-medium mb-8 max-w-xl mx-auto leading-relaxed">
                        Search by topic or channel. <br className="hidden md:block" /> Simple, fast, and precise streaming for the next generation.
                    </p>

                    {/* 3D Search Container */}
                    <div className="relative group w-full max-w-2xl mx-auto mb-6">
                        {/* Glow Effect behind search */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

                        <div className="relative glass-panel rounded-2xl p-2 md:p-3 overflow-hidden">
                            {/* Toggle Pill */}
                            <div className="flex justify-center mb-4 md:mb-0 md:absolute md:right-3 md:top-3 md:z-10">
                                <div className="bg-black/40 backdrop-blur-md rounded-full p-1 flex items-center border border-white/10">
                                    <button
                                        onClick={() => setSearchMode("topic")}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${searchMode === 'topic' ? 'bg-white/20 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
                                    >
                                        Topic
                                    </button>
                                    <button
                                        onClick={() => setSearchMode("channel")}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${searchMode === 'channel' ? 'bg-white/20 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
                                    >
                                        Channel
                                    </button>
                                </div>
                            </div>

                            <div className="relative flex items-center">
                                <div className="absolute left-4 text-white/40">
                                    <span className="material-symbols-outlined text-2xl">search</span>
                                </div>
                                <input
                                    className="w-full h-16 pl-14 pr-4 bg-transparent border-none text-xl placeholder:text-white/20 text-white outline-none focus:ring-0 font-medium"
                                    placeholder={searchMode === 'channel' ? "Enter channel name..." : "What do you want to watch?"}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Hero Play Button */}
                    <div className="flex justify-center mt-6">
                        <div className="relative flex items-center justify-center group scale-75 md:scale-100">
                            {/* Rotating Rainbow Glow Border */}
                            <div className="absolute w-[78px] h-[78px] rounded-full rainbow-glow animate-[spin_4s_linear_infinite]"></div>
                            {/* Glassmorphic Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="relative w-[68px] h-[68px] rounded-full backdrop-blur-3xl border border-white/20 bg-white/10 flex items-center justify-center shadow-2xl transition-transform duration-500 active:scale-95 group-hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* Outer Glass Ring Decoration */}
                                <div className="absolute inset-1 rounded-full border border-white/5 pointer-events-none"></div>
                                {/* Center Play Icon */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 ml-1 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:scale-110">
                                    <Play className="fill-white text-white w-5 h-5" />
                                </div>
                                {/* Subtle Inner Glow */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                            </button>
                            {/* Decorative Pulse Rings */}
                            <div className="absolute w-[90px] h-[90px] border border-primary/20 rounded-full animate-pulse pointer-events-none"></div>
                            <div className="absolute w-[114px] h-[114px] border border-primary/10 rounded-full opacity-50 animate-[pulse_3s_ease-in-out_infinite] pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -z-10 opacity-20 blur-3xl w-64 h-64 bg-primary rounded-full animate-blob"></div>
                    <div className="absolute bottom-0 left-0 -z-10 opacity-10 blur-3xl w-80 h-80 bg-purple-600 rounded-full animate-blob animation-delay-2000"></div>
                </div>
            </main>

            {/* Trending Footer Section - Floating style */}
            <div className="fixed bottom-8 left-0 right-0 z-20 pointer-events-none flex justify-center px-4">
                <div className="pointer-events-auto flex flex-col items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary/80 drop-shadow-lg">Trending Now</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {['#LiveGaming', '#TechKeynote', '#IndieNews', '#Web3'].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => handleTrendingClick(tag)}
                                className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-bold text-white/80 hover:bg-primary/20 hover:border-primary/50 hover:text-white transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
