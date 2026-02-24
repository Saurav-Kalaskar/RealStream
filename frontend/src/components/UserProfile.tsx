import { X, Settings, Share2, Play, LogOut } from "lucide-react";

interface UserProfileProps {
    user: any;
    onClose: () => void;
    onLogout: () => void;
}

const FEATURE_FLAG_FULL_PROFILE = false;

export default function UserProfile({ user, onClose, onLogout }: UserProfileProps) {
    if (!user) return null;

    // Simplified View (Feature Flagged)
    if (!FEATURE_FLAG_FULL_PROFILE) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative w-full max-w-sm bg-background-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col glass-panel animate-in fade-in zoom-in duration-200">
                    <header className="flex justify-between items-center p-6 border-b border-white/10">
                        <h2 className="text-lg font-bold">Account</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </header>
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-800">
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{user.displayName}</h3>
                                <p className="text-white/50 text-sm">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-background-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] glass-panel nebula-glow animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <header className="sticky top-0 z-10 glass-panel border-b border-white/10 px-6 pt-6 pb-6">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col items-start gap-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-2 border-primary shadow-[0_0_10px_rgba(37,123,244,0.4)] overflow-hidden bg-slate-800">
                                    <img
                                        className="w-full h-full object-cover"
                                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=0D8ABC&color=fff`}
                                        alt={user.displayName}
                                    />
                                </div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-background-dark"></div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight text-white">{user.displayName}</h1>
                                <p className="text-primary text-sm font-semibold">@{user.email?.split('@')[0] || 'user'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onLogout}
                                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-red-400"
                                title="Logout"
                            >
                                <Share2 className="w-5 h-5 rotate-90" /> {/* Simulating Logout Icon for now or import LogOut */}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Profile Actions */}
                    <div className="mt-6 flex gap-3">
                        <button className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20">
                            Edit Profile
                        </button>
                        <button className="w-12 flex items-center justify-center glass-panel rounded-xl hover:bg-white/10 transition-colors text-white">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-4 py-6 overflow-y-auto no-scrollbar">
                    {/* Bio Section */}
                    <div className="mb-6 px-2">
                        <p className="text-white/60 text-sm leading-relaxed">
                            Digital nomad exploring the deep space of VR streaming. Creating immersive experiences for the next generation. 🚀
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <div className="glass-panel p-4 rounded-xl text-center">
                            <span className="block text-xl font-extrabold text-white">12.8k</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Followers</span>
                        </div>
                        <div className="glass-panel p-4 rounded-xl text-center">
                            <span className="block text-xl font-extrabold text-white">245</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Following</span>
                        </div>
                        <div className="glass-panel p-4 rounded-xl text-center">
                            <span className="block text-xl font-extrabold text-white">1.2M</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Views</span>
                        </div>
                    </div>

                    {/* Content Tabs */}
                    <div className="flex gap-8 mb-6 border-b border-white/5 px-2">
                        <button className="pb-4 border-b-2 border-primary text-sm font-bold text-white">Videos</button>
                        <button className="pb-4 border-b-2 border-transparent text-sm font-bold text-white/50 hover:text-white/80">Live</button>
                        <button className="pb-4 border-b-2 border-transparent text-sm font-bold text-white/50 hover:text-white/80">Collections</button>
                    </div>

                    {/* Video Grid (Placeholder) */}
                    <div className="grid grid-cols-2 gap-4 pb-20">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="group relative glass-panel p-1.5 rounded-[1.5rem] overflow-hidden cursor-pointer hover:border-primary/30 transition-colors">
                                <div className="aspect-[9/12] rounded-xl overflow-hidden relative bg-black/50">
                                    {/* Placeholder Image */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                                        <Play className="w-3 h-3 text-white fill-white" />
                                        <span className="text-xs font-bold text-white">{((i * 3.7) % 20 + 5).toFixed(1)}k</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
