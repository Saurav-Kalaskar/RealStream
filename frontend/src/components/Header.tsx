import { ChevronLeft, User as UserIcon } from "lucide-react";

interface HeaderUser {
    displayName?: string;
    email?: string;
    photoURL?: string;
}

interface HeaderProps {
    user?: HeaderUser | null;
    onLogin?: () => void;
    onLogout?: () => void;
    onNewSearch?: () => void;
    onProfileClick?: () => void;
    topic?: string | null;
    channel?: string | null;
}

export default function Header({ user, onLogin, onLogout, onNewSearch, onProfileClick, topic, channel }: HeaderProps) {
    const displayTopic = channel ? `@${channel}` : (topic || "Browse");

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
            <div className="flex items-center max-w-[1400px] mx-auto w-full relative">
                {/* Back / Home Action */}
                {(channel || (topic && topic !== "Browse")) && (
                    <button
                        onClick={onNewSearch}
                        className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary/30 transition-all active:scale-95 shadow-lg shadow-black/20 pointer-events-auto"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Topic Pill - Only show if we have a specific topic/channel */}
                {(displayTopic && displayTopic !== "Browse") && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                        <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg shadow-black/20 select-none">
                            <span className="text-sm font-semibold text-white/90 tracking-wide capitalize">
                                {displayTopic}
                            </span>
                        </div>
                    </div>
                )}

                {/* Profile Action */}
                <div className="flex items-center gap-4 ml-auto">
                    {user ? (
                        <button
                            onClick={onProfileClick}
                            className="relative group pointer-events-auto"
                        >
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-surface dark:bg-neutral-800 flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-white/70" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={onLogin}
                            className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-primary/30 transition-all active:scale-95 shadow-lg shadow-black/20 pointer-events-auto"
                        >
                            <UserIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
